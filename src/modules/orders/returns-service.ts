import { db } from "@/database/client";
import {
  orders,
  orderItems,
  orderStatusHistory,
  returns,
  returnItems,
  refunds,
  inventory,
  inventoryMovements,
} from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "@/core/errors";
import { generateReturnNumber } from "./numbering";
import { formatPaiseToRupees } from "@/modules/cart/service";
import type { RequestReturnInput, ReviewReturnInput, ReceiveReturnInput } from "./validation";
import type { ReturnDTO, ReturnItemDTO, ReturnStatus } from "./types";

const RETURN_WINDOW_DAYS = 14;

/**
 * Checks return eligibility for an order and returns items with available return quantities.
 */
export async function checkReturnEligibility(
  storeId: string,
  orderId: string,
  customerId?: string | null
): Promise<{
  isEligible: boolean;
  reason?: string;
  eligibleItems: Array<{
    orderItemId: string;
    title: string;
    variantTitle: string;
    maxReturnQuantity: number;
    unitPricePaise: number;
    unitPriceFormatted: string;
  }>;
}> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new NotFoundError("Order not found.");
  }

  if (customerId && order.customerId !== customerId) {
    throw new ForbiddenError("You do not own this order.");
  }

  if (order.status !== "DELIVERED") {
    return {
      isEligible: false,
      reason: `Order is in '${order.status}' status. Returns are only allowed for delivered orders.`,
      eligibleItems: [],
    };
  }

  // Check 14-day window from updatedAt (when marked DELIVERED)
  const deliveryTime = new Date(order.updatedAt).getTime();
  const daysSinceDelivery = (Date.now() - deliveryTime) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
    return {
      isEligible: false,
      reason: `Return window of ${RETURN_WINDOW_DAYS} days has expired.`,
      eligibleItems: [],
    };
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const eligibleItems = items
    .map((item) => {
      const maxReturn = item.fulfilledQuantity - item.returnedQuantity;
      return {
        orderItemId: item.id,
        title: item.title,
        variantTitle: item.variantTitle,
        maxReturnQuantity: Math.max(0, maxReturn),
        unitPricePaise: item.unitPrice,
        unitPriceFormatted: formatPaiseToRupees(item.unitPrice),
      };
    })
    .filter((item) => item.maxReturnQuantity > 0);

  return {
    isEligible: eligibleItems.length > 0,
    reason: eligibleItems.length === 0 ? "All delivered items have already been returned." : undefined,
    eligibleItems,
  };
}

/**
 * Customer submits a return request.
 */
export async function requestReturn(
  storeId: string,
  input: RequestReturnInput,
  customerId?: string | null
): Promise<ReturnDTO> {
  const eligibility = await checkReturnEligibility(storeId, input.orderId, customerId);
  if (!eligibility.isEligible) {
    throw new ConflictError(eligibility.reason || "Order is not eligible for return.");
  }

  const itemsMap = new Map(
    eligibility.eligibleItems.map((i) => [i.orderItemId, i])
  );

  // Validate quantities
  for (const reqItem of input.items) {
    const eligible = itemsMap.get(reqItem.orderItemId);
    if (!eligible) {
      throw new ValidationError(`Item ${reqItem.orderItemId} is not eligible for return.`);
    }
    if (reqItem.quantity > eligible.maxReturnQuantity) {
      throw new ConflictError(
        `Cannot return ${reqItem.quantity} units of '${eligible.title}'. Maximum returnable quantity is ${eligible.maxReturnQuantity}.`
      );
    }
  }

  const returnNumber = await generateReturnNumber(storeId);

  const createdReturn = await db.transaction(async (tx) => {
    // 1. Insert return record
    const [newReturn] = await tx
      .insert(returns)
      .values({
        orderId: input.orderId,
        storeId,
        customerId: customerId || null,
        returnNumber,
        status: "REQUESTED",
        reason: input.reason,
        notes: input.notes || null,
        restockAction: "NO_RESTOCK",
      })
      .returning();

    // 2. Insert return_items records
    for (const reqItem of input.items) {
      const [orderItem] = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, reqItem.orderItemId))
        .limit(1);

      await tx.insert(returnItems).values({
        returnId: newReturn.id,
        orderItemId: reqItem.orderItemId,
        variantId: orderItem.variantId,
        quantity: reqItem.quantity,
        reason: reqItem.reason || input.reason,
      });
    }

    // 3. Append order status history note
    await tx.insert(orderStatusHistory).values({
      orderId: input.orderId,
      storeId,
      fromStatus: "DELIVERED",
      toStatus: "DELIVERED",
      note: `Return request submitted (#${returnNumber}) for reason: ${input.reason}`,
      actorType: "CUSTOMER",
      metadata: { returnNumber, returnId: newReturn.id },
    });

    return newReturn;
  });

  return await getReturnById(storeId, createdReturn.id);
}

/**
 * Merchant reviews return request (Approve / Reject).
 */
export async function reviewReturn(
  storeId: string,
  returnId: string,
  input: ReviewReturnInput,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<ReturnDTO> {
  const [ret] = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.storeId, storeId)))
    .limit(1);

  if (!ret) throw new NotFoundError("Return request not found.");

  if (ret.status !== "REQUESTED") {
    throw new ConflictError(`Return in '${ret.status}' status cannot be reviewed.`);
  }

  const newStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";

  await db
    .update(returns)
    .set({
      status: newStatus,
      merchantNotes: input.merchantNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, returnId));

  return await getReturnById(storeId, returnId);
}

/**
 * Merchant confirms physical receipt of returned items, handles optional restock into inventory ledger,
 * and initiates refund record.
 */
export async function receiveReturn(
  storeId: string,
  returnId: string,
  input: ReceiveReturnInput,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<ReturnDTO> {
  const [ret] = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.storeId, storeId)))
    .limit(1);

  if (!ret) throw new NotFoundError("Return request not found.");

  if (ret.status !== "APPROVED") {
    throw new ConflictError(`Only APPROVED returns can be received. Current status: '${ret.status}'`);
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, ret.orderId))
    .limit(1);

  const rItems = await db
    .select()
    .from(returnItems)
    .where(eq(returnItems.returnId, returnId));

  await db.transaction(async (tx) => {
    let totalRefundPaise = 0;

    for (const rItem of rItems) {
      const [orderItem] = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, rItem.orderItemId))
        .limit(1);

      if (orderItem) {
        // Increment returned quantity on order item
        await tx
          .update(orderItems)
          .set({ returnedQuantity: orderItem.returnedQuantity + rItem.quantity })
          .where(eq(orderItems.id, orderItem.id));

        totalRefundPaise += orderItem.unitPrice * rItem.quantity;

        // If restock requested, increment physical on_hand and record in audit ledger
        if (input.restockAction === "RESTOCK") {
          const [inv] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.variantId, rItem.variantId),
                eq(inventory.storeId, storeId)
              )
            )
            .for("update");

          if (inv) {
            const newOnHand = inv.onHand + rItem.quantity;
            const newAvailable = newOnHand - inv.reserved;

            await tx
              .update(inventory)
              .set({
                onHand: newOnHand,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, inv.id));

            await tx.insert(inventoryMovements).values({
              storeId,
              productId: orderItem.productId,
              variantId: rItem.variantId,
              quantityDelta: rItem.quantity,
              quantityBefore: inv.onHand,
              quantityAfter: newOnHand,
              reason: "RETURN_RESTOCK",
              referenceId: ret.returnNumber,
              referenceType: "CUSTOMER_RETURN",
            });
          }
        }
      }
    }

    // Insert refund row
    await tx.insert(refunds).values({
      orderId: order.id,
      storeId,
      returnId: ret.id,
      amount: totalRefundPaise,
      currency: "INR",
      reason: `Return refund for #${ret.returnNumber}`,
      status: "PENDING",
      gateway: order.paymentMethod,
    });

    // Update return status to REFUNDED / RECEIVED
    await tx
      .update(returns)
      .set({
        status: "REFUNDED",
        restockAction: input.restockAction,
        merchantNotes: input.merchantNotes || ret.merchantNotes,
        updatedAt: new Date(),
      })
      .where(eq(returns.id, returnId));
  });

  return await getReturnById(storeId, returnId);
}

/**
 * Helper to fetch a single return with items.
 */
export async function getReturnById(storeId: string, returnId: string): Promise<ReturnDTO> {
  const [ret] = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.storeId, storeId)))
    .limit(1);

  if (!ret) throw new NotFoundError("Return not found.");

  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, ret.orderId))
    .limit(1);

  const rawItems = await db
    .select({
      id: returnItems.id,
      orderItemId: returnItems.orderItemId,
      variantId: returnItems.variantId,
      quantity: returnItems.quantity,
      reason: returnItems.reason,
      title: orderItems.title,
      variantTitle: orderItems.variantTitle,
    })
    .from(returnItems)
    .innerJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
    .where(eq(returnItems.returnId, returnId));

  const itemsDTO: ReturnItemDTO[] = rawItems.map((i) => ({
    id: i.id,
    orderItemId: i.orderItemId,
    variantId: i.variantId,
    title: i.title,
    variantTitle: i.variantTitle,
    quantity: i.quantity,
    reason: i.reason,
  }));

  return {
    id: ret.id,
    orderId: ret.orderId,
    orderNumber: order?.orderNumber || "ORD",
    returnNumber: ret.returnNumber,
    customerId: ret.customerId,
    status: ret.status as ReturnStatus,
    reason: ret.reason,
    notes: ret.notes,
    merchantNotes: ret.merchantNotes,
    restockAction: ret.restockAction as "RESTOCK" | "NO_RESTOCK",
    items: itemsDTO,
    createdAt: ret.createdAt,
  };
}

/**
 * List all returns for a store in merchant dashboard.
 */
export async function listStoreReturns(storeId: string): Promise<ReturnDTO[]> {
  const rawReturns = await db
    .select()
    .from(returns)
    .where(eq(returns.storeId, storeId))
    .orderBy(sql`${returns.createdAt} DESC`);

  const results: ReturnDTO[] = [];
  for (const r of rawReturns) {
    const dto = await getReturnById(storeId, r.id);
    results.push(dto);
  }
  return results;
}

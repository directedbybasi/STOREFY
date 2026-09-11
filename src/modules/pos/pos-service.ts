import { db } from "@/database/client";
import {
  posSessions,
  posTransactions,
  orders,
  orderItems,
  products,
  productVariants,
  inventory,
  inventoryMovements,
  type PosSession,
} from "@/database/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type {
  OpenPosSessionInput,
  ClosePosSessionInput,
  CreatePosSaleInput,
  PosReceiptSnapshot,
} from "./types";

/**
 * Opens a new POS Cash Session for a store location.
 */
export async function openPosSession(
  input: OpenPosSessionInput,
  staffUserId: string
): Promise<PosSession> {
  const sessionNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

  const [session] = await db
    .insert(posSessions)
    .values({
      storeId: input.storeId,
      locationId: input.locationId,
      staffUserId,
      sessionNumber,
      openingCashPaise: input.openingCashPaise,
      expectedCashPaise: input.openingCashPaise,
      status: "OPEN",
      notes: input.notes,
    })
    .returning();

  await recordAuditLog({
    storeId: input.storeId,
    actorType: "STAFF",
    actorId: staffUserId,
    action: "pos:open_session",
    entity: "pos_session",
    entityId: session.id,
    after: { sessionNumber, openingCashPaise: input.openingCashPaise },
  });

  return session;
}

/**
 * Closes an active POS Cash Session and records cash count variance.
 */
export async function closePosSession(
  input: ClosePosSessionInput,
  staffUserId: string
): Promise<PosSession> {
  const [session] = await db
    .select()
    .from(posSessions)
    .where(
      and(
        eq(posSessions.storeId, input.storeId),
        eq(posSessions.id, input.sessionId)
      )
    )
    .limit(1);

  if (!session) {
    throw new NotFoundError("POS Session not found");
  }

  if (session.status === "CLOSED") {
    throw new BadRequestError("POS Session is already closed");
  }

  const variance = input.countedCashPaise - session.expectedCashPaise;

  const [updated] = await db
    .update(posSessions)
    .set({
      status: "CLOSED",
      closingCashPaise: input.countedCashPaise,
      countedCashPaise: input.countedCashPaise,
      cashVariancePaise: variance,
      closedAt: new Date(),
      notes: input.notes || session.notes,
      updatedAt: new Date(),
    })
    .where(eq(posSessions.id, session.id))
    .returning();

  await recordAuditLog({
    storeId: input.storeId,
    actorType: "STAFF",
    actorId: staffUserId,
    action: "pos:close_session",
    entity: "pos_session",
    entityId: session.id,
    before: { expectedCashPaise: session.expectedCashPaise },
    after: {
      countedCashPaise: input.countedCashPaise,
      cashVariancePaise: variance,
    },
  });

  return updated;
}

/**
 * Creates an in-store POS sale:
 * - Recalculates prices server-side from catalog
 * - Verifies and decrements inventory
 * - Creates authoritative Order tagged with salesChannel = 'POS'
 * - Records PosTransaction
 * - Updates expected cash if payment method is CASH
 * - Returns immutable receipt snapshot
 */
export async function createPosSale(
  input: CreatePosSaleInput,
  staffUserId: string
): Promise<{ order: typeof orders.$inferSelect; receipt: PosReceiptSnapshot }> {
  // 1. Verify POS session is open
  const [session] = await db
    .select()
    .from(posSessions)
    .where(
      and(
        eq(posSessions.storeId, input.storeId),
        eq(posSessions.id, input.posSessionId)
      )
    )
    .limit(1);

  if (!session || session.status === "CLOSED") {
    throw new BadRequestError("Active POS Session required for sale");
  }

  return await db.transaction(async (tx) => {
    // 2. Fetch authoritative product variants and recalculate totals
    let subtotalAmount = 0;
    let totalDiscountAmount = 0;
    const computedItems: Array<{
      productId: string;
      variantId: string;
      title: string;
      variantTitle: string;
      sku: string | null;
      imageUrl: string | null;
      unitPricePaise: number;
      quantity: number;
      lineDiscountPaise: number;
      lineTotalPaise: number;
    }> = [];

    for (const item of input.items) {
      const [variant] = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          title: productVariants.title,
          sku: productVariants.sku,
          price: productVariants.price,
          productTitle: products.title,
          productStoreId: products.storeId,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(productVariants.id, item.variantId),
            eq(products.storeId, input.storeId)
          )
        )
        .limit(1);

      if (!variant) {
        throw new NotFoundError(
          `Variant ${item.variantId} not found in store catalog`
        );
      }

      const unitPricePaise = variant.price;
      const lineSubtotal = unitPricePaise * item.quantity;
      const lineDiscount = item.customDiscountPaise || 0;
      const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

      subtotalAmount += lineSubtotal;
      totalDiscountAmount += lineDiscount;

      computedItems.push({
        productId: variant.productId,
        variantId: variant.id,
        title: variant.productTitle,
        variantTitle: variant.title,
        sku: variant.sku,
        imageUrl: null,
        unitPricePaise,
        quantity: item.quantity,
        lineDiscountPaise: lineDiscount,
        lineTotalPaise: lineTotal,
      });

      // 3. Atomically consume inventory for POS sale
      const [stockRecord] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.storeId, input.storeId),
            eq(inventory.variantId, variant.id)
          )
        )
        .for("update")
        .limit(1);

      if (stockRecord) {
        await tx
          .update(inventory)
          .set({
            onHand: sql`${inventory.onHand} - ${item.quantity}`,
            available: sql`${inventory.available} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, stockRecord.id));

        await tx.insert(inventoryMovements).values({
          storeId: input.storeId,
          productId: variant.productId,
          variantId: variant.id,
          quantityDelta: -item.quantity,
          quantityBefore: stockRecord.onHand,
          quantityAfter: stockRecord.onHand - item.quantity,
          reason: "POS_SALE",
          referenceId: session.id,
          referenceType: "POS_SESSION",
        });
      }
    }

    const taxAmount = Math.round((subtotalAmount - totalDiscountAmount) * 0.05); // Standard indicative in-store tax
    const totalAmount = subtotalAmount - totalDiscountAmount + taxAmount;

    if (input.tenderAmountPaise < totalAmount && input.paymentMethod === "CASH") {
      throw new BadRequestError(
        `Tender amount (${input.tenderAmountPaise}) is less than total amount (${totalAmount})`
      );
    }

    const changePaise =
      input.paymentMethod === "CASH"
        ? Math.max(0, input.tenderAmountPaise - totalAmount)
        : 0;

    // 4. Create authoritative Order
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const [order] = await tx
      .insert(orders)
      .values({
        storeId: input.storeId,
        orderNumber,
        customerId: input.customerId,
        salesChannel: "POS",
        status: "CONFIRMED",
        paymentStatus: "CAPTURED",
        paymentMethod: input.paymentMethod,
        fulfillmentStatus: "FULFILLED",
        currency: "INR",
        subtotalAmount,
        discountAmount: totalDiscountAmount,
        taxAmount,
        shippingAmount: 0,
        totalAmount,
        shippingAddress: {
          name: "POS Walk-in Customer",
          phone: "0000000000",
          addressLine1: "In-Store Counter",
          city: "Counter",
          state: "State",
          postalCode: "000000",
          country: "IN",
        },
        billingAddress: {
          name: "POS Walk-in Customer",
          phone: "0000000000",
          addressLine1: "In-Store Counter",
          city: "Counter",
          state: "State",
          postalCode: "000000",
          country: "IN",
        },
        customerSnapshot: {
          fullName: "In-Store Customer",
          email: "pos@storefy.local",
          phone: "0000000000",
        },
        notes: input.notes,
      })
      .returning();

    // 5. Insert order items
    for (const item of computedItems) {
      await tx.insert(orderItems).values({
        storeId: input.storeId,
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        sku: item.sku,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        fulfilledQuantity: item.quantity,
        unitPrice: item.unitPricePaise,
        subtotal: item.unitPricePaise * item.quantity,
        tax: 0,
        total: item.lineTotalPaise,
      });
    }

    // 6. Record POS Transaction
    await tx.insert(posTransactions).values({
      storeId: input.storeId,
      posSessionId: session.id,
      orderId: order.id,
      paymentMethod: input.paymentMethod,
      amountPaise: totalAmount,
      tenderAmountPaise: input.tenderAmountPaise,
      changePaise,
      status: "COMPLETED",
      metadata: { locationId: input.locationId, cashierUserId: staffUserId },
    });

    // 7. Update POS Session expected cash if cash tender
    if (input.paymentMethod === "CASH") {
      await tx
        .update(posSessions)
        .set({
          expectedCashPaise: sql`${posSessions.expectedCashPaise} + ${totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(posSessions.id, session.id));
    }

    // 8. Generate Receipt Snapshot
    const receipt: PosReceiptSnapshot = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: input.storeId,
      locationId: input.locationId,
      cashierUserId: staffUserId,
      paymentMethod: input.paymentMethod,
      subtotalAmount,
      discountAmount: totalDiscountAmount,
      taxAmount,
      totalAmount,
      tenderAmountPaise: input.tenderAmountPaise,
      changePaise,
      items: computedItems.map((i) => ({
        title: i.title,
        variantTitle: i.variantTitle,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPricePaise,
        total: i.lineTotalPaise,
      })),
      timestamp: new Date().toISOString(),
    };

    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: staffUserId,
      action: "pos:create_sale",
      entity: "order",
      entityId: order.id,
      after: { orderNumber, totalAmount, paymentMethod: input.paymentMethod },
    });

    return { order, receipt };
  });
}

/**
 * Lists POS sessions for a store.
 */
export async function listPosSessions(storeId: string) {
  return await db
    .select()
    .from(posSessions)
    .where(eq(posSessions.storeId, storeId))
    .orderBy(desc(posSessions.openedAt));
}

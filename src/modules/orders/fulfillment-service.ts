import { db } from "@/database/client";
import {
  orders,
  orderItems,
  orderStatusHistory,
  fulfillments,
  fulfillmentItems,
} from "@/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";
import { getOrderById } from "./order-service";
import type { CreateFulfillmentInput, UpdateFulfillmentStatusInput } from "./validation";
import type { OrderDetailDTO, FulfillmentDTO } from "./types";

/**
 * Creates fulfillment (partial or complete) with carrier, tracking, and line item fulfillment accounting.
 */
export async function createFulfillment(
  storeId: string,
  orderId: string,
  input: CreateFulfillmentInput,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<OrderDetailDTO> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) throw new NotFoundError("Order not found.");

  if (order.status === "CANCELLED" || order.status === "DELIVERED" || order.status === "RTO") {
    throw new ConflictError(`Cannot fulfill order in '${order.status}' status.`);
  }

  const existingItems = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const itemsMap = new Map(existingItems.map((i) => [i.id, i]));

  // Validate quantities to fulfill
  for (const reqItem of input.items) {
    const item = itemsMap.get(reqItem.orderItemId);
    if (!item) {
      throw new ValidationError(`Order item ${reqItem.orderItemId} does not belong to this order.`);
    }

    const availableToFulfill = item.quantity - item.fulfilledQuantity;
    if (reqItem.quantity > availableToFulfill) {
      throw new ConflictError(
        `Cannot fulfill ${reqItem.quantity} units of '${item.title}'. Only ${availableToFulfill} units remaining to fulfill.`
      );
    }
  }

  await db.transaction(async (tx) => {
    // 1. Create fulfillment row
    const [fulfillment] = await tx
      .insert(fulfillments)
      .values({
        orderId,
        storeId,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber || null,
        trackingUrl: input.trackingUrl || null,
        status: "IN_TRANSIT",
        shippedAt: new Date(),
        notes: input.notes || null,
      })
      .returning();

    // 2. Update order_items fulfilled quantities and insert fulfillment_items
    for (const reqItem of input.items) {
      const item = itemsMap.get(reqItem.orderItemId)!;
      const newFulfilledQty = item.fulfilledQuantity + reqItem.quantity;

      await tx
        .update(orderItems)
        .set({ fulfilledQuantity: newFulfilledQty })
        .where(eq(orderItems.id, item.id));

      await tx.insert(fulfillmentItems).values({
        fulfillmentId: fulfillment.id,
        orderItemId: item.id,
        quantity: reqItem.quantity,
      });

      // Update in-memory map to evaluate order fulfillment status
      item.fulfilledQuantity = newFulfilledQty;
    }

    // 3. Compute overall order fulfillment status
    const allItemsFulfilled = Array.from(itemsMap.values()).every(
      (i) => i.fulfilledQuantity >= i.quantity
    );
    const newFulfillmentStatus = allItemsFulfilled ? "FULFILLED" : "PARTIALLY_FULFILLED";

    // 4. Update order status to SHIPPED
    await tx
      .update(orders)
      .set({
        fulfillmentStatus: newFulfillmentStatus,
        status: "SHIPPED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 5. Append audit status history
    await tx.insert(orderStatusHistory).values({
      orderId,
      storeId,
      fromStatus: order.status,
      toStatus: "SHIPPED",
      note: `Shipment created via ${input.carrier}. Tracking: ${input.trackingNumber || "N/A"}`,
      changedBy: actor?.userId || null,
      actorType: actor?.actorType || "MERCHANT",
      metadata: { fulfillmentId: fulfillment.id },
    });
  });

  return await getOrderById(storeId, orderId);
}

/**
 * Updates status of an existing fulfillment (e.g. IN_TRANSIT -> DELIVERED or RTO).
 */
export async function updateFulfillmentStatus(
  storeId: string,
  fulfillmentId: string,
  input: UpdateFulfillmentStatusInput,
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<OrderDetailDTO> {
  const [fulfillment] = await db
    .select()
    .from(fulfillments)
    .where(and(eq(fulfillments.id, fulfillmentId), eq(fulfillments.storeId, storeId)))
    .limit(1);

  if (!fulfillment) throw new NotFoundError("Fulfillment record not found.");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, fulfillment.orderId))
    .limit(1);

  if (!order) throw new NotFoundError("Associated order not found.");

  const isDelivered = input.status === "DELIVERED";
  const isRTO = input.status === "RTO_INITIATED" || input.status === "RTO_DELIVERED";

  await db.transaction(async (tx) => {
    // 1. Update fulfillment row
    await tx
      .update(fulfillments)
      .set({
        status: input.status,
        deliveredAt: isDelivered ? new Date() : fulfillment.deliveredAt,
        rtoReason: isRTO ? input.rtoReason || "Delivery failed: returned to merchant." : null,
        updatedAt: new Date(),
      })
      .where(eq(fulfillments.id, fulfillmentId));

    // 2. Synchronize order status
    let nextOrderStatus = order.status;
    if (isDelivered) {
      nextOrderStatus = "DELIVERED";
    } else if (isRTO) {
      nextOrderStatus = "RTO";
    }

    if (nextOrderStatus !== order.status) {
      await tx
        .update(orders)
        .set({
          status: nextOrderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        storeId,
        fromStatus: order.status,
        toStatus: nextOrderStatus,
        note: `Fulfillment status updated to ${input.status}. ${input.rtoReason || ""}`,
        changedBy: actor?.userId || null,
        actorType: actor?.actorType || "MERCHANT",
        metadata: { fulfillmentId },
      });
    }
  });

  return await getOrderById(storeId, order.id);
}

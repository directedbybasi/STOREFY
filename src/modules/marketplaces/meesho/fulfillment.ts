import { db } from "@/database/client";
import { marketplaceOrderTasks } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/core/errors";

export interface RecordSourceOrderInput {
  taskId: string;
  storeId: string;
  sourceOrderId: string;
  sourceOrderReference?: string;
  notes?: string;
}

export interface RecordSourceTrackingInput {
  taskId: string;
  storeId: string;
  trackingNumber: string;
  carrier: string;
}

/**
 * Marks a marketplace fulfillment task as ORDERED on Meesho.
 */
export async function recordMeeshoOrderPlaced(
  input: RecordSourceOrderInput
) {
  if (!input.sourceOrderId || input.sourceOrderId.trim().length === 0) {
    throw new ValidationError("Source order ID is required.");
  }

  const [task] = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(
      and(
        eq(marketplaceOrderTasks.id, input.taskId),
        eq(marketplaceOrderTasks.storeId, input.storeId)
      )
    )
    .limit(1);

  if (!task) throw new NotFoundError("Marketplace Order Task");

  const [updated] = await db
    .update(marketplaceOrderTasks)
    .set({
      status: "ORDERED",
      sourceOrderId: input.sourceOrderId.trim(),
      sourceOrderReference: input.sourceOrderReference?.trim() || null,
      notes: input.notes || task.notes,
      orderedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrderTasks.id, input.taskId))
    .returning();

  return updated;
}

/**
 * Attaches source shipment tracking to a Meesho order task and syncs STOREFY fulfillment.
 */
export async function recordMeeshoTracking(
  input: RecordSourceTrackingInput
) {
  if (!input.trackingNumber || input.trackingNumber.trim().length === 0) {
    throw new ValidationError("Tracking number is required.");
  }
  if (!input.carrier || input.carrier.trim().length === 0) {
    throw new ValidationError("Carrier is required.");
  }

  const [task] = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(
      and(
        eq(marketplaceOrderTasks.id, input.taskId),
        eq(marketplaceOrderTasks.storeId, input.storeId)
      )
    )
    .limit(1);

  if (!task) throw new NotFoundError("Marketplace Order Task");

  const [updated] = await db
    .update(marketplaceOrderTasks)
    .set({
      status: "SHIPPED",
      trackingNumber: input.trackingNumber.trim(),
      carrier: input.carrier.trim(),
      shippedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrderTasks.id, input.taskId))
    .returning();

  return updated;
}

/**
 * Marks task as DELIVERED once carrier confirms delivery.
 */
export async function recordMeeshoDelivered(taskId: string, storeId: string) {
  const [task] = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(
      and(
        eq(marketplaceOrderTasks.id, taskId),
        eq(marketplaceOrderTasks.storeId, storeId)
      )
    )
    .limit(1);

  if (!task) throw new NotFoundError("Marketplace Order Task");

  const [updated] = await db
    .update(marketplaceOrderTasks)
    .set({
      status: "DELIVERED",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrderTasks.id, taskId))
    .returning();

  return updated;
}

/**
 * Marks task as RTO (Return to Origin) if delivery failed.
 */
export async function recordMeeshoRTO(taskId: string, storeId: string, notes?: string) {
  const [task] = await db
    .select()
    .from(marketplaceOrderTasks)
    .where(
      and(
        eq(marketplaceOrderTasks.id, taskId),
        eq(marketplaceOrderTasks.storeId, storeId)
      )
    )
    .limit(1);

  if (!task) throw new NotFoundError("Marketplace Order Task");

  const [updated] = await db
    .update(marketplaceOrderTasks)
    .set({
      status: "RTO",
      notes: notes || "Delivery failed, shipment returned to Meesho source.",
      updatedAt: new Date(),
    })
    .where(eq(marketplaceOrderTasks.id, taskId))
    .returning();

  return updated;
}

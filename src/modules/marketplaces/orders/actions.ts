"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  listMarketplaceOrderTasks,
  getMarketplaceOrderTaskById,
} from "./marketplace-order-service";
import {
  recordMeeshoOrderPlaced,
  recordMeeshoTracking,
  recordMeeshoDelivered,
  recordMeeshoRTO,
} from "../meesho/fulfillment";

/**
 * Lists marketplace fulfillment tasks for the store.
 */
export async function listMarketplaceOrderTasksAction(status?: string) {
  const ctx = await requirePermission("marketplace:orders");
  return listMarketplaceOrderTasks(ctx.store.id, status);
}

/**
 * Gets a single marketplace fulfillment task by ID.
 */
export async function getMarketplaceOrderTaskByIdAction(taskId: string) {
  const ctx = await requirePermission("marketplace:orders");
  return getMarketplaceOrderTaskById(ctx.store.id, taskId);
}

/**
 * Records that the merchant has purchased the item on Meesho.
 */
export async function recordMeeshoOrderPlacedAction(
  taskId: string,
  sourceOrderId: string,
  sourceOrderReference?: string,
  notes?: string
) {
  const ctx = await requirePermission("marketplace:fulfill");
  return recordMeeshoOrderPlaced({
    taskId,
    storeId: ctx.store.id,
    sourceOrderId,
    sourceOrderReference,
    notes,
  });
}

/**
 * Attaches source shipment tracking to a Meesho order task.
 */
export async function recordMeeshoTrackingAction(
  taskId: string,
  trackingNumber: string,
  carrier: string
) {
  const ctx = await requirePermission("marketplace:fulfill");
  return recordMeeshoTracking({
    taskId,
    storeId: ctx.store.id,
    trackingNumber,
    carrier,
  });
}

/**
 * Marks task as DELIVERED.
 */
export async function recordMeeshoDeliveredAction(taskId: string) {
  const ctx = await requirePermission("marketplace:fulfill");
  return recordMeeshoDelivered(taskId, ctx.store.id);
}

/**
 * Marks task as RTO.
 */
export async function recordMeeshoRTOAction(taskId: string, notes?: string) {
  const ctx = await requirePermission("marketplace:fulfill");
  return recordMeeshoRTO(taskId, ctx.store.id, notes);
}

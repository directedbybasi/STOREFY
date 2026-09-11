"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  acceptSupplierOrder,
  rejectSupplierOrder,
  updateSupplierOrderStatus,
  listSupplierOrders,
  getSupplierOrderById,
  getSupplierOrdersForOrder,
} from "./supplier-fulfillment-service";
import { recordEarning } from "../payouts/settlement-service";

/**
 * Supplier: accept an order.
 */
export async function acceptSupplierOrderAction(
  supplierOrderId: string,
  supplierId: string
) {
  await requirePermission("supplier:fulfill");
  return acceptSupplierOrder(supplierOrderId, supplierId);
}

/**
 * Supplier: reject an order.
 */
export async function rejectSupplierOrderAction(
  supplierOrderId: string,
  supplierId: string,
  reason: string
) {
  await requirePermission("supplier:fulfill");
  return rejectSupplierOrder(supplierOrderId, supplierId, reason);
}

/**
 * Supplier: update order status (PROCESSING → PACKED → SHIPPED → DELIVERED).
 * On DELIVERED, automatically creates an earning in the settlement ledger.
 */
export async function updateSupplierOrderStatusAction(
  supplierOrderId: string,
  supplierId: string,
  newStatus: string
) {
  await requirePermission("supplier:fulfill");
  const result = await updateSupplierOrderStatus(supplierOrderId, supplierId, newStatus);

  // On delivery, create earning record
  if (newStatus === "DELIVERED" && result.supplierCostTotalPaise > 0) {
    await recordEarning(
      supplierId,
      supplierOrderId,
      result.orderId,
      result.supplierCostTotalPaise
    );
  }

  return result;
}

/**
 * Supplier: list their orders.
 */
export async function listSupplierOrdersAction(
  supplierId: string,
  status?: string
) {
  await requirePermission("supplier:orders");
  return listSupplierOrders(supplierId, status);
}

/**
 * Supplier: get a specific order.
 */
export async function getSupplierOrderAction(
  supplierOrderId: string,
  supplierId: string
) {
  await requirePermission("supplier:orders");
  return getSupplierOrderById(supplierOrderId, supplierId);
}

/**
 * Merchant: get supplier orders for a customer order.
 */
export async function getSupplierOrdersForOrderAction(
  orderId: string
) {
  const ctx = await requirePermission("dropshipping:orders");
  return getSupplierOrdersForOrder(orderId, ctx.store.id);
}

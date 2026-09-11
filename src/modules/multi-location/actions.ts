"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { locations, stockTransfers, purchaseOrders } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { createLocation, listLocations } from "./location-service";
import { createStockTransfer, shipStockTransfer, receiveStockTransfer } from "./stock-transfer-service";
import { createPurchaseOrder, receivePurchaseOrderStock } from "./purchase-order-service";
import type { CreateLocationInput } from "./location-service";
import type { CreateStockTransferInput } from "./stock-transfer-service";
import type { CreatePOInput } from "./purchase-order-service";

export async function listLocationsAction() {
  const ctx = await requirePermission("inventory:view");
  return listLocations(ctx.store.id);
}

export async function createLocationAction(input: Omit<CreateLocationInput, "storeId">) {
  const ctx = await requirePermission("inventory:manage");
  return createLocation({ ...input, storeId: ctx.store.id });
}

export async function createStockTransferAction(input: Omit<CreateStockTransferInput, "storeId" | "requestedBy">) {
  const ctx = await requirePermission("inventory:manage");
  return createStockTransfer({ ...input, storeId: ctx.store.id, requestedBy: ctx.user.id });
}

export async function shipStockTransferAction(transferId: string) {
  const ctx = await requirePermission("inventory:manage");
  return shipStockTransfer(ctx.store.id, transferId);
}

export async function receiveStockTransferAction(transferId: string) {
  const ctx = await requirePermission("inventory:manage");
  return receiveStockTransfer(ctx.store.id, transferId, ctx.user.id);
}

export async function createPurchaseOrderAction(input: Omit<CreatePOInput, "storeId" | "createdBy">) {
  const ctx = await requirePermission("inventory:manage");
  return createPurchaseOrder({ ...input, storeId: ctx.store.id, createdBy: ctx.user.id });
}

export async function receivePurchaseOrderStockAction(
  purchaseOrderId: string,
  receivedItems: { lineId: string; quantityToReceive: number }[]
) {
  const ctx = await requirePermission("inventory:manage");
  return receivePurchaseOrderStock(ctx.store.id, purchaseOrderId, receivedItems);
}

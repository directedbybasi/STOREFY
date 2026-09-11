"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  importSupplierProduct,
  getImportPreview,
  getStoreMappings,
  syncSupplierToReseller,
} from "./import-service";

/**
 * Merchant: preview a supplier product before importing.
 */
export async function getImportPreviewAction(supplierProductId: string) {
  const ctx = await requirePermission("dropshipping:write");
  return getImportPreview(ctx.store.id, supplierProductId);
}

/**
 * Merchant: import a supplier product into their store.
 * Idempotent — double-click safe via unique index.
 */
export async function importSupplierProductAction(
  supplierProductId: string,
  overrides?: {
    title?: string;
    description?: string;
    retailPricePaise?: number;
    compareAtPricePaise?: number;
    status?: string;
  }
) {
  const ctx = await requirePermission("dropshipping:write");
  return importSupplierProduct(ctx.store.id, supplierProductId, overrides);
}

/**
 * Merchant: list all imported supplier product mappings.
 */
export async function getStoreMappingsAction() {
  const ctx = await requirePermission("dropshipping:read");
  return getStoreMappings(ctx.store.id);
}

/**
 * Sync supplier data to reseller products.
 */
export async function syncSupplierProductAction(supplierProductId: string) {
  await requirePermission("dropshipping:write");
  return syncSupplierToReseller(supplierProductId);
}

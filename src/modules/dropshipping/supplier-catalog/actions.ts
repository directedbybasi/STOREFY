"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { getTenantContext } from "@/core/tenant/context";
import {
  createSupplierProduct,
  updateSupplierProduct,
  getSupplierProductById,
  listSupplierProducts,
  updateSupplierStock,
  browseMarketplace,
} from "./catalog-service";

/**
 * Supplier: create a new product in their catalog.
 */
export async function createSupplierProductAction(
  supplierId: string,
  input: Parameters<typeof createSupplierProduct>[1]
) {
  await requirePermission("supplier:products");
  return createSupplierProduct(supplierId, input);
}

/**
 * Supplier: update an existing product.
 */
export async function updateSupplierProductAction(
  supplierId: string,
  productId: string,
  input: Parameters<typeof updateSupplierProduct>[2]
) {
  await requirePermission("supplier:products");
  return updateSupplierProduct(supplierId, productId, input);
}

/**
 * Supplier: get a product by ID.
 */
export async function getSupplierProductAction(
  supplierId: string,
  productId: string
) {
  await requirePermission("supplier:products");
  return getSupplierProductById(supplierId, productId);
}

/**
 * Supplier: list all products in catalog.
 */
export async function listSupplierProductsAction(
  supplierId: string,
  status?: string
) {
  await requirePermission("supplier:products");
  return listSupplierProducts(supplierId, status);
}

/**
 * Supplier: update stock for a variant.
 */
export async function updateSupplierStockAction(
  supplierId: string,
  variantId: string,
  newOnHand: number
) {
  await requirePermission("supplier:inventory");
  return updateSupplierStock(supplierId, variantId, newOnHand);
}

/**
 * Merchant: browse the supplier marketplace.
 */
export async function browseMarketplaceAction(filters?: {
  search?: string;
  categoryName?: string;
  supplierId?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePermission("dropshipping:read");
  return browseMarketplace(filters);
}

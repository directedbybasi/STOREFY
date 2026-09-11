"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  previewMeeshoProduct,
  importMeeshoProduct,
  listImportedMeeshoProducts,
  refreshMeeshoProduct,
} from "./import-service";
import type { ImportOverrides } from "./types";

/**
 * Server action to preview a Meesho product from URL or ID.
 */
export async function previewMeeshoProductAction(urlOrCode: string) {
  await requirePermission("marketplace:read");
  return previewMeeshoProduct(urlOrCode);
}

/**
 * Server action to import a Meesho product into the merchant's store catalog.
 */
export async function importMeeshoProductAction(
  urlOrCode: string,
  overrides?: ImportOverrides
) {
  const ctx = await requirePermission("marketplace:import");
  return importMeeshoProduct(ctx.store.id, urlOrCode, overrides);
}

/**
 * Server action to list all imported Meesho products for the current store.
 */
export async function listImportedMeeshoProductsAction() {
  const ctx = await requirePermission("marketplace:read");
  return listImportedMeeshoProducts(ctx.store.id);
}

/**
 * Server action to refresh source data for an imported product.
 */
export async function refreshMeeshoProductAction(productId: string) {
  const ctx = await requirePermission("marketplace:write");
  return refreshMeeshoProduct(ctx.store.id, productId);
}

"use server";

import {
  getRelatedProducts,
  getFrequentlyBoughtTogether,
  getCrossSellsForProduct,
} from "./recommendation-service";

export async function getStorefrontRecommendationsAction(productId: string) {
  const { getTenantContext } = await import("@/core/tenant/context");
  const ctx = await getTenantContext();

  const [related, frequentlyBought] = await Promise.all([
    getRelatedProducts(ctx.store.id, productId, 4),
    getFrequentlyBoughtTogether(ctx.store.id, productId, 3),
  ]);

  return { related, frequentlyBought };
}

export async function getCrossSellsAction(
  productId: string,
  placement: "PDP" | "CART" | "CHECKOUT" = "PDP"
) {
  const { getTenantContext } = await import("@/core/tenant/context");
  const ctx = await getTenantContext();
  return getCrossSellsForProduct(ctx.store.id, productId, placement);
}

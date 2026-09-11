import { db } from "@/database/client";
import { products, productRecommendations, orderItems, productCrossSells } from "@/database/schema";
import { eq, and, ne, desc, sql, inArray } from "drizzle-orm";

export interface RecommendedProductSummary {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
}

/**
 * Deterministic recommendation engine.
 * Ensures:
 * 1. Current store only (Tenant Isolation).
 * 2. Active products only (No unpublished items).
 * 3. Never recommends the product itself.
 */
export async function getRelatedProducts(
  storeId: string,
  productId: string,
  limit = 4
): Promise<RecommendedProductSummary[]> {
  // 1. Fetch source product's category
  const [sourceProduct] = await db
    .select({ categoryId: products.categoryId })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
    .limit(1);

  if (!sourceProduct || !sourceProduct.categoryId) {
    // Fallback: general active products in store
    const fallback = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        basePrice: products.basePrice,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.status, "ACTIVE"),
          ne(products.id, productId)
        )
      )
      .limit(limit);

    return fallback.map((p) => ({ ...p, basePrice: Number(p.basePrice || 0) }));
  }

  // 2. Fetch products in same category
  const related = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      basePrice: products.basePrice,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.categoryId, sourceProduct.categoryId),
        eq(products.status, "ACTIVE"),
        ne(products.id, productId)
      )
    )
    .limit(limit);

  return related.map((p) => ({ ...p, basePrice: Number(p.basePrice || 0) }));
}

/**
 * Calculates frequently bought together products based on historical co-occurrence in orders.
 */
export async function getFrequentlyBoughtTogether(
  storeId: string,
  productId: string,
  limit = 3
): Promise<RecommendedProductSummary[]> {
  // 1. Check if explicit recommendation rule is saved
  const [rule] = await db
    .select()
    .from(productRecommendations)
    .where(
      and(
        eq(productRecommendations.storeId, storeId),
        eq(productRecommendations.type, "FREQUENTLY_BOUGHT_TOGETHER"),
        eq(productRecommendations.sourceProductId, productId)
      )
    )
    .limit(1);

  if (rule && rule.recommendedProductIds.length > 0) {
    const recs = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        basePrice: products.basePrice,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.status, "ACTIVE"),
          inArray(products.id, rule.recommendedProductIds)
        )
      )
      .limit(limit);

    return recs.map((p) => ({ ...p, basePrice: Number(p.basePrice || 0) }));
  }

  // Fallback to related category products
  return getRelatedProducts(storeId, productId, limit);
}

/**
 * Fetches merchant-configured cross-sells for PDP, Cart, or Checkout.
 */
export async function getCrossSellsForProduct(
  storeId: string,
  productId: string,
  placement: "PDP" | "CART" | "CHECKOUT" = "PDP"
): Promise<RecommendedProductSummary[]> {
  const [crossSell] = await db
    .select()
    .from(productCrossSells)
    .where(
      and(
        eq(productCrossSells.storeId, storeId),
        eq(productCrossSells.productId, productId),
        eq(productCrossSells.placement, placement)
      )
    )
    .limit(1);

  if (!crossSell || crossSell.crossSellProductIds.length === 0) return [];

  const items = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      basePrice: products.basePrice,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.status, "ACTIVE"),
        inArray(products.id, crossSell.crossSellProductIds)
      )
    );

  return items.map((p) => ({ ...p, basePrice: Number(p.basePrice || 0) }));
}

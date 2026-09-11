import { db } from "@/database/client";
import {
  products,
  searchMerchandisingRules,
} from "@/database/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  score: number;
  isPinned?: boolean;
}

/**
 * Executes a merchandised product search with pin, boost, and exclusion rules.
 * Strictly store-scoped to prevent any cross-tenant product leakage.
 */
export async function searchProductsWithMerchandising(
  storeId: string,
  query: string,
  limit = 20
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  // 1. Fetch Merchandising Rules for this query
  const [rule] = await db
    .select()
    .from(searchMerchandisingRules)
    .where(
      and(
        eq(searchMerchandisingRules.storeId, storeId),
        eq(searchMerchandisingRules.query, cleanQuery)
      )
    )
    .limit(1);

  const pinnedIds = rule?.pinProductIds || [];
  const boostedIds = rule?.boostProductIds || [];
  const excludedIds = rule?.excludeProductIds || [];

  // 2. Query products in this store
  const matchedProducts = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      basePrice: products.basePrice,
      status: products.status,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.status, "ACTIVE"),
        or(
          ilike(products.title, `%${cleanQuery}%`),
          ilike(products.brand, `%${cleanQuery}%`),
          ilike(products.productType, `%${cleanQuery}%`)
        )
      )
    )
    .limit(limit * 2);

  // Filter exclusions
  const filtered = matchedProducts.filter((p) => !excludedIds.includes(p.id));

  // Score and rank
  const scoredItems: SearchResultItem[] = filtered.map((p) => {
    let score = 10;
    const isPinned = pinnedIds.includes(p.id);
    const isBoosted = boostedIds.includes(p.id);

    if (isPinned) score += 1000;
    if (isBoosted) score += 100;
    if (p.title.toLowerCase().startsWith(cleanQuery)) score += 20;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      basePrice: Number(p.basePrice || 0),
      score,
      isPinned,
    };
  });

  // Sort descending by score
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.slice(0, limit);
}

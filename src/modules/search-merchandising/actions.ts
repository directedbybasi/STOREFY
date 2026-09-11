"use server";

import { db } from "@/database/client";
import { searchMerchandisingRules } from "@/database/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { searchProductsWithMerchandising } from "./search-service";

export async function searchStorefrontProductsAction(query: string, limit = 20) {
  const { getTenantContext } = await import("@/core/tenant/context");
  const ctx = await getTenantContext();
  return searchProductsWithMerchandising(ctx.store.id, query, limit);
}

export async function setMerchandisingRuleAction(
  query: string,
  rules: {
    boostProductIds?: string[];
    pinProductIds?: string[];
    excludeProductIds?: string[];
  }
) {
  const ctx = await requirePermission("catalog:manage");
  const cleanQuery = query.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(searchMerchandisingRules)
    .where(eq(searchMerchandisingRules.query, cleanQuery))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(searchMerchandisingRules)
      .set({
        boostProductIds: rules.boostProductIds || [],
        pinProductIds: rules.pinProductIds || [],
        excludeProductIds: rules.excludeProductIds || [],
        updatedAt: new Date(),
      })
      .where(eq(searchMerchandisingRules.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(searchMerchandisingRules)
    .values({
      storeId: ctx.store.id,
      query: cleanQuery,
      boostProductIds: rules.boostProductIds || [],
      pinProductIds: rules.pinProductIds || [],
      excludeProductIds: rules.excludeProductIds || [],
    })
    .returning();

  return created;
}

import { db } from "@/database/client";
import { markets, marketCountries, type Market } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateMarketInput } from "./types";

/**
 * Creates an international market configuration and associates country codes.
 */
export async function createMarket(
  input: CreateMarketInput,
  actorUserId?: string
): Promise<Market> {
  return await db.transaction(async (tx) => {
    const [market] = await tx
      .insert(markets)
      .values({
        storeId: input.storeId,
        name: input.name,
        code: input.code.toUpperCase(),
        defaultCurrency: input.defaultCurrency.toUpperCase(),
        defaultLanguage: input.defaultLanguage.toLowerCase(),
        isPrimary: input.isPrimary,
      })
      .returning();

    for (const code of input.countryCodes) {
      await tx.insert(marketCountries).values({
        storeId: input.storeId,
        marketId: market.id,
        countryCode: code.toUpperCase(),
        currency: input.defaultCurrency.toUpperCase(),
      });
    }

    if (actorUserId) {
      await recordAuditLog({
        storeId: input.storeId,
        actorType: "STAFF",
        actorId: actorUserId,
        action: "market:create",
        entity: "market",
        entityId: market.id,
        after: { name: market.name, code: market.code, countries: input.countryCodes },
      });
    }

    return market;
  });
}

/**
 * Resolves active market for a customer/storefront request based on country code.
 */
export async function resolveMarket(
  storeId: string,
  countryCode?: string
): Promise<Market | null> {
  if (countryCode) {
    const [countryRecord] = await db
      .select({ marketId: marketCountries.marketId })
      .from(marketCountries)
      .where(
        and(
          eq(marketCountries.storeId, storeId),
          eq(marketCountries.countryCode, countryCode.toUpperCase())
        )
      )
      .limit(1);

    if (countryRecord) {
      const [matchedMarket] = await db
        .select()
        .from(markets)
        .where(
          and(
            eq(markets.storeId, storeId),
            eq(markets.id, countryRecord.marketId),
            eq(markets.status, "ACTIVE")
          )
        )
        .limit(1);

      if (matchedMarket) return matchedMarket;
    }
  }

  // Fallback to primary or default active market
  const [fallback] = await db
    .select()
    .from(markets)
    .where(
      and(
        eq(markets.storeId, storeId),
        eq(markets.status, "ACTIVE")
      )
    )
    .orderBy(desc(markets.isPrimary))
    .limit(1);

  return fallback || null;
}

/**
 * Lists markets configured for a store.
 */
export async function listMarkets(storeId: string) {
  return await db
    .select()
    .from(markets)
    .where(eq(markets.storeId, storeId))
    .orderBy(desc(markets.isPrimary));
}

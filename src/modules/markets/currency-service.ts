import { db } from "@/database/client";
import { exchangeRates, type ExchangeRate } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";
import type { SetExchangeRateInput } from "./types";

/**
 * Deterministic precision scaling constant (6 decimals).
 */
export const SCALE_FACTOR = 1_000_000;

/**
 * Sets or updates an authoritative exchange rate for a currency pair.
 */
export async function setExchangeRate(
  input: SetExchangeRateInput,
  actorUserId?: string
): Promise<ExchangeRate> {
  const [existing] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.storeId, input.storeId),
        eq(exchangeRates.baseCurrency, input.baseCurrency),
        eq(exchangeRates.targetCurrency, input.targetCurrency)
      )
    )
    .limit(1);

  let result: ExchangeRate;
  if (existing) {
    const [updated] = await db
      .update(exchangeRates)
      .set({
        rateScaledFactor: input.rateScaledFactor,
        source: input.source,
        effectiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exchangeRates.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [created] = await db
      .insert(exchangeRates)
      .values({
        storeId: input.storeId,
        baseCurrency: input.baseCurrency,
        targetCurrency: input.targetCurrency,
        rateScaledFactor: input.rateScaledFactor,
        source: input.source,
      })
      .returning();
    result = created;
  }

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "currency:set_rate",
      entity: "exchange_rate",
      entityId: result.id,
      after: {
        pair: `${input.baseCurrency}/${input.targetCurrency}`,
        rate: input.rateScaledFactor / SCALE_FACTOR,
      },
    });
  }

  return result;
}

/**
 * Retrieves exchange rate for a pair. Defaults to 1:1 (SCALE_FACTOR) if same currency.
 */
export async function getExchangeRate(
  storeId: string,
  baseCurrency: string,
  targetCurrency: string
): Promise<number> {
  if (baseCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
    return SCALE_FACTOR;
  }

  const [record] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.storeId, storeId),
        eq(exchangeRates.baseCurrency, baseCurrency.toUpperCase()),
        eq(exchangeRates.targetCurrency, targetCurrency.toUpperCase())
      )
    )
    .limit(1);

  return record ? record.rateScaledFactor : SCALE_FACTOR;
}

/**
 * Deterministically converts minor units (Paise/Cents) using integer scaled math.
 */
export function convertMinorUnits(
  amountMinorUnits: number,
  fromCurrency: string,
  toCurrency: string,
  rateScaledFactor: number
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amountMinorUnits;
  }
  return Math.round((amountMinorUnits * rateScaledFactor) / SCALE_FACTOR);
}

import { db } from "@/database/client";
import { taxConfigs, dutyConfigs } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import type { CreateTaxConfigInput, CreateDutyConfigInput } from "./types";

/**
 * Creates regional tax configuration for a country/market.
 */
export async function createTaxConfig(input: CreateTaxConfigInput) {
  const [record] = await db
    .insert(taxConfigs)
    .values({
      storeId: input.storeId,
      marketId: input.marketId,
      countryCode: input.countryCode.toUpperCase(),
      regionCode: input.regionCode?.toUpperCase(),
      taxName: input.taxName,
      taxRateBasisPoints: input.taxRateBasisPoints,
      isInclusive: input.isInclusive,
      taxType: input.taxType,
    })
    .returning();

  return record;
}

/**
 * Creates customs duty and handling fee configuration.
 */
export async function createDutyConfig(input: CreateDutyConfigInput) {
  const [record] = await db
    .insert(dutyConfigs)
    .values({
      storeId: input.storeId,
      marketId: input.marketId,
      destinationCountry: input.destinationCountry.toUpperCase(),
      hsCodePrefix: input.hsCodePrefix,
      dutyRateBasisPoints: input.dutyRateBasisPoints,
      handlingFeePaise: input.handlingFeePaise,
    })
    .returning();

  return record;
}

/**
 * Calculates regional tax based on country settings.
 */
export async function calculateRegionalTax(
  storeId: string,
  countryCode: string,
  taxableAmountPaise: number
): Promise<{ taxAmountPaise: number; isInclusive: boolean; taxRateBasisPoints: number }> {
  const [config] = await db
    .select()
    .from(taxConfigs)
    .where(
      and(
        eq(taxConfigs.storeId, storeId),
        eq(taxConfigs.countryCode, countryCode.toUpperCase())
      )
    )
    .limit(1);

  if (!config) {
    return { taxAmountPaise: 0, isInclusive: false, taxRateBasisPoints: 0 };
  }

  const taxAmountPaise = Math.round(
    (taxableAmountPaise * config.taxRateBasisPoints) / 10_000
  );

  return {
    taxAmountPaise,
    isInclusive: config.isInclusive,
    taxRateBasisPoints: config.taxRateBasisPoints,
  };
}

/**
 * Estimates import customs duty and cross-border handling fees.
 */
export async function estimateCustomsDuties(
  storeId: string,
  destinationCountry: string,
  itemValuePaise: number
): Promise<{ dutyAmountPaise: number; handlingFeePaise: number; totalDutiesPaise: number }> {
  const [config] = await db
    .select()
    .from(dutyConfigs)
    .where(
      and(
        eq(dutyConfigs.storeId, storeId),
        eq(dutyConfigs.destinationCountry, destinationCountry.toUpperCase())
      )
    )
    .limit(1);

  if (!config) {
    return { dutyAmountPaise: 0, handlingFeePaise: 0, totalDutiesPaise: 0 };
  }

  const dutyAmountPaise = Math.round(
    (itemValuePaise * config.dutyRateBasisPoints) / 10_000
  );
  const handlingFeePaise = config.handlingFeePaise;

  return {
    dutyAmountPaise,
    handlingFeePaise,
    totalDutiesPaise: dutyAmountPaise + handlingFeePaise,
  };
}

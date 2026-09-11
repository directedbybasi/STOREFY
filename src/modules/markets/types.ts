import { z } from "zod";

export const CreateMarketSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(2),
  code: z.string().min(2).max(50),
  defaultCurrency: z.string().length(3).default("INR"),
  defaultLanguage: z.string().min(2).max(10).default("en"),
  isPrimary: z.boolean().default(false),
  countryCodes: z.array(z.string().length(2)).default([]),
});

export type CreateMarketInput = z.infer<typeof CreateMarketSchema>;

export const SetExchangeRateSchema = z.object({
  storeId: z.string().uuid(),
  baseCurrency: z.string().length(3).default("INR"),
  targetCurrency: z.string().length(3),
  rateScaledFactor: z.number().int().positive(), // rate * 1,000,000
  source: z.enum(["MANUAL", "PROVIDER"]).default("MANUAL"),
});

export type SetExchangeRateInput = z.infer<typeof SetExchangeRateSchema>;

export const SetLocalizedContentSchema = z.object({
  storeId: z.string().uuid(),
  entityType: z.enum(["product", "category", "page", "blog_post"]),
  entityId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  fieldName: z.string().min(1),
  translatedValue: z.string(),
});

export type SetLocalizedContentInput = z.infer<typeof SetLocalizedContentSchema>;

export const CreateTaxConfigSchema = z.object({
  storeId: z.string().uuid(),
  marketId: z.string().uuid().optional(),
  countryCode: z.string().length(2),
  regionCode: z.string().optional(),
  taxName: z.string().min(2),
  taxRateBasisPoints: z.number().int().min(0).default(0), // 1800 = 18.00%
  isInclusive: z.boolean().default(false),
  taxType: z.enum(["GST", "VAT", "SALES_TAX"]).default("GST"),
});

export type CreateTaxConfigInput = z.infer<typeof CreateTaxConfigSchema>;

export const CreateDutyConfigSchema = z.object({
  storeId: z.string().uuid(),
  marketId: z.string().uuid().optional(),
  destinationCountry: z.string().length(2),
  hsCodePrefix: z.string().optional(),
  dutyRateBasisPoints: z.number().int().min(0).default(0),
  handlingFeePaise: z.number().int().min(0).default(0),
});

export type CreateDutyConfigInput = z.infer<typeof CreateDutyConfigSchema>;

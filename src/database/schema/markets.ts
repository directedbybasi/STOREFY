import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Phase 16: Sales Channel Registry
 */
export const salesChannels = pgTable(
  "sales_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("ONLINE_STORE"), // ONLINE_STORE, POS, B2B, MARKETPLACE, SOCIAL
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, INACTIVE
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sales_channels_store_id").on(table.storeId),
    index("idx_sales_channels_type").on(table.storeId, table.type),
  ]
);

/**
 * Phase 16: Regional Markets
 */
export const markets = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("INR"),
    defaultLanguage: varchar("default_language", { length: 10 }).notNull().default("en"),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, INACTIVE
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_markets_store_code").on(table.storeId, table.code),
    index("idx_markets_store_id").on(table.storeId),
  ]
);

/**
 * Phase 16: Countries in Market
 */
export const marketCountries = pgTable(
  "market_countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 2 }).notNull(), // ISO-3166-1 alpha-2 (IN, US, AE, GB, etc.)
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_market_countries_store_code").on(table.storeId, table.countryCode),
    index("idx_market_countries_market_id").on(table.marketId),
  ]
);

/**
 * Phase 16: Multi-Currency Exchange Rates
 * rateScaledFactor stores rate multiplied by 1,000,000 for deterministic 6-decimal precision.
 */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("INR"),
    targetCurrency: varchar("target_currency", { length: 3 }).notNull(),
    rateScaledFactor: bigint("rate_scaled_factor", { mode: "number" }).notNull(), // e.g. 12000 = 0.012000 (1 INR = 0.012 USD)
    source: varchar("source", { length: 50 }).notNull().default("MANUAL"), // MANUAL, PROVIDER
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_exchange_rates_store_pair").on(
      table.storeId,
      table.baseCurrency,
      table.targetCurrency
    ),
    index("idx_exchange_rates_store_id").on(table.storeId),
  ]
);

/**
 * Phase 16: Localized Content (Multi-Language)
 */
export const localizedContent = pgTable(
  "localized_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // product, category, page, blog_post
    entityId: uuid("entity_id").notNull(),
    locale: varchar("locale", { length: 10 }).notNull(), // en, hi, ar, ml, etc.
    fieldName: varchar("field_name", { length: 100 }).notNull(), // title, description, seoTitle, seoDescription
    translatedValue: text("translated_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_localized_content_entity_field_locale").on(
      table.storeId,
      table.entityType,
      table.entityId,
      table.fieldName,
      table.locale
    ),
    index("idx_localized_content_entity").on(table.storeId, table.entityType, table.entityId),
  ]
);

/**
 * Phase 16: Tax Configurations
 * taxRateBasisPoints: 1800 = 18.00%
 */
export const taxConfigs = pgTable(
  "tax_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    regionCode: varchar("region_code", { length: 10 }),
    taxName: varchar("tax_name", { length: 100 }).notNull(), // GST, VAT, State Tax
    taxRateBasisPoints: integer("tax_rate_basis_points").notNull().default(0),
    isInclusive: boolean("is_inclusive").notNull().default(false),
    taxType: varchar("tax_type", { length: 50 }).notNull().default("GST"), // GST, VAT, SALES_TAX
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_tax_configs_store_country").on(table.storeId, table.countryCode),
    index("idx_tax_configs_market").on(table.marketId),
  ]
);

/**
 * Phase 16: Duties & Customs Foundation
 */
export const dutyConfigs = pgTable(
  "duty_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "cascade" }),
    destinationCountry: varchar("destination_country", { length: 2 }).notNull(),
    hsCodePrefix: varchar("hs_code_prefix", { length: 20 }),
    dutyRateBasisPoints: integer("duty_rate_basis_points").notNull().default(0),
    handlingFeePaise: bigint("handling_fee_paise", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_duty_configs_store_country").on(table.storeId, table.destinationCountry),
    index("idx_duty_configs_market").on(table.marketId),
  ]
);

export type SalesChannel = typeof salesChannels.$inferSelect;
export type NewSalesChannel = typeof salesChannels.$inferInsert;
export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type MarketCountry = typeof marketCountries.$inferSelect;
export type NewMarketCountry = typeof marketCountries.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type LocalizedContent = typeof localizedContent.$inferSelect;
export type NewLocalizedContent = typeof localizedContent.$inferInsert;
export type TaxConfig = typeof taxConfigs.$inferSelect;
export type NewTaxConfig = typeof taxConfigs.$inferInsert;
export type DutyConfig = typeof dutyConfigs.$inferSelect;
export type NewDutyConfig = typeof dutyConfigs.$inferInsert;

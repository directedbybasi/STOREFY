import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products, productVariants } from "./products";

export type RecommendationType =
  | "RELATED"
  | "FREQUENTLY_BOUGHT_TOGETHER"
  | "CROSS_SELL"
  | "RECENTLY_VIEWED";

export type BundlePricingMode = "FIXED" | "COMPONENT_DERIVED";
export type CrossSellPlacement = "PDP" | "CART" | "CHECKOUT";

/**
 * Domain 15: Search Settings & Merchandising Rules
 */
export const searchSettings = pgTable(
  "search_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    typoToleranceEnabled: boolean("typo_tolerance_enabled").notNull().default(true),
    customBoostFields: jsonb("custom_boost_fields").$type<Record<string, number>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("idx_search_settings_store").on(table.storeId)]
);

export const searchMerchandisingRules = pgTable(
  "search_merchandising_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    query: varchar("query", { length: 255 }).notNull(),
    boostProductIds: jsonb("boost_product_ids").$type<string[]>().default([]),
    pinProductIds: jsonb("pin_product_ids").$type<string[]>().default([]),
    excludeProductIds: jsonb("exclude_product_ids").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_search_merch_query").on(table.storeId, table.query),
    index("idx_search_merch_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Product Recommendations
 */
export const productRecommendations = pgTable(
  "product_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).$type<RecommendationType>().notNull(),
    sourceProductId: uuid("source_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    recommendedProductIds: jsonb("recommended_product_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_recommendations_type_source").on(table.storeId, table.type, table.sourceProductId),
    index("idx_recommendations_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Product Bundles & Components
 */
export const productBundles = pgTable(
  "product_bundles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    bundleProductId: uuid("bundle_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    pricingMode: varchar("pricing_mode", { length: 50 })
      .$type<BundlePricingMode>()
      .notNull()
      .default("COMPONENT_DERIVED"),
    fixedPricePaise: bigint("fixed_price_paise", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_product_bundles_product").on(table.storeId, table.bundleProductId),
    index("idx_product_bundles_store").on(table.storeId),
  ]
);

export const bundleComponents = pgTable(
  "bundle_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => productBundles.id, { onDelete: "cascade" }),
    componentProductId: uuid("component_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    componentVariantId: uuid("component_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_bundle_components_bundle").on(table.bundleId),
    index("idx_bundle_components_variant").on(table.componentVariantId),
  ]
);

/**
 * Domain 15: Add-ons & Cross-Sells
 */
export const productCrossSells = pgTable(
  "product_cross_sells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    crossSellProductIds: jsonb("cross_sell_product_ids").$type<string[]>().notNull().default([]),
    placement: varchar("placement", { length: 50 })
      .$type<CrossSellPlacement>()
      .notNull()
      .default("PDP"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cross_sells_placement").on(table.storeId, table.productId, table.placement),
    index("idx_cross_sells_store").on(table.storeId),
  ]
);

export type SearchSettings = typeof searchSettings.$inferSelect;
export type NewSearchSettings = typeof searchSettings.$inferInsert;
export type SearchMerchandisingRule = typeof searchMerchandisingRules.$inferSelect;
export type NewSearchMerchandisingRule = typeof searchMerchandisingRules.$inferInsert;
export type ProductRecommendation = typeof productRecommendations.$inferSelect;
export type NewProductRecommendation = typeof productRecommendations.$inferInsert;
export type ProductBundle = typeof productBundles.$inferSelect;
export type NewProductBundle = typeof productBundles.$inferInsert;
export type BundleComponent = typeof bundleComponents.$inferSelect;
export type NewBundleComponent = typeof bundleComponents.$inferInsert;
export type ProductCrossSell = typeof productCrossSells.$inferSelect;
export type NewProductCrossSell = typeof productCrossSells.$inferInsert;

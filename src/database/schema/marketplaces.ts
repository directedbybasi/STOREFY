import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders, orderItems } from "./orders";
import { products, productVariants } from "./products";

// ──────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────

export const marketplaceEnum = pgEnum("marketplace_type", [
  "MEESHO",
  "AMAZON",
  "FLIPKART",
]);

export const marketplaceAvailabilityEnum = pgEnum("marketplace_availability_status", [
  "AVAILABLE",
  "OUT_OF_STOCK",
  "UNAVAILABLE",
  "UNKNOWN",
  "BLOCKED",
]);

export const marketplaceSyncStatusEnum = pgEnum("marketplace_sync_status", [
  "SYNCED",
  "PARTIAL",
  "STALE",
  "ERROR",
  "UNAVAILABLE",
  "MANUAL_REVIEW",
]);

export const marketplaceOrderTaskStatusEnum = pgEnum("marketplace_order_task_status", [
  "PENDING",
  "ORDERED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RTO",
]);

// ──────────────────────────────────────────────────────
// Tables
// ──────────────────────────────────────────────────────

/**
 * 1. Marketplace Connectors
 * Platform-level registry of supported marketplace adapters and their capabilities.
 */
export const marketplaceConnectors = pgTable("marketplace_connectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g. "MEESHO"
  displayName: varchar("display_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  capabilities: jsonb("capabilities").$type<{
    importUrl: boolean;
    importProductId: boolean;
    realtimeAvailability: boolean;
    autoOrderFulfillment: boolean;
    rateLimitsPerMinute: number;
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 2. Marketplace Products
 * Store-scoped cache of external marketplace products imported or previewed.
 * Source cost is stored in integer Paise (never exposed to public storefronts).
 */
export const marketplaceProducts = pgTable(
  "marketplace_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketplace: varchar("marketplace", { length: 50 }).notNull().default("MEESHO"),
    sourceProductId: varchar("source_product_id", { length: 255 }).notNull(),
    sourceUrl: text("source_url"),
    sourceTitle: varchar("source_title", { length: 500 }).notNull(),
    sourceDescription: text("source_description"),
    sourceCategory: varchar("source_category", { length: 255 }),
    sourceCostPaise: bigint("source_cost_paise", { mode: "number" }).notNull(), // Integer Paise
    sourceComparePaise: bigint("source_compare_paise", { mode: "number" }),
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    rating: numeric("rating", { precision: 3, scale: 2 }),
    reviewCount: integer("review_count").notNull().default(0),
    specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    availabilityStatus: marketplaceAvailabilityEnum("availability_status").notNull().default("AVAILABLE"),
    syncStatus: marketplaceSyncStatusEnum("sync_status").notNull().default("SYNCED"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    syncErrorMessage: text("sync_error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_marketplace_prod_store_src").on(
      table.storeId,
      table.marketplace,
      table.sourceProductId
    ),
    index("idx_marketplace_prod_store").on(table.storeId),
    index("idx_marketplace_prod_source_id").on(table.sourceProductId),
  ]
);

/**
 * 3. Marketplace Product Variants
 * Variants discovered from the external marketplace source.
 */
export const marketplaceProductVariants = pgTable(
  "marketplace_product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    sourceVariantId: varchar("source_variant_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    options: jsonb("options").$type<Record<string, string>>().notNull().default({}), // e.g. { size: "XL", color: "Red" }
    sourceCostPaise: bigint("source_cost_paise", { mode: "number" }).notNull(),
    available: boolean("available").notNull().default(true),
    sku: varchar("sku", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_marketplace_variant_unique").on(
      table.marketplaceProductId,
      table.sourceVariantId
    ),
  ]
);

/**
 * 4. Marketplace Product Mappings
 * Links canonical STOREFY products and variants to external marketplace products and variants.
 */
export const marketplaceProductMappings = pgTable(
  "marketplace_product_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketplace: varchar("marketplace", { length: 50 }).notNull().default("MEESHO"),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    sourceProductId: varchar("source_product_id", { length: 255 }).notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    sourceVariantId: varchar("source_variant_id", { length: 255 }),
    sourceCostSnapshotPaise: bigint("source_cost_snapshot_paise", { mode: "number" }).notNull(),
    autoSyncPrice: boolean("auto_sync_price").notNull().default(false),
    autoSyncAvailability: boolean("auto_sync_availability").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_marketplace_mapping_unique").on(
      table.storeId,
      table.productId,
      table.variantId
    ),
    index("idx_marketplace_mapping_store").on(table.storeId),
    index("idx_marketplace_mapping_src_prod").on(table.sourceProductId),
  ]
);

/**
 * 5. Marketplace Order Tasks
 * Semi-manual fulfillment records created whenever an order contains a MEESHO item.
 * Guides the merchant through placing the order on Meesho, recording the source reference and tracking.
 */
export const marketplaceOrderTasks = pgTable(
  "marketplace_order_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketplace: varchar("marketplace", { length: 50 }).notNull().default("MEESHO"),
    sourceProductId: varchar("source_product_id", { length: 255 }).notNull(),
    sourceVariantId: varchar("source_variant_id", { length: 255 }),
    status: marketplaceOrderTaskStatusEnum("status").notNull().default("PENDING"),
    sourceOrderId: varchar("source_order_id", { length: 255 }),
    sourceOrderReference: varchar("source_order_reference", { length: 255 }),
    trackingNumber: varchar("tracking_number", { length: 255 }),
    carrier: varchar("carrier", { length: 100 }),
    notes: text("notes"),
    sourceCostPaise: bigint("source_cost_paise", { mode: "number" }).notNull(),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_marketplace_order_task_item").on(table.orderItemId),
    index("idx_marketplace_order_task_order").on(table.orderId),
    index("idx_marketplace_order_task_store_status").on(table.storeId, table.status),
  ]
);

/**
 * 6. Marketplace Sync Logs
 * Audit log recording every import, price refresh, and availability check.
 */
export const marketplaceSyncLogs = pgTable(
  "marketplace_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    marketplace: varchar("marketplace", { length: 50 }).notNull(),
    sourceProductId: varchar("source_product_id", { length: 255 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(), // "IMPORT", "REFRESH", "AVAILABILITY_CHECK"
    status: varchar("status", { length: 50 }).notNull(), // "SUCCESS", "FAILED"
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_marketplace_sync_store").on(table.storeId),
    index("idx_marketplace_sync_src").on(table.sourceProductId),
  ]
);

// ──────────────────────────────────────────────────────
// TypeScript Types
// ──────────────────────────────────────────────────────

export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect;
export type NewMarketplaceProduct = typeof marketplaceProducts.$inferInsert;
export type MarketplaceProductVariant = typeof marketplaceProductVariants.$inferSelect;
export type MarketplaceProductMapping = typeof marketplaceProductMappings.$inferSelect;
export type MarketplaceOrderTask = typeof marketplaceOrderTasks.$inferSelect;
export type NewMarketplaceOrderTask = typeof marketplaceOrderTasks.$inferInsert;
export type MarketplaceSyncLog = typeof marketplaceSyncLogs.$inferSelect;

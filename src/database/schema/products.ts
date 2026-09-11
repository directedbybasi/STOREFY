import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { categories } from "./categories";

/**
 * Domain 3: Product Source & Fulfillment Types
 */
export const productSourceEnum = pgEnum("product_source", [
  "MERCHANT",
  "PLATFORM_SUPPLIER",
  "MEESHO",
]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "MERCHANT",
  "PLATFORM_DROPSHIP",
  "MEESHO_RESELLING",
]);

/**
 * Domain 3: Products
 * The core merchandise unit strictly scoped to an active store.
 * Prices are strictly stored in integer Paise (1 INR = 100 Paise).
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    source: productSourceEnum("source").notNull().default("MERCHANT"),
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type").notNull().default("MERCHANT"),
    supplierId: uuid("supplier_id"),
    supplierProductId: uuid("supplier_product_id"),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    productType: varchar("product_type", { length: 100 }),
    vendor: varchar("vendor", { length: 255 }),
    brand: varchar("brand", { length: 255 }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    specifications: jsonb("specifications")
      .$type<{ name: string; value: string; confidence?: "SUPPORTED" | "INFERRED" | "UNKNOWN" }[]>()
      .notNull()
      .default([]),
    basePrice: bigint("base_price", { mode: "number" }).notNull(), // in Paise (e.g., 99900 = ₹999.00)
    compareAtPrice: bigint("compare_at_price", { mode: "number" }), // in Paise
    costPrice: bigint("cost_price", { mode: "number" }), // in Paise
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    trackInventory: boolean("track_inventory").notNull().default(true),
    allowBackorders: boolean("allow_backorders").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    isPhysical: boolean("is_physical").notNull().default(true),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    dimensions: jsonb("dimensions").$type<{
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    }>(),
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"), // DRAFT, ACTIVE, ARCHIVED
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_products_store_slug").on(table.storeId, table.slug),
    index("idx_products_store_id").on(table.storeId),
    index("idx_products_category_id").on(table.categoryId),
    index("idx_products_status").on(table.storeId, table.status),
    index("idx_products_created_at").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 3: Product Variants
 * Multi-attribute variant matrix (Color, Size, Material).
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(), // e.g., "Black / M" or "Default"
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    price: bigint("price", { mode: "number" }).notNull(), // in Paise
    compareAtPrice: bigint("compare_at_price", { mode: "number" }), // in Paise
    costPrice: bigint("cost_price", { mode: "number" }), // in Paise
    option1: varchar("option1", { length: 100 }), // e.g. "Black"
    option2: varchar("option2", { length: 100 }), // e.g. "M"
    option3: varchar("option3", { length: 100 }), // e.g. "Cotton"
    imageUrl: text("image_url"),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_variants_product_id").on(table.productId),
    index("idx_product_variants_store_product").on(table.storeId, table.productId),
    index("idx_product_variants_sku").on(table.sku),
  ]
);

/**
 * Domain 3: Product Images
 * Media assets belonging to a product, stored in Supabase Storage.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    storagePath: text("storage_path").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_images_product_id").on(table.productId),
    index("idx_product_images_store_product").on(table.storeId, table.productId),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;

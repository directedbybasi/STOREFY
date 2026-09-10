import { pgTable, uuid, varchar, text, boolean, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

/**
 * Domain 1: Stores (Individual storefronts operated by an organization)
 */
export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
    customDomain: varchar("custom_domain", { length: 255 }).unique(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_stores_organization_id").on(table.organizationId),
    index("idx_stores_subdomain").on(table.subdomain),
    index("idx_stores_custom_domain").on(table.customDomain),
  ]
);

/**
 * Domain 1: Store Settings (Operational parameters, WhatsApp, COD limits)
 */
export const storeSettings = pgTable(
  "store_settings",
  {
    storeId: uuid("store_id")
      .primaryKey()
      .references(() => stores.id, { onDelete: "cascade" }),
    whatsappOrderPhone: varchar("whatsapp_order_phone", { length: 32 }),
    whatsappOrderEnabled: boolean("whatsapp_order_enabled").notNull().default(false),
    whatsappSupportPhone: varchar("whatsapp_support_phone", { length: 32 }),
    whatsappSupportEnabled: boolean("whatsapp_support_enabled").notNull().default(false),
    codEnabled: boolean("cod_enabled").notNull().default(true),
    codMinAmount: bigint("cod_min_amount", { mode: "number" }).default(0),
    codMaxAmount: bigint("cod_max_amount", { mode: "number" }).default(5000000), // ₹50,000 max in paise
    taxInclusive: boolean("tax_inclusive").notNull().default(true),
    orderIdPrefix: varchar("order_id_prefix", { length: 10 }).notNull().default("ORD-"),
    invoicePrefix: varchar("invoice_prefix", { length: 10 }).notNull().default("INV-"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type NewStoreSettings = typeof storeSettings.$inferInsert;

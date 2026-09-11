import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { users } from "./users";
import { products, productVariants } from "./products";
import { orders } from "./orders";

/**
 * Phase 16: B2B Wholesale Companies
 */
export const b2bCompanies = pgTable(
  "b2b_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 100 }).notNull(),
    taxId: varchar("tax_id", { length: 100 }), // GSTIN / VAT ID
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    creditLimitPaise: bigint("credit_limit_paise", { mode: "number" })
      .notNull()
      .default(0),
    paymentTerms: varchar("payment_terms", { length: 50 })
      .notNull()
      .default("PREPAID"), // PREPAID, NET_7, NET_15, NET_30, NET_60
    billingAddress: jsonb("billing_address").$type<Record<string, unknown>>(),
    shippingAddresses: jsonb("shipping_addresses").$type<Record<string, unknown>[]>(),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, PENDING_REVIEW, SUSPENDED
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_b2b_companies_store_code").on(table.storeId, table.code),
    index("idx_b2b_companies_store_id").on(table.storeId),
    index("idx_b2b_companies_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: B2B Company Users (Company Admin, Approver, Buyer)
 */
export const b2bCompanyUsers = pgTable(
  "b2b_company_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => b2bCompanies.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .references(() => customers.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("BUYER"), // COMPANY_ADMIN, APPROVER, BUYER
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, INVITED, SUSPENDED
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_b2b_users_company_email").on(table.companyId, table.email),
    index("idx_b2b_users_store_id").on(table.storeId),
    index("idx_b2b_users_customer_id").on(table.customerId),
  ]
);

/**
 * Phase 16: B2B Price Lists
 */
export const b2bPriceLists = pgTable(
  "b2b_price_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .references(() => b2bCompanies.id, { onDelete: "cascade" }), // null if global price tier
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, INACTIVE
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_b2b_price_lists_store_code").on(table.storeId, table.code),
    index("idx_b2b_price_lists_store_id").on(table.storeId),
    index("idx_b2b_price_lists_company_id").on(table.companyId),
  ]
);

/**
 * Phase 16: B2B Price List Items & Tier Volume Pricing
 */
export const b2bPriceListItems = pgTable(
  "b2b_price_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    priceListId: uuid("price_list_id")
      .notNull()
      .references(() => b2bPriceLists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .references(() => productVariants.id, { onDelete: "cascade" }),
    minQuantity: integer("min_quantity").notNull().default(1),
    pricePaise: bigint("price_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_b2b_items_store_id").on(table.storeId),
    index("idx_b2b_items_list_id").on(table.priceListId),
    index("idx_b2b_items_product_id").on(table.productId),
  ]
);

/**
 * Phase 16: B2B Orders, Approvals & Net Payment Terms
 */
export const b2bOrders = pgTable(
  "b2b_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => b2bCompanies.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    poNumber: varchar("po_number", { length: 100 }),
    paymentTerms: varchar("payment_terms", { length: 50 }).notNull().default("PREPAID"),
    approvalStatus: varchar("approval_status", { length: 50 })
      .notNull()
      .default("APPROVED"), // DRAFT, SUBMITTED, APPROVED, REJECTED
    approvedByUserId: uuid("approved_by_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    netTermsDueDate: timestamp("net_terms_due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_b2b_orders_order_id").on(table.orderId),
    index("idx_b2b_orders_store_id").on(table.storeId),
    index("idx_b2b_orders_company_id").on(table.companyId),
    index("idx_b2b_orders_approval").on(table.storeId, table.approvalStatus),
  ]
);

export type B2bCompany = typeof b2bCompanies.$inferSelect;
export type NewB2bCompany = typeof b2bCompanies.$inferInsert;
export type B2bCompanyUser = typeof b2bCompanyUsers.$inferSelect;
export type NewB2bCompanyUser = typeof b2bCompanyUsers.$inferInsert;
export type B2bPriceList = typeof b2bPriceLists.$inferSelect;
export type NewB2bPriceList = typeof b2bPriceLists.$inferInsert;
export type B2bPriceListItem = typeof b2bPriceListItems.$inferSelect;
export type NewB2bPriceListItem = typeof b2bPriceListItems.$inferInsert;
export type B2bOrder = typeof b2bOrders.$inferSelect;
export type NewB2bOrder = typeof b2bOrders.$inferInsert;

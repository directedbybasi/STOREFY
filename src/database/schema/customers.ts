import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Domain 5: Customers
 * Store-scoped customer CRM profile.
 * Monetary totals (total_spent) strictly stored in integer Paise (1 INR = 100 Paise).
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, ARCHIVED
    notes: text("notes"),
    totalSpent: bigint("total_spent", { mode: "number" }).notNull().default(0), // in Paise
    ordersCount: integer("orders_count").notNull().default(0),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_customers_store_email").on(table.storeId, table.email),
    index("idx_customers_store_id").on(table.storeId),
    index("idx_customers_email").on(table.email),
    index("idx_customers_phone").on(table.phone),
    index("idx_customers_created_at").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 5: Customer Addresses
 * Multi-address book for billing and shipping destinations.
 */
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("India"),
    isDefault: boolean("is_default").notNull().default(false),
    type: varchar("type", { length: 20 }).default("SHIPPING"), // SHIPPING, BILLING, BOTH
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_addresses_store_id").on(table.storeId),
    index("idx_customer_addresses_customer_id").on(table.customerId),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;

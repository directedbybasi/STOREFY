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
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { carts } from "./cart";
import { products, productVariants } from "./products";

export interface CheckoutAddressData {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Domain 5 & 6: Checkout Sessions
 * Temporary transactional state machine orchestrating customer contact, address,
 * shipping selection, payment preparation, and 15-minute stock hold.
 */
export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id").references(() => carts.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("RESERVED"), // RESERVED, COMPLETED, EXPIRED, CANCELLED
    step: varchar("step", { length: 50 }).notNull().default("CONTACT"), // CONTACT, ADDRESS, SHIPPING, PAYMENT, REVIEW, CONFIRMATION
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    fullName: varchar("full_name", { length: 255 }),
    shippingAddress: jsonb("shipping_address").$type<CheckoutAddressData | null>(),
    billingAddress: jsonb("billing_address").$type<CheckoutAddressData | null>(),
    shippingMethodId: varchar("shipping_method_id", { length: 100 }),
    shippingMethodName: varchar("shipping_method_name", { length: 100 }),
    shippingCost: bigint("shipping_cost", { mode: "number" }).notNull().default(0), // in Paise
    paymentMethod: varchar("payment_method", { length: 50 }), // COD, ONLINE
    paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("NOT_STARTED"), // NOT_STARTED, PENDING, READY_FOR_PAYMENT
    subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull().default(0), // in Paise
    discountAmount: bigint("discount_amount", { mode: "number" }).notNull().default(0), // in Paise
    taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0), // in Paise
    totalAmount: bigint("total_amount", { mode: "number" }).notNull().default(0), // in Paise
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    notes: text("notes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_checkout_sessions_store_id").on(table.storeId),
    index("idx_checkout_sessions_cart_id").on(table.cartId),
    index("idx_checkout_sessions_customer_id").on(table.customerId),
    index("idx_checkout_sessions_token").on(table.sessionToken),
    index("idx_checkout_sessions_status").on(table.status),
    index("idx_checkout_sessions_expires_at").on(table.expiresAt),
    index("idx_checkout_sessions_store_token").on(table.storeId, table.sessionToken),
  ]
);

/**
 * Domain 5 & 6: Checkout Session Items
 * Snapshot of line items reserved for a checkout session with locked unit prices in Paise.
 */
export const checkoutSessionItems = pgTable(
  "checkout_session_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(), // authoritative price in Paise at reservation time
    subtotal: bigint("subtotal", { mode: "number" }).notNull(), // unitPrice * quantity in Paise
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, RELEASED, CONSUMED
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_checkout_items_session_id").on(table.checkoutSessionId),
    index("idx_checkout_items_store_id").on(table.storeId),
    index("idx_checkout_items_variant_id").on(table.variantId),
    index("idx_checkout_items_status").on(table.status),
    index("idx_checkout_items_expires_at").on(table.expiresAt),
  ]
);

export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type NewCheckoutSession = typeof checkoutSessions.$inferInsert;
export type CheckoutSessionItem = typeof checkoutSessionItems.$inferSelect;
export type NewCheckoutSessionItem = typeof checkoutSessionItems.$inferInsert;

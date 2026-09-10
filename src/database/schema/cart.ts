import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { products, productVariants } from "./products";

/**
 * Domain 5: Carts
 * Persistent server-validated cart sessions.
 * Carts are strictly store-scoped and identified by an opaque session token.
 */
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    couponCode: varchar("coupon_code", { length: 50 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_carts_store_id").on(table.storeId),
    index("idx_carts_session_token").on(table.sessionToken),
    index("idx_carts_customer_id").on(table.customerId),
    index("idx_carts_expires_at").on(table.expiresAt),
    index("idx_carts_store_session").on(table.storeId, table.sessionToken),
  ]
);

/**
 * Domain 5: Cart Items
 * Line items within a cart session.
 * Unique constraint ensures a variant appears at most once per cart.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cart_items_cart_variant").on(table.cartId, table.variantId),
    index("idx_cart_items_cart_id").on(table.cartId),
    index("idx_cart_items_variant_id").on(table.variantId),
    index("idx_cart_items_product_id").on(table.productId),
  ]
);

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

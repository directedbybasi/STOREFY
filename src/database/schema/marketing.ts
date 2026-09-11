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
import { orders } from "./orders";
import { customers } from "./customers";

export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING";
export type CouponTargetType = "ALL" | "PRODUCTS" | "CATEGORIES" | "COLLECTIONS";

export interface BogoConfig {
  buyQuantity: number;
  getQuantity: number;
  rewardProductId?: string;
  rewardVariantId?: string;
}

export interface CouponSnapshot {
  code: string;
  type: CouponDiscountType;
  value: number; // Percentage (e.g. 10) or Paise (e.g. 10000 = ₹100)
  discountAmountPaise: number;
  appliedAt: string;
}

/**
 * Domain 11: Coupons & Promotional Discounts
 * Server-authoritative discount rules with atomic database-level redemption limits.
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).$type<CouponDiscountType>().notNull().default("PERCENTAGE"),
    value: bigint("value", { mode: "number" }).notNull(), // Percentage integer (e.g. 15 for 15%) or flat Paise (e.g. 20000 = ₹200)
    minSpendAmount: bigint("min_spend_amount", { mode: "number" }).notNull().default(0), // in Paise
    maxDiscountAmount: bigint("max_discount_amount", { mode: "number" }), // in Paise, optional cap for percentage discounts
    usageLimit: integer("usage_limit"), // null = unlimited total redemptions
    usageCount: integer("usage_count").notNull().default(0),
    perCustomerLimit: integer("per_customer_limit").notNull().default(1),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    targetType: varchar("target_type", { length: 50 }).$type<CouponTargetType>().notNull().default("ALL"),
    targetIds: jsonb("target_ids").$type<string[]>().default([]), // UUIDs of eligible products, categories, or collections
    bogoConfig: jsonb("bogo_config").$type<BogoConfig | null>(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_coupons_store_code").on(table.storeId, table.code),
    index("idx_coupons_store_id").on(table.storeId),
    index("idx_coupons_active_dates").on(table.storeId, table.isActive, table.startDate, table.endDate),
  ]
);

/**
 * Domain 11: Coupon Redemptions
 * Durable ledger recording every coupon redemption linked to an order and customer.
 */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerEmail: varchar("customer_email", { length: 255 }),
    discountAmount: bigint("discount_amount", { mode: "number" }).notNull(), // in Paise
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_coupon_redemptions_coupon_id").on(table.couponId),
    index("idx_coupon_redemptions_customer").on(table.couponId, table.customerId),
    index("idx_coupon_redemptions_email").on(table.couponId, table.customerEmail),
    index("idx_coupon_redemptions_order").on(table.orderId),
    index("idx_coupon_redemptions_store").on(table.storeId),
  ]
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert;

import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { orders } from "./orders";

export type ReferralRewardType = "POINTS" | "STORE_CREDIT" | "COUPON";
export type ReferralRewardStatus = "PENDING" | "QUALIFIED" | "REWARDED" | "REVERSED";

/**
 * Domain 15: Referral Programs
 */
export const referralPrograms = pgTable(
  "referral_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    rewardType: varchar("reward_type", { length: 50 })
      .$type<ReferralRewardType>()
      .notNull()
      .default("STORE_CREDIT"),
    referrerRewardValue: bigint("referrer_reward_value", { mode: "number" }).notNull(), // points or Paise
    refereeRewardValue: bigint("referee_reward_value", { mode: "number" }).notNull(), // points or Paise
    minPurchaseAmountPaise: bigint("min_purchase_amount_paise", { mode: "number" })
      .notNull()
      .default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_referral_programs_store").on(table.storeId, table.isActive)]
);

/**
 * Domain 15: Referral Codes
 */
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull(),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_referral_codes_code").on(table.storeId, table.code),
    uniqueIndex("idx_referral_codes_customer").on(table.storeId, table.customerId),
    index("idx_referral_codes_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Referral Attributions
 * Maps qualified orders to referral rewards.
 */
export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    referralCodeId: uuid("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    referrerCustomerId: uuid("referrer_customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    refereeCustomerId: uuid("referee_customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
    rewardStatus: varchar("reward_status", { length: 50 })
      .$type<ReferralRewardStatus>()
      .notNull()
      .default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_referral_attr_store").on(table.storeId),
    index("idx_referral_attr_referrer").on(table.referrerCustomerId),
    index("idx_referral_attr_referee").on(table.refereeCustomerId),
    index("idx_referral_attr_order").on(table.orderId),
  ]
);

export type ReferralProgram = typeof referralPrograms.$inferSelect;
export type NewReferralProgram = typeof referralPrograms.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;
export type ReferralAttribution = typeof referralAttributions.$inferSelect;
export type NewReferralAttribution = typeof referralAttributions.$inferInsert;

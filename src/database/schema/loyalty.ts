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
import { orders } from "./orders";

export type LoyaltyLedgerType = "EARN" | "REDEEM" | "EXPIRE" | "ADJUST" | "REVERSE";

/**
 * Domain 15: Loyalty Accounts
 * Customer reward balance per store.
 */
export const loyaltyAccounts = pgTable(
  "loyalty_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimePointsEarned: integer("lifetime_points_earned").notNull().default(0),
    tier: varchar("tier", { length: 50 }).notNull().default("BRONZE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_loyalty_accounts_customer").on(table.storeId, table.customerId),
    index("idx_loyalty_accounts_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Loyalty Ledger
 * Append-only immutable ledger for all points movements.
 */
export const loyaltyLedger = pgTable(
  "loyalty_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => loyaltyAccounts.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).$type<LoyaltyLedgerType>().notNull(),
    pointsDelta: integer("points_delta").notNull(),
    pointsBefore: integer("points_before").notNull(),
    pointsAfter: integer("points_after").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 255 }).notNull(),
    referenceId: varchar("reference_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_loyalty_ledger_account").on(table.accountId),
    index("idx_loyalty_ledger_customer").on(table.storeId, table.customerId),
    index("idx_loyalty_ledger_order").on(table.orderId),
    index("idx_loyalty_ledger_created").on(table.storeId, table.createdAt),
  ]
);

export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type NewLoyaltyAccount = typeof loyaltyAccounts.$inferInsert;
export type LoyaltyLedgerEntry = typeof loyaltyLedger.$inferSelect;
export type NewLoyaltyLedgerEntry = typeof loyaltyLedger.$inferInsert;

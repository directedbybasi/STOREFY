import {
  pgTable,
  uuid,
  varchar,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { orders } from "./orders";
import { users } from "./users";

export type StoreCreditLedgerType = "CREDIT" | "DEBIT" | "ADJUSTMENT" | "REVERSAL";
export type WalletLedgerType = "CREDIT" | "DEBIT" | "PROMO_CREDIT" | "PROMO_EXPIRE" | "REVERSAL";

/**
 * Domain 15: Store Credit Accounts
 */
export const storeCreditAccounts = pgTable(
  "store_credit_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    balancePaise: bigint("balance_paise", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_store_credit_customer").on(table.storeId, table.customerId),
    index("idx_store_credit_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Store Credit Ledger
 * Append-only immutable ledger.
 */
export const storeCreditLedger = pgTable(
  "store_credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => storeCreditAccounts.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).$type<StoreCreditLedgerType>().notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    balanceBeforePaise: bigint("balance_before_paise", { mode: "number" }).notNull(),
    balanceAfterPaise: bigint("balance_after_paise", { mode: "number" }).notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    referenceId: varchar("reference_id", { length: 100 }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_credit_ledger_account").on(table.accountId),
    index("idx_store_credit_ledger_customer").on(table.storeId, table.customerId),
    index("idx_store_credit_ledger_order").on(table.orderId),
    index("idx_store_credit_ledger_created").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 15: Customer Wallet Accounts
 * Internal store value wallet.
 */
export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    balancePaise: bigint("balance_paise", { mode: "number" }).notNull().default(0),
    promotionalBalancePaise: bigint("promo_balance_paise", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_wallet_accounts_customer").on(table.storeId, table.customerId),
    index("idx_wallet_accounts_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Customer Wallet Ledger
 * Append-only immutable ledger.
 */
export const walletLedger = pgTable(
  "wallet_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => walletAccounts.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).$type<WalletLedgerType>().notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    balanceBeforePaise: bigint("balance_before_paise", { mode: "number" }).notNull(),
    balanceAfterPaise: bigint("balance_after_paise", { mode: "number" }).notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    referenceId: varchar("reference_id", { length: 100 }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_wallet_ledger_wallet").on(table.walletId),
    index("idx_wallet_ledger_customer").on(table.storeId, table.customerId),
    index("idx_wallet_ledger_created").on(table.storeId, table.createdAt),
  ]
);

export type StoreCreditAccount = typeof storeCreditAccounts.$inferSelect;
export type NewStoreCreditAccount = typeof storeCreditAccounts.$inferInsert;
export type StoreCreditLedgerEntry = typeof storeCreditLedger.$inferSelect;
export type NewStoreCreditLedgerEntry = typeof storeCreditLedger.$inferInsert;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type NewWalletAccount = typeof walletAccounts.$inferInsert;
export type WalletLedgerEntry = typeof walletLedger.$inferSelect;
export type NewWalletLedgerEntry = typeof walletLedger.$inferInsert;

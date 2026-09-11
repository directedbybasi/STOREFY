import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";

export type GiftCardStatus = "ACTIVE" | "REDEEMED" | "DISABLED" | "EXPIRED";
export type GiftCardTransactionType = "DEBIT" | "CREDIT" | "REFUND";

/**
 * Domain 15: Gift Cards
 * Secure hashed gift cards with server-side transactional balances in Paise.
 */
export const giftCards = pgTable(
  "gift_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(), // SHA-256 hash of secret code
    codeMasked: varchar("code_masked", { length: 30 }).notNull(), // e.g. '••••-••••-••••-1234'
    initialValuePaise: bigint("initial_value_paise", { mode: "number" }).notNull(),
    balancePaise: bigint("balance_paise", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 50 })
      .$type<GiftCardStatus>()
      .notNull()
      .default("ACTIVE"),
    recipientEmail: varchar("recipient_email", { length: 255 }),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_gift_cards_store_hash").on(table.storeId, table.codeHash),
    index("idx_gift_cards_store_status").on(table.storeId, table.status),
    index("idx_gift_cards_created").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 15: Gift Card Transactions
 * Immutable transaction ledger for gift card usage.
 */
export const giftCardTransactions = pgTable(
  "gift_card_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    giftCardId: uuid("gift_card_id")
      .notNull()
      .references(() => giftCards.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    type: varchar("type", { length: 50 }).$type<GiftCardTransactionType>().notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    balanceBeforePaise: bigint("balance_before_paise", { mode: "number" }).notNull(),
    balanceAfterPaise: bigint("balance_after_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_gift_card_tx_card").on(table.giftCardId),
    index("idx_gift_card_tx_order").on(table.orderId),
    index("idx_gift_card_tx_created").on(table.storeId, table.createdAt),
  ]
);

export type GiftCard = typeof giftCards.$inferSelect;
export type NewGiftCard = typeof giftCards.$inferInsert;
export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type NewGiftCardTransaction = typeof giftCardTransactions.$inferInsert;

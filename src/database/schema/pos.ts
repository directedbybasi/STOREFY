import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { users } from "./users";
import { locations } from "./multi_location";
import { orders } from "./orders";

/**
 * Phase 16: Point of Sale (POS) Cash Registers & Workshifts
 */
export const posSessions = pgTable(
  "pos_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    staffUserId: uuid("staff_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sessionNumber: varchar("session_number", { length: 50 }).notNull(),
    openingCashPaise: bigint("opening_cash_paise", { mode: "number" })
      .notNull()
      .default(0),
    closingCashPaise: bigint("closing_cash_paise", { mode: "number" }),
    expectedCashPaise: bigint("expected_cash_paise", { mode: "number" })
      .notNull()
      .default(0),
    countedCashPaise: bigint("counted_cash_paise", { mode: "number" }),
    cashVariancePaise: bigint("cash_variance_paise", { mode: "number" })
      .notNull()
      .default(0),
    status: varchar("status", { length: 50 }).notNull().default("OPEN"), // OPEN, ACTIVE, CLOSING, CLOSED
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_pos_sessions_store_number").on(table.storeId, table.sessionNumber),
    index("idx_pos_sessions_store_id").on(table.storeId),
    index("idx_pos_sessions_location_id").on(table.locationId),
    index("idx_pos_sessions_staff_id").on(table.staffUserId),
    index("idx_pos_sessions_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: POS In-Store Transactions
 */
export const posTransactions = pgTable(
  "pos_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    posSessionId: uuid("pos_session_id")
      .notNull()
      .references(() => posSessions.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // CASH, CARD, GIFT_CARD, STORE_CREDIT, LOYALTY
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    tenderAmountPaise: bigint("tender_amount_paise", { mode: "number" }).notNull(),
    changePaise: bigint("change_paise", { mode: "number" }).notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("COMPLETED"), // COMPLETED, VOIDED, REFUNDED
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_pos_tx_store_id").on(table.storeId),
    index("idx_pos_tx_session_id").on(table.posSessionId),
    index("idx_pos_tx_order_id").on(table.orderId),
  ]
);

export type PosSession = typeof posSessions.$inferSelect;
export type NewPosSession = typeof posSessions.$inferInsert;
export type PosTransaction = typeof posTransactions.$inferSelect;
export type NewPosTransaction = typeof posTransactions.$inferInsert;

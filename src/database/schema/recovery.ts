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
import { checkoutSessions } from "./checkout";
import { customers } from "./customers";

export type AbandonmentRecoveryState = "ABANDONED" | "RECOVERY_SENT" | "RECOVERED" | "EXPIRED";

/**
 * Domain 15: Abandoned Checkouts
 * Server-side tracking for abandoned carts & checkouts with cryptographically signed recovery tokens.
 */
export const abandonedCheckouts = pgTable(
  "abandoned_checkouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    cartValuePaise: bigint("cart_value_paise", { mode: "number" }).notNull().default(0),
    recoveryToken: varchar("recovery_token", { length: 500 }).notNull(),
    recoveryState: varchar("recovery_state", { length: 50 })
      .$type<AbandonmentRecoveryState>()
      .notNull()
      .default("ABANDONED"),
    recoverySentAt: timestamp("recovery_sent_at", { withTimezone: true }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_abandoned_checkouts_session").on(table.storeId, table.checkoutSessionId),
    index("idx_abandoned_checkouts_store").on(table.storeId),
    index("idx_abandoned_checkouts_state").on(table.storeId, table.recoveryState),
    index("idx_abandoned_checkouts_created").on(table.storeId, table.createdAt),
  ]
);

export type AbandonedCheckout = typeof abandonedCheckouts.$inferSelect;
export type NewAbandonedCheckout = typeof abandonedCheckouts.$inferInsert;

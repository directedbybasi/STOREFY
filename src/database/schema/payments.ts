import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  bigint,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";

/**
 * Domain 7: Payment Accounts / Merchant Gateway Credentials
 * Stores encrypted API keys and webhook secrets per store and provider using AES-256-GCM.
 */
export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // RAZORPAY, CASHFREE, COD
    encryptedCredentials: text("encrypted_credentials").notNull(), // AES-256-GCM encrypted JSON payload
    isTestMode: boolean("is_test_mode").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_payment_accounts_store_provider").on(table.storeId, table.provider),
    index("idx_payment_accounts_store_id").on(table.storeId),
  ]
);

/**
 * Domain 7: Payments
 * Authoritative payment transaction record maintaining separation between Order, Payment, and Fulfillment status.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    gateway: varchar("gateway", { length: 50 }).notNull(), // RAZORPAY, CASHFREE, COD
    gatewayOrderId: varchar("gateway_order_id", { length: 255 }), // e.g. order_M12345 from Razorpay
    gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }), // e.g. pay_M12345
    amount: bigint("amount", { mode: "number" }).notNull(), // in Paise
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // NOT_STARTED, PENDING, AUTHORIZED, CAPTURED, FAILED, CANCELLED, REFUND_PENDING, REFUNDED, PARTIALLY_REFUNDED
    paymentMethod: varchar("payment_method", { length: 50 }).default("UNKNOWN"), // UPI, CARD, NETBANKING, WALLET, COD, UNKNOWN
    failureReason: text("failure_reason"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payments_store_id").on(table.storeId),
    index("idx_payments_order_id").on(table.orderId),
    index("idx_payments_gateway_order").on(table.gatewayOrderId),
    index("idx_payments_gateway_payment").on(table.gatewayPaymentId),
    index("idx_payments_idempotency").on(table.storeId, table.idempotencyKey),
    index("idx_payments_status").on(table.storeId, table.status),
  ]
);

/**
 * Domain 7: Payment Attempts
 * Granular audit trail of individual attempts to pay for an order (supporting retries without duplicate orders).
 */
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    gateway: varchar("gateway", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("INITIATED"), // INITIATED, SUCCESS, FAILED
    gatewayOrderId: varchar("gateway_order_id", { length: 255 }),
    gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
    rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payment_attempts_payment_id").on(table.paymentId),
    index("idx_payment_attempts_store_id").on(table.storeId),
  ]
);

/**
 * Domain 7: Webhook Events
 * Durable, append-only webhook ledger guaranteeing deduplication and idempotent processing.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 50 }).notNull(), // RAZORPAY, CASHFREE, SHIPROCKET, DELHIVERY
    eventId: varchar("event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("UNSEEN"), // UNSEEN, PROCESSING, PROCESSED, FAILED
    attemptCount: integer("attempt_count").notNull().default(0),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    processingError: text("processing_error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_webhook_events_provider_event").on(table.provider, table.eventId),
    index("idx_webhook_events_status").on(table.status),
    index("idx_webhook_events_received_at").on(table.receivedAt),
  ]
);

export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type NewPaymentAccount = typeof paymentAccounts.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

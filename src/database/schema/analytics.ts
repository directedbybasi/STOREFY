import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";

export type AnalyticsEventName =
  | "page_view"
  | "product_view"
  | "collection_view"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "checkout_completed"
  | "payment_started"
  | "payment_failed"
  | "payment_success"
  | "order_created"
  | "order_cancelled"
  | "order_delivered"
  | "refund_created"
  | "coupon_applied"
  | "coupon_redeemed"
  | "review_submitted"
  | "whatsapp_clicked";

/**
 * Domain 11: Analytics Events
 * Store-scoped, privacy-conscious event foundation.
 * Note: Authoritative financial metrics derive from orders/payments, not client events.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 100 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    eventName: varchar("event_name", { length: 100 }).$type<AnalyticsEventName>().notNull(),
    resourceType: varchar("resource_type", { length: 50 }), // product, collection, page, order, coupon
    resourceId: varchar("resource_id", { length: 100 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    utmContent: varchar("utm_content", { length: 100 }),
    utmTerm: varchar("utm_term", { length: 100 }),
    referrer: text("referrer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_analytics_events_store_time").on(table.storeId, table.createdAt),
    index("idx_analytics_events_store_name").on(table.storeId, table.eventName, table.createdAt),
    index("idx_analytics_events_session").on(table.storeId, table.sessionId),
  ]
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

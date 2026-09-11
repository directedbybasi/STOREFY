import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

export interface SegmentCondition {
  field:
    | "totalSpent"
    | "ordersCount"
    | "aov"
    | "lastOrderDaysAgo"
    | "firstOrderDaysAgo"
    | "refundCount"
    | "tag"
    | "state"
    | "city"
    | "marketingConsent";
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
  value: unknown;
}

/**
 * Domain 15: Customer Segments
 * Dynamic condition-based customer cohort definitions.
 */
export const customerSegments = pgTable(
  "customer_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    conditions: jsonb("conditions").$type<SegmentCondition[]>().notNull().default([]),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_segments_store").on(table.storeId),
  ]
);

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type NewCustomerSegment = typeof customerSegments.$inferInsert;

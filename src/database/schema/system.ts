import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * System Health & Infrastructure Tracking Table (Phase 1 Baseline)
 */
export const systemHealth = pgTable("system_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  component: varchar("component", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("HEALTHY"),
  environment: varchar("environment", { length: 50 }).notNull(),
  metadata: text("metadata"),
  isOperational: boolean("is_operational").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

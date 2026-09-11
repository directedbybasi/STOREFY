import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
  value: unknown;
}

export interface AutomationActionStep {
  type:
    | "send_email"
    | "send_sms"
    | "send_push"
    | "create_store_credit"
    | "add_loyalty_points"
    | "apply_customer_tag"
    | "add_customer_segment"
    | "send_in_app_notification";
  params: Record<string, unknown>;
}

/**
 * Domain 15: Automations
 * Merchant-configurable event-driven automation rules.
 */
export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
    conditions: jsonb("conditions").$type<AutomationCondition[]>().notNull().default([]),
    actions: jsonb("actions").$type<AutomationActionStep[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    executionCount: integer("execution_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_automations_store_id").on(table.storeId),
    index("idx_automations_store_trigger").on(table.storeId, table.triggerEvent, table.isActive),
  ]
);

/**
 * Domain 15: Automation Runs
 * Historical audit log of each automation execution.
 */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 100 }),
    triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // SUCCESS, FAILED, SKIPPED, RUNNING
    errorDetails: text("error_details"),
    executionTrace: jsonb("execution_trace").$type<Record<string, unknown>>().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_automation_runs_store_id").on(table.storeId),
    index("idx_automation_runs_automation_id").on(table.automationId),
    index("idx_automation_runs_status").on(table.storeId, table.status),
    index("idx_automation_runs_created").on(table.storeId, table.startedAt),
  ]
);

/**
 * Domain 15: Automation Events
 * Queue & history of fired events with idempotency tracking.
 */
export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    eventName: varchar("event_name", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_automation_events_store_id").on(table.storeId),
    index("idx_automation_events_idempotency").on(table.storeId, table.idempotencyKey),
    index("idx_automation_events_unprocessed").on(table.storeId, table.processedAt),
  ]
);

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type NewAutomationRun = typeof automationRuns.$inferInsert;
export type AutomationEvent = typeof automationEvents.$inferSelect;
export type NewAutomationEvent = typeof automationEvents.$inferInsert;

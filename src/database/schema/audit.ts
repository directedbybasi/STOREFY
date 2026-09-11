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

export type AuditActorType = "USER" | "CUSTOMER" | "SYSTEM" | "AUTOMATION";

/**
 * Domain 15: Audit Logs (Centralized Audit Center)
 * Append-only immutable ledger capturing all critical business changes across STOREFY.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id"),
    actorType: varchar("actor_type", { length: 50 })
      .$type<AuditActorType>()
      .notNull()
      .default("USER"),
    event: varchar("event", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }),
    beforeSummary: jsonb("before_summary").$type<Record<string, unknown> | null>(),
    afterSummary: jsonb("after_summary").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_store_created").on(table.storeId, table.createdAt),
    index("idx_audit_logs_store_entity").on(table.storeId, table.entityType, table.entityId),
    index("idx_audit_logs_store_event").on(table.storeId, table.event),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

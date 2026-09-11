import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Phase 16: Data Export Jobs
 */
export const dataExportJobs = pgTable(
  "data_export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // products, customers, orders, inventory, content, all
    format: varchar("format", { length: 10 }).notNull().default("JSON"), // JSON, CSV
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
    downloadTokenHash: varchar("download_token_hash", { length: 255 }),
    downloadExpiresAt: timestamp("download_expires_at", { withTimezone: true }),
    rowCount: integer("row_count").notNull().default(0),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).default(0),
    exportDataPayload: text("export_data_payload"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_data_export_store_id").on(table.storeId),
    index("idx_data_export_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Data Import Jobs
 */
export const dataImportJobs = pgTable(
  "data_import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // products, customers, inventory
    format: varchar("format", { length: 10 }).notNull().default("JSON"), // JSON, CSV
    status: varchar("status", { length: 50 }).notNull().default("UPLOADED"), // UPLOADED, VALIDATED, CONFIRMED, PROCESSING, COMPLETED, FAILED
    totalRows: integer("total_rows").notNull().default(0),
    validRows: integer("valid_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    validationErrors: jsonb("validation_errors").$type<Record<string, unknown>[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_data_import_store_id").on(table.storeId),
    index("idx_data_import_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Platform Migration Jobs
 */
export const migrationJobs = pgTable(
  "migration_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sourcePlatform: varchar("source_platform", { length: 50 })
      .notNull()
      .default("SHOPIFY"), // SHOPIFY, WOOCOMMERCE, CUSTOM_JSON
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"), // DRAFT, MAPPING, TRANSFORMING, COMPLETED, FAILED
    mappingConfig: jsonb("mapping_config").$type<Record<string, unknown>>().default({}),
    errors: jsonb("errors").$type<Record<string, unknown>[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_migration_jobs_store_id").on(table.storeId),
    index("idx_migration_jobs_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Store Backup & Metadata Snapshot Jobs
 */
export const backupJobs = pgTable(
  "backup_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    backupType: varchar("backup_type", { length: 50 })
      .notNull()
      .default("METADATA_SNAPSHOT"), // METADATA_SNAPSHOT, STORE_EXPORT
    status: varchar("status", { length: 50 }).notNull().default("REQUESTED"), // REQUESTED, RUNNING, COMPLETED, FAILED, EXPIRED
    snapshotMetadata: jsonb("snapshot_metadata").$type<Record<string, unknown>>().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_backup_jobs_store_id").on(table.storeId),
    index("idx_backup_jobs_status").on(table.storeId, table.status),
  ]
);

export type DataExportJob = typeof dataExportJobs.$inferSelect;
export type NewDataExportJob = typeof dataExportJobs.$inferInsert;
export type DataImportJob = typeof dataImportJobs.$inferSelect;
export type NewDataImportJob = typeof dataImportJobs.$inferInsert;
export type MigrationJob = typeof migrationJobs.$inferSelect;
export type NewMigrationJob = typeof migrationJobs.$inferInsert;
export type BackupJob = typeof backupJobs.$inferSelect;
export type NewBackupJob = typeof backupJobs.$inferInsert;

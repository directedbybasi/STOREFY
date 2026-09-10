import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Domain 2: Store Themes (Visual configurations, color palettes, typography, spacing tokens)
 */
export const storeThemes = pgTable(
  "store_themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    settingsSchema: jsonb("settings_schema").notNull().default({}),
    draftSettings: jsonb("draft_settings").notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_themes_store_id").on(table.storeId),
  ]
);

/**
 * Domain 2: Theme Versions (Immutable historical snapshots for audit and rollback)
 */
export const themeVersions = pgTable(
  "theme_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => storeThemes.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    snapshotAst: jsonb("snapshot_ast").notNull(),
    createdBy: uuid("created_by"),
    commitMessage: varchar("commit_message", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_theme_versions_theme_id").on(table.themeId),
    index("idx_theme_versions_store_id").on(table.storeId),
  ]
);

export type StoreTheme = typeof storeThemes.$inferSelect;
export type NewStoreTheme = typeof storeThemes.$inferInsert;
export type ThemeVersion = typeof themeVersions.$inferSelect;
export type NewThemeVersion = typeof themeVersions.$inferInsert;

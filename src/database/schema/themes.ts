import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_themes_store_id").on(table.storeId),
  ]
);

export type StoreTheme = typeof storeThemes.$inferSelect;
export type NewStoreTheme = typeof storeThemes.$inferInsert;

import { pgTable, uuid, varchar, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  order: number;
  target?: "_self" | "_blank";
}

/**
 * Domain 2: Navigation (Hierarchical menu links for headers and footers)
 */
export const navigation = pgTable(
  "navigation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    handle: varchar("handle", { length: 100 }).notNull(), // 'main', 'footer'
    items: jsonb("items").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_navigation_store_id").on(table.storeId),
    uniqueIndex("idx_navigation_store_handle").on(table.storeId, table.handle),
  ]
);

export type Navigation = typeof navigation.$inferSelect;
export type NewNavigation = typeof navigation.$inferInsert;

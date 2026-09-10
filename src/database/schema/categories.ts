import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Domain 3: Categories
 * Hierarchical category tree strictly scoped to a store.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"), // Self-referencing parent category for nesting
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_categories_store_slug").on(table.storeId, table.slug),
    index("idx_categories_store_id").on(table.storeId),
    index("idx_categories_parent_id").on(table.parentId),
  ]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

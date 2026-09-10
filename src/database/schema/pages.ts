import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { storeThemes } from "./themes";

/**
 * Domain 2: Pages (Theme-routed documents: Home, Products, Collections, About, Contact, Custom)
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themeId: uuid("theme_id").references(() => storeThemes.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    pageType: varchar("page_type", { length: 50 }).notNull().default("CUSTOM"), // HOME, PRODUCTS, COLLECTIONS, ABOUT, CONTACT, CUSTOM
    isPublished: boolean("is_published").notNull().default(true),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    content: jsonb("content").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_pages_store_id").on(table.storeId),
    uniqueIndex("idx_pages_store_slug").on(table.storeId, table.slug),
  ]
);

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

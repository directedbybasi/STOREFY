import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Phase 16: CMS Pages
 */
export const cmsPages = pgTable(
  "cms_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    contentHtml: text("content_html").notNull().default(""),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"), // DRAFT, PUBLISHED, ARCHIVED
    author: varchar("author", { length: 255 }),
    language: varchar("language", { length: 10 }).notNull().default("en"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cms_pages_store_slug_lang").on(
      table.storeId,
      table.slug,
      table.language
    ),
    index("idx_cms_pages_store_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Merchant Blog Posts
 */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    excerpt: text("excerpt"),
    contentHtml: text("content_html").notNull().default(""),
    featuredImageUrl: text("featured_image_url"),
    author: varchar("author", { length: 255 }),
    category: varchar("category", { length: 100 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"), // DRAFT, PUBLISHED, ARCHIVED
    language: varchar("language", { length: 10 }).notNull().default("en"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_blog_posts_store_slug_lang").on(
      table.storeId,
      table.slug,
      table.language
    ),
    index("idx_blog_posts_store_status").on(table.storeId, table.status),
    index("idx_blog_posts_category").on(table.storeId, table.category),
  ]
);

export type CmsPage = typeof cmsPages.$inferSelect;
export type NewCmsPage = typeof cmsPages.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./products";
import { orders, orderItems } from "./orders";
import { customers } from "./customers";
import { users } from "./users";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

/**
 * Domain 11: Product Reviews
 * Customer reviews with 1-5 star ratings, server-authoritative verified buyer state,
 * and strict moderation states.
 */
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(), // 1 to 5
    title: varchar("title", { length: 255 }),
    body: text("body").notNull(),
    authorName: varchar("author_name", { length: 255 }).notNull(), // Display name (privacy safe, e.g. "Vikram R.")
    authorEmail: varchar("author_email", { length: 255 }), // Stored privately, never exposed in public queries
    verifiedBuyer: boolean("verified_buyer").notNull().default(false), // Server authoritative
    status: varchar("status", { length: 50 }).$type<ReviewStatus>().notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_product_reviews_product_status").on(table.storeId, table.productId, table.status),
    index("idx_product_reviews_customer_product").on(table.storeId, table.customerId, table.productId),
    index("idx_product_reviews_email_product").on(table.storeId, table.authorEmail, table.productId),
    index("idx_product_reviews_status").on(table.storeId, table.status),
    index("idx_product_reviews_created_at").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 11: Review Moderation Audit
 * Append-only immutable log of merchant actions on customer reviews.
 */
export const reviewModerationAudit = pgTable(
  "review_moderation_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    moderatorUserId: uuid("moderator_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // APPROVE, REJECT, HIDE
    previousStatus: varchar("previous_status", { length: 50 }).$type<ReviewStatus>(),
    newStatus: varchar("new_status", { length: 50 }).$type<ReviewStatus>().notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_review_moderation_review_id").on(table.reviewId),
    index("idx_review_moderation_store_id").on(table.storeId),
  ]
);

export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;
export type ReviewModerationAudit = typeof reviewModerationAudit.$inferSelect;
export type NewReviewModerationAudit = typeof reviewModerationAudit.$inferInsert;

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { customers } from "./customers";
import { users } from "./users";

export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP";
export type NotificationDeliveryStatus =
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

/**
 * Domain 15: Notification Templates
 */
export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 100 }).notNull(),
    channel: varchar("channel", { length: 50 }).$type<NotificationChannel>().notNull(),
    subject: varchar("subject", { length: 255 }),
    bodyTemplate: text("body_template").notNull(),
    variables: jsonb("variables").$type<string[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_notification_templates_code").on(table.storeId, table.code, table.channel),
    index("idx_notification_templates_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Notification Preferences (Customer consent & opt-in/opt-out)
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    emailOptIn: boolean("email_opt_in").notNull().default(true),
    smsOptIn: boolean("sms_opt_in").notNull().default(true),
    pushOptIn: boolean("push_opt_in").notNull().default(false),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    transactionalRequired: boolean("transactional_required").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_notification_prefs_customer").on(table.storeId, table.customerId),
    index("idx_notification_prefs_store").on(table.storeId),
  ]
);

/**
 * Domain 15: Notification Deliveries (Audit & Delivery Queue)
 */
export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    channel: varchar("channel", { length: 50 }).$type<NotificationChannel>().notNull(),
    templateCode: varchar("template_code", { length: 100 }),
    subject: varchar("subject", { length: 255 }),
    content: text("content").notNull(),
    status: varchar("status", { length: 50 })
      .$type<NotificationDeliveryStatus>()
      .notNull()
      .default("QUEUED"),
    error: text("error"),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notification_deliveries_store").on(table.storeId),
    index("idx_notification_deliveries_status").on(table.storeId, table.status),
    index("idx_notification_deliveries_channel").on(table.storeId, table.channel),
    index("idx_notification_deliveries_created").on(table.storeId, table.createdAt),
  ]
);

/**
 * Domain 15: In-App Notifications (Merchant & Admin Bell Icon)
 */
export const inAppNotifications = pgTable(
  "in_app_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_in_app_notifications_store_user").on(table.storeId, table.userId, table.isRead),
    index("idx_in_app_notifications_created").on(table.storeId, table.createdAt),
  ]
);

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery = typeof notificationDeliveries.$inferInsert;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type NewInAppNotification = typeof inAppNotifications.$inferInsert;

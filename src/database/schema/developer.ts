import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { users } from "./users";

/**
 * Phase 16: Developer OAuth Applications
 */
export const developerApps = pgTable(
  "developer_apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    clientId: varchar("client_id", { length: 100 }).notNull(),
    clientSecretHash: varchar("client_secret_hash", { length: 255 }).notNull(),
    redirectUris: jsonb("redirect_uris").$type<string[]>().notNull().default([]),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, REVOKED
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_developer_apps_client_id").on(table.clientId),
    index("idx_developer_apps_store_id").on(table.storeId),
  ]
);

/**
 * Phase 16: Scoped Merchant API Keys
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 20 }).notNull(), // e.g. "sfy_live_a1b2"
    keyHash: varchar("key_hash", { length: 255 }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_api_keys_hash").on(table.keyHash),
    index("idx_api_keys_store_id").on(table.storeId),
    index("idx_api_keys_prefix").on(table.keyPrefix),
  ]
);

/**
 * Phase 16: OAuth Authorizations & Grants
 */
export const oauthAuthorizations = pgTable(
  "oauth_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => developerApps.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    codeHash: varchar("code_hash", { length: 255 }),
    codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
    accessTokenHash: varchar("access_token_hash", { length: 255 }),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_oauth_auth_store_app").on(table.storeId, table.appId),
    index("idx_oauth_auth_access_token").on(table.accessTokenHash),
    index("idx_oauth_auth_code").on(table.codeHash),
  ]
);

/**
 * Phase 16: Outbound Merchant Webhook Endpoints
 */
export const merchantWebhookEndpoints = pgTable(
  "merchant_webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    description: varchar("description", { length: 255 }),
    eventTypes: jsonb("event_types").$type<string[]>().notNull().default([]),
    secretKeyHash: varchar("secret_key_hash", { length: 255 }).notNull(),
    secretPreview: varchar("secret_preview", { length: 20 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, DISABLED
    failureCount: integer("failure_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_merchant_webhooks_store_id").on(table.storeId),
    index("idx_merchant_webhooks_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Merchant Webhook Delivery Records
 */
export const merchantWebhookDeliveries = pgTable(
  "merchant_webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => merchantWebhookEndpoints.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    signature: varchar("signature", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, DELIVERED, FAILED
    responseStatusCode: integer("response_status_code"),
    responseBodySnippet: text("response_body_snippet"),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_webhook_deliveries_store_id").on(table.storeId),
    index("idx_webhook_deliveries_endpoint").on(table.endpointId),
    index("idx_webhook_deliveries_status").on(table.storeId, table.status),
  ]
);

/**
 * Phase 16: Apps & Extensions Installation Foundation
 */
export const appInstallations = pgTable(
  "app_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => developerApps.id, { onDelete: "cascade" }),
    grantedScopes: jsonb("granted_scopes").$type<string[]>().notNull().default([]),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"), // ACTIVE, UNINSTALLED, SUSPENDED
    installedAt: timestamp("installed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    uninstalledAt: timestamp("uninstalled_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_app_installations_store_app").on(table.storeId, table.appId),
    index("idx_app_installations_store_id").on(table.storeId),
  ]
);

export type DeveloperApp = typeof developerApps.$inferSelect;
export type NewDeveloperApp = typeof developerApps.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type OauthAuthorization = typeof oauthAuthorizations.$inferSelect;
export type NewOauthAuthorization = typeof oauthAuthorizations.$inferInsert;
export type MerchantWebhookEndpoint = typeof merchantWebhookEndpoints.$inferSelect;
export type NewMerchantWebhookEndpoint = typeof merchantWebhookEndpoints.$inferInsert;
export type MerchantWebhookDelivery = typeof merchantWebhookDeliveries.$inferSelect;
export type NewMerchantWebhookDelivery = typeof merchantWebhookDeliveries.$inferInsert;
export type AppInstallation = typeof appInstallations.$inferSelect;
export type NewAppInstallation = typeof appInstallations.$inferInsert;

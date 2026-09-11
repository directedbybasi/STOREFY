import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";

export type PlanTier = "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";
export type EntitlementStatus = "ACTIVE" | "TRIAL" | "EXPIRED";

/**
 * Domain 15: Store Entitlements & Subscription Foundation
 * Centralized feature flags and usage limits per store plan.
 */
export const storeEntitlements = pgTable(
  "store_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    planTier: varchar("plan_tier", { length: 50 })
      .$type<PlanTier>()
      .notNull()
      .default("STARTER"),
    features: jsonb("features").$type<Record<string, boolean>>().notNull().default({}),
    quotas: jsonb("quotas").$type<Record<string, number>>().notNull().default({}),
    status: varchar("status", { length: 50 })
      .$type<EntitlementStatus>()
      .notNull()
      .default("ACTIVE"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("idx_store_entitlements_store").on(table.storeId)]
);

export type StoreEntitlement = typeof storeEntitlements.$inferSelect;
export type NewStoreEntitlement = typeof storeEntitlements.$inferInsert;

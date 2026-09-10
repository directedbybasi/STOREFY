import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";

/**
 * Domain 1: Store Domains (Custom domain lifecycle, SSL, verification)
 */
export const storeDomains = pgTable(
  "store_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    isPrimary: boolean("is_primary").notNull().default(false),
    sslStatus: varchar("ssl_status", { length: 50 }).notNull().default("PENDING"), // PENDING, ACTIVE, FAILED
    verificationToken: varchar("verification_token", { length: 255 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_domains_store_id").on(table.storeId),
    index("idx_store_domains_domain").on(table.domain),
  ]
);

export type StoreDomain = typeof storeDomains.$inferSelect;
export type NewStoreDomain = typeof storeDomains.$inferInsert;

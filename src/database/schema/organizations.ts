import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Domain 1: Organizations (Merchant legal entity / Tenant grouping)
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    billingEmail: varchar("billing_email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_organizations_slug").on(table.slug),
  ]
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

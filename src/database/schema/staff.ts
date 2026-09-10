import { pgTable, uuid, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { stores } from "./stores";
import { users } from "./users";
import { roles } from "./rbac";

/**
 * Domain 1: Staff (Organization & Store Membership with Role assignments)
 */
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }), // NULL implies all stores in org
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_staff_org_user_store").on(table.organizationId, table.userId, table.storeId),
    index("idx_staff_organization_id").on(table.organizationId),
    index("idx_staff_user_id").on(table.userId),
    index("idx_staff_store_id").on(table.storeId),
    index("idx_staff_role_id").on(table.roleId),
  ]
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;

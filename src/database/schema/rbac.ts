import { pgTable, uuid, varchar, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

/**
 * Domain 1: Roles
 * Pre-seeded: OWNER, ADMIN, MANAGER, PRODUCT_MANAGER, ORDER_MANAGER, MARKETING_MANAGER, SUPPORT
 */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

/**
 * Domain 1: Permissions
 * Granular module-level access control: module, action, unique code (e.g., 'catalog:write')
 */
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    module: varchar("module", { length: 50 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_permissions_code").on(table.code),
    index("idx_permissions_module").on(table.module),
  ]
);

/**
 * Domain 1: Role Permissions (Many-to-Many join table)
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("idx_role_permissions_role_id").on(table.roleId),
    index("idx_role_permissions_permission_id").on(table.permissionId),
  ]
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;

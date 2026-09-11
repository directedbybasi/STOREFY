import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

dotenv.config({ path: ".env.development" });

// Local table definitions to keep standalone script 100% self-contained
const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: varchar("module", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
});

export const CANONICAL_ROLES = [
  { name: "OWNER", description: "Organization owner with full administrative and billing privileges" },
  { name: "ADMIN", description: "Store administrator managing catalog, orders, settings, and team" },
  { name: "MANAGER", description: "Store manager overseeing day-to-day catalog and order operations" },
  { name: "PRODUCT_MANAGER", description: "Product manager managing catalog, collections, and stock adjustments" },
  { name: "ORDER_MANAGER", description: "Order fulfillment specialist handling shipments, invoices, and returns" },
  { name: "MARKETING_MANAGER", description: "Marketing manager handling coupons, promotions, and banners" },
  { name: "SUPPORT", description: "Support staff with read-only access to customer and order data" },
] as const;

export const CANONICAL_PERMISSIONS = [
  // Catalog
  { module: "catalog", action: "read", code: "catalog:read" },
  { module: "catalog", action: "write", code: "catalog:write" },
  { module: "catalog", action: "publish", code: "catalog:publish" },
  { module: "catalog", action: "delete", code: "catalog:delete" },

  // Inventory
  { module: "inventory", action: "read", code: "inventory:read" },
  { module: "inventory", action: "write", code: "inventory:write" },
  { module: "inventory", action: "adjust", code: "inventory:adjust" },

  // Orders & Fulfillment
  { module: "orders", action: "read", code: "orders:read" },
  { module: "orders", action: "fulfill", code: "orders:fulfill" },
  { module: "orders", action: "refund", code: "orders:refund" },

  // Customers
  { module: "customers", action: "read", code: "customers:read" },
  { module: "customers", action: "write", code: "customers:write" },
  { module: "customers", action: "manage", code: "customers:manage" },
  { module: "customers", action: "delete", code: "customers:delete" },

  // Visual Builder
  { module: "builder", action: "read", code: "builder:read" },
  { module: "builder", action: "write", code: "builder:write" },
  { module: "builder", action: "publish", code: "builder:publish" },

  // Marketing & Coupons
  { module: "marketing", action: "read", code: "marketing:read" },
  { module: "marketing", action: "manage", code: "marketing:manage" },

  // Store Domains & Settings
  { module: "domains", action: "manage", code: "domains:manage" },
  { module: "settings", action: "read", code: "settings:read" },
  { module: "settings", action: "manage", code: "settings:manage" },

  // Staff & RBAC
  { module: "staff", action: "read", code: "staff:read" },
  { module: "staff", action: "manage", code: "staff:manage" },

  // Billing & Subscriptions
  { module: "billing", action: "read", code: "billing:read" },
  { module: "billing", action: "manage", code: "billing:manage" },

  // Analytics
  { module: "analytics", action: "view", code: "analytics:view" },

  // Phase 16: POS & Omnichannel
  { module: "pos", action: "read", code: "pos:read" },
  { module: "pos", action: "write", code: "pos:write" },
  { module: "pos", action: "refund", code: "pos:refund" },

  // Phase 16: B2B Wholesale
  { module: "b2b", action: "read", code: "b2b:read" },
  { module: "b2b", action: "write", code: "b2b:write" },

  // Phase 16: Markets & Global
  { module: "markets", action: "read", code: "markets:read" },
  { module: "markets", action: "write", code: "markets:write" },

  // Phase 16: CMS & Content
  { module: "content", action: "read", code: "content:read" },
  { module: "content", action: "write", code: "content:write" },

  // Phase 16: Developer & API
  { module: "developer", action: "read", code: "developer:read" },
  { module: "developer", action: "write", code: "developer:write" },
  { module: "developer", action: "write", code: "api_keys:write" },
  { module: "developer", action: "write", code: "webhooks:write" },

  // Phase 16: Data Portability
  { module: "portability", action: "read", code: "exports:read" },
  { module: "portability", action: "write", code: "exports:write" },
  { module: "portability", action: "write", code: "imports:write" },
] as const;

export const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  OWNER: CANONICAL_PERMISSIONS.map((p) => p.code),
  ADMIN: [
    "catalog:read", "catalog:write", "catalog:publish", "catalog:delete",
    "inventory:read", "inventory:write", "inventory:adjust",
    "orders:read", "orders:fulfill", "orders:refund",
    "customers:read", "customers:write", "customers:manage", "customers:delete",
    "builder:read", "builder:write", "builder:publish",
    "marketing:read", "marketing:manage",
    "domains:manage",
    "settings:read", "settings:manage",
    "staff:read", "staff:manage",
    "analytics:view",
  ],
  MANAGER: [
    "catalog:read", "catalog:write", "catalog:publish",
    "inventory:read", "inventory:write", "inventory:adjust",
    "orders:read", "orders:fulfill",
    "customers:read", "customers:write",
    "marketing:read",
    "analytics:view",
  ],
  PRODUCT_MANAGER: [
    "catalog:read", "catalog:write", "catalog:publish", "catalog:delete",
    "inventory:read", "inventory:adjust",
    "builder:read",
  ],
  ORDER_MANAGER: [
    "orders:read", "orders:fulfill", "orders:refund",
    "customers:read",
    "inventory:read",
  ],
  MARKETING_MANAGER: [
    "marketing:read", "marketing:manage",
    "catalog:read",
    "builder:read", "builder:write",
    "analytics:view",
  ],
  SUPPORT: [
    "orders:read",
    "customers:read",
    "catalog:read",
  ],
};

export async function seedRbac() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[STOREFY RBAC SEED ERROR] DIRECT_URL or DATABASE_URL must be defined");
  }

  console.log("[STOREFY RBAC SEED] Connecting to hosted database...");
  const sql = postgres(url, {
    max: 1,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : "require",
  });
  const db = drizzle(sql);

  try {
    console.log("[STOREFY RBAC SEED] Seeding canonical roles...");
    for (const role of CANONICAL_ROLES) {
      await db
        .insert(roles)
        .values(role)
        .onConflictDoUpdate({
          target: roles.name,
          set: { description: role.description },
        });
    }

    console.log("[STOREFY RBAC SEED] Seeding canonical permissions...");
    for (const perm of CANONICAL_PERMISSIONS) {
      await db
        .insert(permissions)
        .values(perm)
        .onConflictDoUpdate({
          target: permissions.code,
          set: { module: perm.module, action: perm.action },
        });
    }

    const allRoles = await db.select().from(roles);
    const allPerms = await db.select().from(permissions);

    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
    const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

    console.log("[STOREFY RBAC SEED] Mapping role-permission assignments...");
    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSION_MATRIX)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      for (const code of permCodes) {
        const permId = permMap.get(code);
        if (!permId) continue;

        await db
          .insert(rolePermissions)
          .values({ roleId, permissionId: permId })
          .onConflictDoNothing();
      }
    }

    console.log("[STOREFY RBAC SEED] RBAC roles and permissions successfully seeded to hosted database.");
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && process.argv[1].includes("rbac-seed")) {
  seedRbac()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[STOREFY RBAC SEED ERROR]", err);
      process.exit(1);
    });
}

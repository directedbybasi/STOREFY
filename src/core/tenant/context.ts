import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { db } from "../../database/client";
import { users, organizations, stores, staff, roles, rolePermissions, permissions } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "../errors";
import type { TenantContext, AccountContext } from "./types";

// In-memory cache for the system permission catalog (60s TTL)
let cachedAllPermissions: Set<string> | null = null;
let cachedAllPermissionsExpiresAt = 0;

/**
 * Request-memoized helper to fetch stores for an organization.
 * Deduplicates multiple queries across layout and page components within a single request.
 */
export const getOrgStores = cache(async (organizationId: string) => {
  return db
    .select()
    .from(stores)
    .where(eq(stores.organizationId, organizationId));
});

/**
 * Resolves the authenticated merchant's user account and organization context.
 * Strictly verifies identity and staff membership at the organization level.
 * Wrapped with React cache() to guarantee request-scoped execution (deduplicated across layout and pages).
 */
export const getAccountContext = cache(async (): Promise<AccountContext> => {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new UnauthorizedError("Authentication required to access merchant resources");
  }

  // Parallelize user lookup and active staff membership lookup
  const [userQuery, staffList] = await Promise.all([
    db.select().from(users).where(eq(users.id, authUser.id)).limit(1),
    db
      .select({
        staff: staff,
        organization: organizations,
        role: roles,
      })
      .from(staff)
      .innerJoin(organizations, eq(staff.organizationId, organizations.id))
      .innerJoin(roles, eq(staff.roleId, roles.id))
      .where(and(eq(staff.userId, authUser.id), eq(staff.isActive, true))),
  ]);

  let dbUser = userQuery[0];

  if (!dbUser) {
    const [insertedUser] = await db
      .insert(users)
      .values({
        id: authUser.id,
        email: authUser.email || "",
        fullName: (authUser.user_metadata?.full_name as string) || null,
        avatarUrl: (authUser.user_metadata?.avatar_url as string) || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: authUser.email || "", updatedAt: new Date() },
      })
      .returning();
    dbUser = insertedUser;
  }

  if (!staffList || staffList.length === 0) {
    throw new ForbiddenError("You do not have staff access to any organization");
  }

  const activeStaff = staffList[0];
  const isOwner = activeStaff.role.name === "OWNER";
  let permissionSet = new Set<string>();

  if (isOwner || dbUser.isPlatformAdmin) {
    const now = Date.now();
    if (cachedAllPermissions && now < cachedAllPermissionsExpiresAt) {
      permissionSet = cachedAllPermissions;
    } else {
      const allPerms = await db.select({ code: permissions.code }).from(permissions);
      permissionSet = new Set(allPerms.map((p) => p.code));
      cachedAllPermissions = permissionSet;
      cachedAllPermissionsExpiresAt = now + 60_000;
    }
  } else {
    const rolePerms = await db
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, activeStaff.role.id));
    permissionSet = new Set(rolePerms.map((p) => p.code));
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      avatarUrl: dbUser.avatarUrl,
      isPlatformAdmin: dbUser.isPlatformAdmin,
    },
    organization: {
      id: activeStaff.organization.id,
      name: activeStaff.organization.name,
      slug: activeStaff.organization.slug,
      billingEmail: activeStaff.organization.billingEmail,
    },
    staff: {
      id: activeStaff.staff.id,
      roleId: activeStaff.staff.roleId,
      isActive: activeStaff.staff.isActive,
    },
    role: {
      id: activeStaff.role.id,
      name: activeStaff.role.name,
    },
    permissions: permissionSet,
    isOwner,
  };
});

/**
 * Resolves active tenant context for store-scoped operations.
 * Independently validates staff membership and access to targetStoreId.
 * Wrapped with React cache() for request-level memoization.
 */
export const getTenantContext = cache(async (targetStoreId?: string): Promise<TenantContext> => {
  const account = await getAccountContext();

  const cookieStore = await cookies();
  const headerStore = await headers();
  const resolvedStoreId =
    targetStoreId ||
    headerStore.get("x-store-id") ||
    cookieStore.get("storefy_active_store_id")?.value;

  // Query stores for this organization via memoized helper
  const orgStores = await getOrgStores(account.organization.id);

  if (!orgStores || orgStores.length === 0) {
    throw new NotFoundError("Store", resolvedStoreId || "active");
  }

  let matchingStore: typeof stores.$inferSelect | undefined;
  if (resolvedStoreId) {
    matchingStore = orgStores.find((s) => s.id === resolvedStoreId);
    if (!matchingStore) {
      throw new NotFoundError("Store", resolvedStoreId);
    }
  } else {
    matchingStore = orgStores.find((s) => s.isActive) || orgStores[0];
  }

  if (!matchingStore) {
    throw new NotFoundError("Store", "active");
  }

  return {
    ...account,
    store: {
      id: matchingStore.id,
      organizationId: matchingStore.organizationId,
      name: matchingStore.name,
      slug: matchingStore.slug,
      subdomain: matchingStore.subdomain,
      customDomain: matchingStore.customDomain,
      currency: matchingStore.currency,
      timezone: matchingStore.timezone,
      isActive: matchingStore.isActive,
    },
  };
});

/**
 * Resolves optional tenant context for dashboard shells and general views.
 * If the organization has zero stores, returns tenant as null while providing
 * the verified account context.
 * Wrapped with React cache() for request-level memoization.
 */
export const getOptionalTenantContext = cache(async (targetStoreId?: string): Promise<{
  account: AccountContext;
  tenant: TenantContext | null;
}> => {
  const account = await getAccountContext();

  const cookieStore = await cookies();
  const headerStore = await headers();
  const resolvedStoreId =
    targetStoreId ||
    headerStore.get("x-store-id") ||
    cookieStore.get("storefy_active_store_id")?.value;

  // Query stores for this organization via memoized helper
  const orgStores = await getOrgStores(account.organization.id);

  if (!orgStores || orgStores.length === 0) {
    return { account, tenant: null };
  }

  let matchingStore: typeof stores.$inferSelect | undefined;
  if (resolvedStoreId) {
    matchingStore = orgStores.find((s) => s.id === resolvedStoreId);
  }
  if (!matchingStore) {
    matchingStore = orgStores.find((s) => s.isActive) || orgStores[0];
  }

  if (!matchingStore) {
    return { account, tenant: null };
  }

  const tenant: TenantContext = {
    ...account,
    store: {
      id: matchingStore.id,
      organizationId: matchingStore.organizationId,
      name: matchingStore.name,
      slug: matchingStore.slug,
      subdomain: matchingStore.subdomain,
      customDomain: matchingStore.customDomain,
      currency: matchingStore.currency,
      timezone: matchingStore.timezone,
      isActive: matchingStore.isActive,
    },
  };

  return { account, tenant };
});


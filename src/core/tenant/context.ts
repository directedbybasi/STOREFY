import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { db } from "../../database/client";
import { users, organizations, stores, staff, roles, rolePermissions, permissions } from "../../database/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "../errors";
import type { TenantContext } from "./types";

/**
 * Resolves the active authenticated user and strictly verifies their tenant context.
 *
 * CRITICAL ZERO-TRUST SECURITY INVARIANT:
 * Client-provided store IDs or headers (x-store-id, cookies) are NEVER trusted blindly.
 * The server must independently verify in the hosted database that the authenticated user
 * has an active staff record granting membership to the target store.
 */
export async function getTenantContext(targetStoreId?: string): Promise<TenantContext> {
  // 1. Authenticate user from secure cookie session
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new UnauthorizedError("Authentication required to access this merchant resource");
  }

  // 2. Fetch or sync user from public.users table
  let [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

  if (!dbUser) {
    // Fallback sync if trigger had not fired yet
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

  // 3. Resolve target store ID
  const cookieStore = await cookies();
  const headerStore = await headers();

  const resolvedStoreId =
    targetStoreId ||
    headerStore.get("x-store-id") ||
    cookieStore.get("storefy_active_store_id")?.value;

  // 4. Query staff memberships for this user
  // If a specific store was requested, verify access to that specific store
  const staffQuery = db
    .select({
      staff: staff,
      organization: organizations,
      store: stores,
      role: roles,
    })
    .from(staff)
    .innerJoin(organizations, eq(staff.organizationId, organizations.id))
    .leftJoin(
      stores,
      resolvedStoreId
        ? eq(stores.id, resolvedStoreId)
        : eq(stores.organizationId, organizations.id)
    )
    .innerJoin(roles, eq(staff.roleId, roles.id))
    .where(
      and(
        eq(staff.userId, dbUser.id),
        eq(staff.isActive, true),
        // If staff.storeId is specified, it must match the resolved store, or be NULL (all stores in org)
        resolvedStoreId
          ? or(isNull(staff.storeId), eq(staff.storeId, resolvedStoreId))
          : undefined
      )
    );

  const memberships = await staffQuery;

  if (!memberships || memberships.length === 0) {
    throw new ForbiddenError("You do not have authorized staff access to any store or organization");
  }

  // Find the exact matching store membership
  const activeMembership = resolvedStoreId
    ? memberships.find((m) => m.store?.id === resolvedStoreId)
    : memberships.find((m) => m.store !== null) || memberships[0];

  if (!activeMembership || !activeMembership.store) {
    throw new NotFoundError("Store", resolvedStoreId || "active");
  }

  // Double-check store organization alignment
  if (activeMembership.store.organizationId !== activeMembership.organization.id) {
    throw new ForbiddenError("Security violation: Store does not belong to active organization");
  }

  // 5. Resolve permissions
  const isOwner = activeMembership.role.name === "OWNER";
  let permissionSet = new Set<string>();

  if (isOwner || dbUser.isPlatformAdmin) {
    // Owner / Platform Admin has all permissions
    const allPerms = await db.select({ code: permissions.code }).from(permissions);
    permissionSet = new Set(allPerms.map((p) => p.code));
  } else {
    // Fetch assigned permissions via role_permissions
    const rolePerms = await db
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, activeMembership.role.id));

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
      id: activeMembership.organization.id,
      name: activeMembership.organization.name,
      slug: activeMembership.organization.slug,
      billingEmail: activeMembership.organization.billingEmail,
    },
    store: {
      id: activeMembership.store.id,
      organizationId: activeMembership.store.organizationId,
      name: activeMembership.store.name,
      slug: activeMembership.store.slug,
      subdomain: activeMembership.store.subdomain,
      customDomain: activeMembership.store.customDomain,
      currency: activeMembership.store.currency,
      timezone: activeMembership.store.timezone,
      isActive: activeMembership.store.isActive,
    },
    staff: {
      id: activeMembership.staff.id,
      roleId: activeMembership.staff.roleId,
      isActive: activeMembership.staff.isActive,
    },
    role: {
      id: activeMembership.role.id,
      name: activeMembership.role.name,
    },
    permissions: permissionSet,
    isOwner,
  };
}

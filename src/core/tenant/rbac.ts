import { cache } from "react";
import { ForbiddenError } from "../errors";
import { getTenantContext } from "./context";
import type { TenantContext } from "./types";

/**
 * Server-side RBAC Permission Guard.
 * Strictly verifies authenticated user's assigned role and module permissions for the target store.
 * Wrapped with React cache() to guarantee request-scoped deduplication.
 *
 * ZERO-TRUST INVARIANT:
 * 1. Identifies the authenticated user via secure session cookies.
 * 2. Resolves staff membership in the specified store/organization.
 * 3. Checks whether the staff member possesses the requested permission code.
 * 4. Bypasses for platform superadmins and organization OWNERs (who possess all permissions).
 * 5. Rejects unauthorized access with an explicit ForbiddenError.
 */
export const requirePermission = cache(async (
  permissionCode: string,
  targetStoreId?: string
): Promise<TenantContext> => {
  const ctx = await getTenantContext(targetStoreId);

  // Platform superadmin bypass
  if (ctx.user.isPlatformAdmin) {
    return ctx;
  }

  // Organization OWNER has full administrative rights across the entire organization
  if (ctx.isOwner) {
    return ctx;
  }

  // Module permission check
  if (!ctx.permissions.has(permissionCode)) {
    throw new ForbiddenError(
      `Access denied: Missing required permission '${permissionCode}' for store ${ctx.store.name} (${ctx.store.id})`
    );
  }

  return ctx;
});

/**
 * Pure helper to verify if a given permission set contains the specified permission.
 */
export function hasPermission(
  permissionCodes: Set<string> | string[],
  requiredPermission: string,
  isOwner = false,
  isPlatformAdmin = false
): boolean {
  if (isPlatformAdmin || isOwner) {
    return true;
  }
  const set = permissionCodes instanceof Set ? permissionCodes : new Set(permissionCodes);
  return set.has(requiredPermission);
}

import { cache } from "react";
import { ForbiddenError } from "../errors";
import { getTenantContext, getAccountContext } from "./context";
import type { TenantContext, AccountContext } from "./types";

/**
 * Server-side Platform Admin Authorization Guard.
 * Strictly verifies the authenticated user possesses the isPlatformAdmin flag.
 * Platform Admin is NOT a merchant staff role and cannot be forged from browser input.
 */
export const requirePlatformAdmin = cache(async (): Promise<AccountContext> => {
  const account = await getAccountContext();

  if (!account.user.isPlatformAdmin) {
    throw new ForbiddenError(
      "Platform Admin authorization required. Merchant accounts cannot access platform administration."
    );
  }

  return account;
});

/**
 * Server-side Supplier Capability Guard.
 * Verifies that the merchant organization is configured as a SUPPLIER.
 * Supplier is an account capability, NOT a separate role or top-level account.
 */
export const requireSupplierCapability = cache(async (
  targetStoreId?: string
): Promise<TenantContext> => {
  const ctx = await getTenantContext(targetStoreId);

  // Platform superadmin bypass
  if (ctx.user.isPlatformAdmin) {
    return ctx;
  }

  if (!ctx.capabilities.has("SUPPLIER")) {
    throw new ForbiddenError(
      `Access denied: Organization '${ctx.organization.name}' does not possess the Supplier capability. Standard merchants cannot access supplier operations.`
    );
  }

  return ctx;
});

/**
 * Authorizes a sensitive supplier action under the formula:
 * MERCHANT ROLE + SUPPLIER CAPABILITY + STORE SCOPE = ACTUAL ACCESS
 */
export const authorizeSupplierAction = cache(async (
  permissionCode: string,
  targetStoreId?: string
): Promise<TenantContext> => {
  // 1. Enforce Supplier capability on the merchant organization
  const ctx = await requireSupplierCapability(targetStoreId);

  // Platform superadmin and organization OWNER have full permissions for supplier operations
  if (ctx.user.isPlatformAdmin || ctx.isOwner) {
    return ctx;
  }

  // 2. Enforce granular staff role permission
  if (!ctx.permissions.has(permissionCode)) {
    throw new ForbiddenError(
      `Access denied: Role '${ctx.role.name}' does not have permission '${permissionCode}' for supplier operations.`
    );
  }

  return ctx;
});

/**
 * Server-side RBAC Permission Guard.
 * Strictly verifies authenticated user's assigned role and module permissions for the target store.
 * Wrapped with React cache() to guarantee request-scoped deduplication.
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

  // If operation requires supplier capability, verify organization possesses it first
  if (permissionCode.startsWith("supplier:")) {
    if (!ctx.capabilities.has("SUPPLIER")) {
      throw new ForbiddenError(
        `Access denied: Organization '${ctx.organization.name}' does not possess the Supplier capability.`
      );
    }
  }

  // Organization OWNER has full administrative rights across the organization
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
 * Alias for canonical merchant permission check
 */
export const requireMerchantPermission = requirePermission;

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

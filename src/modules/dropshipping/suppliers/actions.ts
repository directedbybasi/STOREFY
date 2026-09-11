"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { getTenantContext } from "@/core/tenant/context";
import {
  registerSupplier,
  updateSupplierProfile,
  getSupplierProfile,
  getSupplierByOrganization,
  verifySupplier,
  getVerificationAudit,
  listSuppliers,
} from "./supplier-service";
import {
  registerSupplierSchema,
  updateSupplierProfileSchema,
  verifySupplierSchema,
} from "./validation";

/**
 * Register as a supplier — creates PENDING application.
 */
export async function registerSupplierAction(formData: Record<string, unknown>) {
  const ctx = await getTenantContext();
  const input = registerSupplierSchema.parse(formData);
  return registerSupplier(ctx.user.id, ctx.organization.id, input);
}

/**
 * Update supplier profile — only the supplier themselves.
 */
export async function updateSupplierProfileAction(
  supplierId: string,
  formData: Record<string, unknown>
) {
  const ctx = await getTenantContext();
  const input = updateSupplierProfileSchema.parse(formData);
  return updateSupplierProfile(supplierId, ctx.user.id, input);
}

/**
 * Get own supplier profile.
 */
export async function getOwnSupplierProfileAction() {
  const ctx = await getTenantContext();
  return getSupplierByOrganization(ctx.organization.id);
}

/**
 * Get supplier profile by ID — requires supplier:read permission.
 */
export async function getSupplierProfileAction(supplierId: string) {
  await requirePermission("supplier:read");
  return getSupplierProfile(supplierId);
}

/**
 * Platform admin: verify a supplier (approve/reject/suspend/reactivate).
 * Requires supplier:verify permission — ordinary merchants cannot invoke this.
 */
export async function verifySupplierAction(formData: Record<string, unknown>) {
  const ctx = await requirePermission("supplier:verify");
  const input = verifySupplierSchema.parse(formData);
  return verifySupplier(
    input.supplierId,
    ctx.user.id,
    input.action,
    input.reason
  );
}

/**
 * Get verification audit trail for a supplier.
 */
export async function getVerificationAuditAction(supplierId: string) {
  await requirePermission("supplier:read");
  return getVerificationAudit(supplierId);
}

/**
 * List all suppliers — admin/platform operator only.
 */
export async function listSuppliersAction(status?: string) {
  await requirePermission("supplier:read");
  return listSuppliers(status);
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import {
  getSupplierByOrganization,
  updateSupplierProfile,
} from "@/modules/dropshipping/suppliers/supplier-service";
import { updateSupplierProfileSchema } from "@/modules/dropshipping/suppliers/validation";
import { NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/supplier/profile
 * Retrieves authenticated organization's supplier profile.
 */
export async function GET() {
  try {
    const ctx = await requirePermission("supplier:read");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }
    return apiSuccess(supplier);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PUT /api/v1/supplier/profile
 * Updates authenticated organization's supplier profile.
 */
export async function PUT(req: NextRequest) {
  try {
    const ctx = await requirePermission("supplier:write");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const body = await req.json();
    const validated = updateSupplierProfileSchema.parse(body);

    const updated = await updateSupplierProfile(supplier.id, ctx.user.id, validated);
    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}

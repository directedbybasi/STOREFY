import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { importSupplierProduct } from "@/modules/dropshipping/reseller-import/import-service";
import { ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/dropshipping/import
 * Imports a supplier product into the authenticated merchant's store catalog.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("dropshipping:write");

    const body = await req.json();
    const { supplierProductId, overrides } = body;

    if (!supplierProductId) {
      throw new ValidationError("supplierProductId is required.");
    }

    const result = await importSupplierProduct(ctx.store.id, supplierProductId, overrides);
    return apiSuccess(result, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

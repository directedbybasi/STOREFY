import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreMappings } from "@/modules/dropshipping/reseller-import/import-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dropshipping/mappings
 * Lists all imported supplier product mappings for the authenticated merchant's store.
 */
export async function GET() {
  try {
    const ctx = await requirePermission("dropshipping:read");
    const mappings = await getStoreMappings(ctx.store.id);
    return apiSuccess(mappings, { total: mappings.length });
  } catch (err) {
    return apiError(err);
  }
}

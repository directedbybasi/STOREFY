import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { listImportedMeeshoProducts } from "@/modules/marketplaces/import/import-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/meesho/products
 * Lists all imported Meesho products for the current merchant store.
 */
export async function GET() {
  try {
    const ctx = await requirePermission("marketplace:read");
    const products = await listImportedMeeshoProducts(ctx.store.id);

    return apiSuccess(products, { total: products.length });
  } catch (err) {
    return apiError(err);
  }
}

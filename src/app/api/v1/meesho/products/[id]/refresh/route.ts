import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { refreshMeeshoProduct } from "@/modules/marketplaces/import/import-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/meesho/products/[id]/refresh
 * Refreshes source wholesale pricing and availability without overwriting custom merchant pricing.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("marketplace:write");

    const result = await refreshMeeshoProduct(ctx.store.id, id);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

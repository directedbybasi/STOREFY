import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { listMarketplaceOrderTasks } from "@/modules/marketplaces/orders/marketplace-order-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/meesho/orders
 * Lists marketplace fulfillment tasks for the current merchant store.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("marketplace:orders");
    const status = req.nextUrl.searchParams.get("status") || undefined;

    const tasks = await listMarketplaceOrderTasks(ctx.store.id, status);
    return apiSuccess(tasks, { total: tasks.length });
  } catch (err) {
    return apiError(err);
  }
}

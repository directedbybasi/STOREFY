import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { listSupplierOrders } from "@/modules/dropshipping/fulfillment/supplier-fulfillment-service";
import { NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/supplier/orders
 * Lists orders routed to the authenticated supplier.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("supplier:orders");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const url = req.nextUrl;
    const status = url.searchParams.get("status") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const orders = await listSupplierOrders(supplier.id, status, limit, offset);
    return apiSuccess(orders, { limit, page: Math.floor(offset / limit) + 1, total: orders.length });
  } catch (err) {
    return apiError(err);
  }
}

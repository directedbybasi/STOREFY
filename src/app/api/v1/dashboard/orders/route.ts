import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { listStoreOrders } from "@/modules/orders/order-service";
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/modules/orders/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard/orders
 * Merchant order list with filters and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("orders:read");

    const url = req.nextUrl;
    const status = url.searchParams.get("status") as OrderStatus | null;
    const paymentStatus = url.searchParams.get("paymentStatus") as PaymentStatus | null;
    const fulfillmentStatus = url.searchParams.get("fulfillmentStatus") as FulfillmentStatus | null;
    const search = url.searchParams.get("search") || undefined;
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "15", 10);

    const result = await listStoreOrders(ctx.store.id, {
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      fulfillmentStatus: fulfillmentStatus || undefined,
      search,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    return apiSuccess(result.orders, {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return apiError(err);
  }
}

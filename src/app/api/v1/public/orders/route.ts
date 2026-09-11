import { apiSuccess, apiError } from "@/core/api/response";
import { authenticateDeveloperRequest } from "@/core/developer/auth";
import { db } from "@/database/client";
import { orders } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public Developer API: Orders
 * GET /api/v1/public/orders
 * Requires Scope: read_orders
 */
export async function GET() {
  try {
    const authContext = await authenticateDeveloperRequest("read_orders");

    const storeOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        salesChannel: orders.salesChannel,
        currency: orders.currency,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.storeId, authContext.storeId))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    return apiSuccess({
      orders: storeOrders,
      count: storeOrders.length,
    });
  } catch (error) {
    return apiError(error);
  }
}

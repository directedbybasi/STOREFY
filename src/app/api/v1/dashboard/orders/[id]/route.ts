import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getOrderById, cancelOrder } from "@/modules/orders/order-service";
import { CancelOrderSchema } from "@/modules/orders/validation";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/dashboard/orders/[id]
 */
export async function GET(_req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requirePermission("orders:read");
    const { id: orderId } = await params;

    const order = await getOrderById(ctx.store.id, orderId, { isStaff: true });
    return apiSuccess(order);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/v1/dashboard/orders/[id]
 * Cancels order with automatic unfulfilled inventory restock.
 */
export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requirePermission("orders:write");
    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = CancelOrderSchema.parse(body);

    const order = await cancelOrder(ctx.store.id, orderId, parsed.reason, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    return apiSuccess(order);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { updateOrderStatus } from "@/modules/orders/order-service";
import { UpdateOrderStatusSchema } from "@/modules/orders/validation";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/dashboard/orders/[id]/status
 */
export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requirePermission("orders:write");
    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = UpdateOrderStatusSchema.parse(body);

    const order = await updateOrderStatus(ctx.store.id, orderId, parsed.status, parsed.note, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    return apiSuccess(order);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { createFulfillment } from "@/modules/orders/fulfillment-service";
import { CreateFulfillmentSchema } from "@/modules/orders/validation";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/dashboard/orders/[id]/fulfill
 */
export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requirePermission("orders:write");
    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = CreateFulfillmentSchema.parse(body);

    const order = await createFulfillment(ctx.store.id, orderId, parsed, {
      userId: ctx.user.id,
      actorType: "MERCHANT",
    });

    return apiSuccess(order, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getMarketplaceOrderTaskById } from "@/modules/marketplaces/orders/marketplace-order-service";
import {
  recordMeeshoOrderPlaced,
  recordMeeshoTracking,
  recordMeeshoDelivered,
  recordMeeshoRTO,
} from "@/modules/marketplaces/meesho/fulfillment";
import { ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/meesho/orders/[id]
 * Retrieves a single marketplace order task.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("marketplace:orders");

    const task = await getMarketplaceOrderTaskById(ctx.store.id, id);
    return apiSuccess(task);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PUT /api/v1/meesho/orders/[id]
 * Transitions marketplace task status (ORDER_PLACED, ADD_TRACKING, DELIVERED, RTO).
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("marketplace:fulfill");

    const body = await req.json();
    const { action, sourceOrderId, sourceOrderReference, trackingNumber, carrier, notes } = body;

    let updated;
    if (action === "ORDER_PLACED") {
      if (!sourceOrderId) {
        throw new ValidationError("sourceOrderId is required.");
      }
      updated = await recordMeeshoOrderPlaced({
        taskId: id,
        storeId: ctx.store.id,
        sourceOrderId,
        sourceOrderReference,
        notes,
      });
    } else if (action === "ADD_TRACKING") {
      if (!trackingNumber || !carrier) {
        throw new ValidationError("trackingNumber and carrier are required.");
      }
      updated = await recordMeeshoTracking({
        taskId: id,
        storeId: ctx.store.id,
        trackingNumber,
        carrier,
      });
    } else if (action === "DELIVERED") {
      updated = await recordMeeshoDelivered(id, ctx.store.id);
    } else if (action === "RTO") {
      updated = await recordMeeshoRTO(id, ctx.store.id, notes);
    } else {
      throw new ValidationError(
        "Invalid action. Supported: ORDER_PLACED, ADD_TRACKING, DELIVERED, RTO."
      );
    }

    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}

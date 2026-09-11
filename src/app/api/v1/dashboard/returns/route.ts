import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import {
  listStoreReturns,
  reviewReturn,
  receiveReturn,
} from "@/modules/orders/returns-service";
import { ReviewReturnSchema, ReceiveReturnSchema } from "@/modules/orders/validation";
import { ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard/returns
 */
export async function GET() {
  try {
    const ctx = await requirePermission("orders:read");
    const returnsList = await listStoreReturns(ctx.store.id);
    return apiSuccess(returnsList);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PATCH /api/v1/dashboard/returns
 * Handles review (approve/reject) or receive (with restock).
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requirePermission("orders:write");
    const body = await req.json();
    const { returnId, action, ...data } = body;

    if (!returnId) {
      throw new ValidationError("returnId is required.");
    }

    let result;
    if (action === "review") {
      const parsed = ReviewReturnSchema.parse(data);
      result = await reviewReturn(ctx.store.id, returnId, parsed, {
        userId: ctx.user.id,
        actorType: "MERCHANT",
      });
    } else if (action === "receive") {
      const parsed = ReceiveReturnSchema.parse(data);
      result = await receiveReturn(ctx.store.id, returnId, parsed, {
        userId: ctx.user.id,
        actorType: "MERCHANT",
      });
    } else {
      throw new ValidationError("Invalid action. Expected 'review' or 'receive'.");
    }

    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import {
  getSupplierOrderById,
  acceptSupplierOrder,
  rejectSupplierOrder,
  updateSupplierOrderStatus,
} from "@/modules/dropshipping/fulfillment/supplier-fulfillment-service";
import { NotFoundError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/supplier/orders/[id]
 * Retrieves single supplier order with items and fulfillment details.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("supplier:orders");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const order = await getSupplierOrderById(id, supplier.id);
    return apiSuccess(order);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PUT /api/v1/supplier/orders/[id]
 * Transitions supplier order status (ACCEPT, REJECT, or status: PROCESSING/PACKED/SHIPPED/DELIVERED).
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("supplier:fulfill");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const body = await req.json();
    const { action, status, rejectionReason } = body;

    let updated;
    if (action === "ACCEPT") {
      updated = await acceptSupplierOrder(id, supplier.id);
    } else if (action === "REJECT") {
      if (!rejectionReason) {
        throw new ValidationError("rejectionReason is required when rejecting an order.");
      }
      updated = await rejectSupplierOrder(id, supplier.id, rejectionReason);
    } else if (status) {
      updated = await updateSupplierOrderStatus(id, supplier.id, status);
    } else {
      throw new ValidationError("Either 'action' (ACCEPT/REJECT) or 'status' is required.");
    }

    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}

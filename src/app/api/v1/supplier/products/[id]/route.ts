import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import {
  getSupplierProductById,
  updateSupplierProduct,
} from "@/modules/dropshipping/supplier-catalog/catalog-service";
import { NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/supplier/products/[id]
 * Retrieves a single product from the authenticated supplier's catalog.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("supplier:products");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const product = await getSupplierProductById(supplier.id, id);
    return apiSuccess(product);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PUT /api/v1/supplier/products/[id]
 * Updates product details in the authenticated supplier's catalog.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("supplier:products");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const body = await req.json();
    const updated = await updateSupplierProduct(supplier.id, id, body);
    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/v1/supplier/products/[id]
 * Sets product status to ARCHIVED.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = await requirePermission("supplier:products");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const updated = await updateSupplierProduct(supplier.id, id, { status: "ARCHIVED" });
    return apiSuccess(updated);
  } catch (err) {
    return apiError(err);
  }
}

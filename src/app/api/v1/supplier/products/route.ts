import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import {
  listSupplierProducts,
  createSupplierProduct,
} from "@/modules/dropshipping/supplier-catalog/catalog-service";
import { NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/supplier/products
 * Lists all products in the supplier's catalog.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("supplier:products");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const products = await listSupplierProducts(supplier.id, status);

    return apiSuccess(products);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/v1/supplier/products
 * Creates a new supplier product with default variant & inventory record.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("supplier:products");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const body = await req.json();
    const product = await createSupplierProduct(supplier.id, body);

    return apiSuccess(product, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { browseMarketplace } from "@/modules/dropshipping/supplier-catalog/catalog-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dropshipping/marketplace
 * Allows authenticated merchants to search and browse verified supplier products.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("dropshipping:read");

    const url = req.nextUrl;
    const search = url.searchParams.get("search") || undefined;
    const categoryName = url.searchParams.get("category") || undefined;
    const supplierId = url.searchParams.get("supplierId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const result = await browseMarketplace({
      search,
      categoryName,
      supplierId,
      limit,
      offset,
    });

    return apiSuccess(result.products, {
      total: result.total,
      limit,
      page: Math.floor(offset / limit) + 1,
    });
  } catch (err) {
    return apiError(err);
  }
}

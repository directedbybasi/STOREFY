import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { previewMeeshoProduct } from "@/modules/marketplaces/import/import-service";
import { previewProductSchema } from "@/modules/marketplaces/import/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/meesho/preview
 * Previews a Meesho product from URL or product code before importing.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("marketplace:read");

    const body = await req.json();
    const validated = previewProductSchema.parse(body);

    const preview = await previewMeeshoProduct(validated.urlOrCode);
    return apiSuccess(preview);
  } catch (err) {
    return apiError(err);
  }
}

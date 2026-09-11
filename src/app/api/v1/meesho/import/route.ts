import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { importMeeshoProduct } from "@/modules/marketplaces/import/import-service";
import { importProductSchema } from "@/modules/marketplaces/import/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/meesho/import
 * Idempotently imports a Meesho product into the merchant's store catalog.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("marketplace:import");

    const body = await req.json();
    const validated = importProductSchema.parse(body);

    const result = await importMeeshoProduct(
      ctx.store.id,
      validated.urlOrCode,
      validated.overrides
    );

    return apiSuccess(result, undefined, validated.overrides ? 201 : 200);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { marketplaceRegistry } from "@/modules/marketplaces/core/registry";
import "@/modules/marketplaces/meesho/adapter"; // Ensure Meesho adapter is registered

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/marketplaces/connectors
 * Lists all registered marketplace connectors in STOREFY.
 */
export async function GET() {
  try {
    await requirePermission("marketplace:read");
    const connectors = marketplaceRegistry.list();

    return apiSuccess(connectors);
  } catch (err) {
    return apiError(err);
  }
}

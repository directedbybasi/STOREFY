import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import {
  getSettlementLedger,
  getPayoutSummary,
} from "@/modules/dropshipping/payouts/settlement-service";
import { NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/supplier/settlements
 * Retrieves settlement ledger and payout summary for the authenticated supplier.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("supplier:finance");
    const supplier = await getSupplierByOrganization(ctx.organization.id);
    if (!supplier) {
      throw new NotFoundError("Supplier profile not registered for this organization.");
    }

    const url = req.nextUrl;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const [summary, ledger] = await Promise.all([
      getPayoutSummary(supplier.id),
      getSettlementLedger(supplier.id, limit, offset),
    ]);

    return apiSuccess({ summary, ledger }, { limit, page: Math.floor(offset / limit) + 1, total: ledger.length });
  } catch (err) {
    return apiError(err);
  }
}

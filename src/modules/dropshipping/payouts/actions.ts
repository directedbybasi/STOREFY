"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  getSettlementLedger,
  getPayoutSummary,
  markEntriesEligible,
  markSettlementPaid,
} from "./settlement-service";

/**
 * Supplier: get their settlement ledger history.
 */
export async function getSettlementLedgerAction(
  supplierId: string,
  limit?: number,
  offset?: number
) {
  await requirePermission("supplier:finance");
  return getSettlementLedger(supplierId, limit, offset);
}

/**
 * Supplier: get their payout summary.
 */
export async function getPayoutSummaryAction(supplierId: string) {
  await requirePermission("supplier:finance");
  return getPayoutSummary(supplierId);
}

/**
 * Admin: mark settlement entries as eligible.
 */
export async function markEntriesEligibleAction(
  supplierId: string,
  entryIds: string[]
) {
  await requirePermission("supplier:verify");
  return markEntriesEligible(supplierId, entryIds);
}

/**
 * Admin: mark settlement entries as paid (requires payment reference).
 */
export async function markSettlementPaidAction(
  supplierId: string,
  entryIds: string[],
  paymentReference: string
) {
  await requirePermission("supplier:verify");
  return markSettlementPaid(supplierId, entryIds, paymentReference);
}

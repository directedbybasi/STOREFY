import { db } from "@/database/client";
import {
  supplierSettlementLedger,
  supplierOrders,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/core/errors";

export interface SettlementLedgerEntryDTO {
  id: string;
  supplierId: string;
  supplierOrderId: string | null;
  orderId: string | null;
  eventType: string;
  amountPaise: number;
  runningBalancePaise: number;
  settlementStatus: string;
  paidAt: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PayoutSummaryDTO {
  supplierId: string;
  totalEarningsPaise: number;
  totalDeductionsPaise: number;
  totalPaidPaise: number;
  pendingBalancePaise: number;
  eligibleBalancePaise: number;
}

// ─── Ledger Operations (Append-Only) ──────────────────

/**
 * Records a supplier earning when a supplier order is delivered.
 * Idempotent — duplicate earning for the same supplier order is rejected.
 */
export async function recordEarning(
  supplierId: string,
  supplierOrderId: string,
  orderId: string,
  amountPaise: number
): Promise<SettlementLedgerEntryDTO> {
  if (amountPaise <= 0) {
    throw new ValidationError("Earning amount must be positive.");
  }

  const idempotencyKey = `EARNING:${supplierOrderId}`;

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    return mapToDTO(existing);
  }

  const currentBalance = await getCurrentBalance(supplierId);

  const [entry] = await db
    .insert(supplierSettlementLedger)
    .values({
      supplierId,
      supplierOrderId,
      orderId,
      eventType: "EARNING",
      amountPaise,
      runningBalancePaise: currentBalance + amountPaise,
      settlementStatus: "PENDING",
      idempotencyKey,
    })
    .returning();

  return mapToDTO(entry);
}

/**
 * Records a refund adjustment (negative) when a customer receives a refund.
 * Idempotent per refund reference.
 */
export async function recordRefundAdjustment(
  supplierId: string,
  supplierOrderId: string,
  orderId: string,
  adjustmentPaise: number,
  reference: string
): Promise<SettlementLedgerEntryDTO> {
  const idempotencyKey = `REFUND_ADJUSTMENT:${reference}`;

  const [existing] = await db
    .select()
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) return mapToDTO(existing);

  const currentBalance = await getCurrentBalance(supplierId);
  const amount = -Math.abs(adjustmentPaise); // Always negative

  const [entry] = await db
    .insert(supplierSettlementLedger)
    .values({
      supplierId,
      supplierOrderId,
      orderId,
      eventType: "REFUND_ADJUSTMENT",
      amountPaise: amount,
      runningBalancePaise: currentBalance + amount,
      settlementStatus: "PENDING",
      idempotencyKey,
      notes: `Refund adjustment for ${reference}`,
    })
    .returning();

  return mapToDTO(entry);
}

/**
 * Records an RTO adjustment (negative) when supplier shipment is returned to origin.
 */
export async function recordRTOAdjustment(
  supplierId: string,
  supplierOrderId: string,
  orderId: string
): Promise<SettlementLedgerEntryDTO> {
  const idempotencyKey = `RTO_ADJUSTMENT:${supplierOrderId}`;

  const [existing] = await db
    .select()
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) return mapToDTO(existing);

  // Get the original earning amount
  const [earningEntry] = await db
    .select()
    .from(supplierSettlementLedger)
    .where(
      and(
        eq(supplierSettlementLedger.supplierId, supplierId),
        eq(supplierSettlementLedger.supplierOrderId, supplierOrderId),
        eq(supplierSettlementLedger.eventType, "EARNING")
      )
    )
    .limit(1);

  const adjustmentAmount = earningEntry ? -earningEntry.amountPaise : 0;
  const currentBalance = await getCurrentBalance(supplierId);

  const [entry] = await db
    .insert(supplierSettlementLedger)
    .values({
      supplierId,
      supplierOrderId,
      orderId,
      eventType: "RTO_ADJUSTMENT",
      amountPaise: adjustmentAmount,
      runningBalancePaise: currentBalance + adjustmentAmount,
      settlementStatus: "PENDING",
      idempotencyKey,
      notes: "RTO — supplier shipment returned to origin",
    })
    .returning();

  return mapToDTO(entry);
}

/**
 * Marks eligible entries as PAID. Only entries with ELIGIBLE status can be paid.
 * NEVER marks PAID without explicit confirmation — prevents fake payout success.
 */
export async function markSettlementPaid(
  supplierId: string,
  entryIds: string[],
  paymentReference: string
): Promise<number> {
  if (!paymentReference) {
    throw new ValidationError("Payment reference is required.");
  }

  let updated = 0;
  for (const id of entryIds) {
    const [entry] = await db
      .select()
      .from(supplierSettlementLedger)
      .where(
        and(
          eq(supplierSettlementLedger.id, id),
          eq(supplierSettlementLedger.supplierId, supplierId),
          eq(supplierSettlementLedger.settlementStatus, "ELIGIBLE")
        )
      )
      .limit(1);

    if (entry) {
      await db
        .update(supplierSettlementLedger)
        .set({
          settlementStatus: "PAID",
          paidAt: new Date(),
          reference: paymentReference,
        })
        .where(eq(supplierSettlementLedger.id, id));
      updated++;
    }
  }

  return updated;
}

/**
 * Marks PENDING entries as ELIGIBLE once the return window has passed.
 */
export async function markEntriesEligible(
  supplierId: string,
  entryIds: string[]
): Promise<number> {
  let updated = 0;
  for (const id of entryIds) {
    const result = await db
      .update(supplierSettlementLedger)
      .set({ settlementStatus: "ELIGIBLE" })
      .where(
        and(
          eq(supplierSettlementLedger.id, id),
          eq(supplierSettlementLedger.supplierId, supplierId),
          eq(supplierSettlementLedger.settlementStatus, "PENDING")
        )
      );
    updated++;
  }
  return updated;
}

/**
 * Gets the supplier's settlement ledger history.
 */
export async function getSettlementLedger(
  supplierId: string,
  limit = 50,
  offset = 0
): Promise<SettlementLedgerEntryDTO[]> {
  const entries = await db
    .select()
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.supplierId, supplierId))
    .orderBy(desc(supplierSettlementLedger.createdAt))
    .limit(limit)
    .offset(offset);

  return entries.map(mapToDTO);
}

/**
 * Gets the supplier's payout summary.
 */
export async function getPayoutSummary(
  supplierId: string
): Promise<PayoutSummaryDTO> {
  const entries = await db
    .select()
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.supplierId, supplierId));

  let totalEarnings = 0;
  let totalDeductions = 0;
  let totalPaid = 0;
  let pendingBalance = 0;
  let eligibleBalance = 0;

  for (const e of entries) {
    if (e.amountPaise > 0) {
      totalEarnings += e.amountPaise;
    } else {
      totalDeductions += Math.abs(e.amountPaise);
    }

    if (e.settlementStatus === "PAID") {
      totalPaid += Math.max(0, e.amountPaise);
    }
    if (e.settlementStatus === "PENDING") {
      pendingBalance += e.amountPaise;
    }
    if (e.settlementStatus === "ELIGIBLE") {
      eligibleBalance += e.amountPaise;
    }
  }

  return {
    supplierId,
    totalEarningsPaise: totalEarnings,
    totalDeductionsPaise: totalDeductions,
    totalPaidPaise: totalPaid,
    pendingBalancePaise: pendingBalance,
    eligibleBalancePaise: eligibleBalance,
  };
}

// ─── Internal Helpers ──────────────────────────────────

async function getCurrentBalance(supplierId: string): Promise<number> {
  const [result] = await db
    .select({
      balance: sql<number>`COALESCE(SUM(${supplierSettlementLedger.amountPaise}), 0)::bigint`,
    })
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.supplierId, supplierId));

  return Number(result?.balance ?? 0);
}

function mapToDTO(
  e: typeof supplierSettlementLedger.$inferSelect
): SettlementLedgerEntryDTO {
  return {
    id: e.id,
    supplierId: e.supplierId,
    supplierOrderId: e.supplierOrderId,
    orderId: e.orderId,
    eventType: e.eventType,
    amountPaise: e.amountPaise,
    runningBalancePaise: e.runningBalancePaise,
    settlementStatus: e.settlementStatus,
    paidAt: e.paidAt?.toISOString() ?? null,
    reference: e.reference,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

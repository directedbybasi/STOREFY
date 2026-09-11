import { db } from "@/database/client";
import { refunds, orders } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/core/errors";
import { formatPaiseToRupees } from "@/modules/cart/service";
import type { ProcessRefundInput } from "./validation";
import type { RefundDTO, RefundStatus } from "./types";

export async function processRefund(
  storeId: string,
  refundId: string,
  input: ProcessRefundInput = {},
  actor?: { userId?: string; actorType: "CUSTOMER" | "MERCHANT" | "SYSTEM" }
): Promise<RefundDTO> {
  const [refund] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.storeId, storeId)))
    .limit(1);

  if (!refund) throw new NotFoundError("Refund record not found.");

  if (refund.status === "COMPLETED") {
    throw new ConflictError("This refund has already been completed.");
  }

  const gatewayRefundId =
    input.gatewayRefundId || `ref_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const [updated] = await db
    .update(refunds)
    .set({
      status: "COMPLETED",
      gatewayRefundId,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(refunds.id, refundId))
    .returning();

  // Update order payment status to REFUNDED or PARTIALLY_REFUNDED
  await db
    .update(orders)
    .set({
      paymentStatus: "REFUNDED",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, refund.orderId));

  return {
    id: updated.id,
    orderId: updated.orderId,
    returnId: updated.returnId,
    amountPaise: updated.amount,
    amountFormatted: formatPaiseToRupees(updated.amount),
    currency: updated.currency,
    reason: updated.reason,
    status: updated.status as RefundStatus,
    gateway: updated.gateway,
    gatewayRefundId: updated.gatewayRefundId,
    processedAt: updated.processedAt,
    createdAt: updated.createdAt,
  };
}

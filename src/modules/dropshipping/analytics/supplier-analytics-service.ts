import { db } from "@/database/client";
import {
  supplierOrders,
  supplierPerformance,
  supplierSettlementLedger,
} from "@/database/schema";
import { eq, and, sql, gte, lte, desc, type SQL } from "drizzle-orm";

export interface SupplierAnalyticsDTO {
  totalOrders: number;
  fulfilledOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  rtoCount: number;
  avgProcessingHours: number;
  totalEarningsPaise: number;
  pendingSettlementPaise: number;
  fulfillmentRate: number; // percentage
  rejectionRate: number;
  rtoRate: number;
}

/**
 * Calculates real-time supplier performance metrics from authoritative records.
 */
export async function getSupplierAnalytics(
  supplierId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SupplierAnalyticsDTO> {
  const conditions: SQL[] = [eq(supplierOrders.supplierId, supplierId)];

  if (startDate) {
    conditions.push(gte(supplierOrders.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(supplierOrders.createdAt, endDate));
  }

  const orders = await db
    .select()
    .from(supplierOrders)
    .where(and(...conditions));

  const totalOrders = orders.length;
  const fulfilledOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const rejectedOrders = orders.filter((o) => o.status === "REJECTED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const rtoCount = orders.filter((o) => o.status === "RTO").length;

  // Calculate avg processing time (accepted → shipped)
  const processedOrders = orders.filter(
    (o) => o.acceptedAt && o.shippedAt
  );
  const avgProcessingHours =
    processedOrders.length > 0
      ? Math.round(
          processedOrders.reduce((sum, o) => {
            const diff = o.shippedAt!.getTime() - o.acceptedAt!.getTime();
            return sum + diff / (1000 * 60 * 60);
          }, 0) / processedOrders.length
        )
      : 0;

  // Settlement summary
  const [settlement] = await db
    .select({
      totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${supplierSettlementLedger.amountPaise} > 0 THEN ${supplierSettlementLedger.amountPaise} ELSE 0 END), 0)::bigint`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${supplierSettlementLedger.settlementStatus} = 'PENDING' THEN ${supplierSettlementLedger.amountPaise} ELSE 0 END), 0)::bigint`,
    })
    .from(supplierSettlementLedger)
    .where(eq(supplierSettlementLedger.supplierId, supplierId));

  return {
    totalOrders,
    fulfilledOrders,
    rejectedOrders,
    cancelledOrders,
    rtoCount,
    avgProcessingHours,
    totalEarningsPaise: Number(settlement?.totalEarnings ?? 0),
    pendingSettlementPaise: Number(settlement?.pending ?? 0),
    fulfillmentRate: totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0,
    rejectionRate: totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 100) : 0,
    rtoRate: totalOrders > 0 ? Math.round((rtoCount / totalOrders) * 100) : 0,
  };
}

import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierOrdersForOrder } from "@/modules/dropshipping/fulfillment/supplier-fulfillment-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { db } from "@/database/client";
import { supplierOrders, suppliers } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Supplier Orders — STOREFY",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING: { color: "border-amber-500/30 bg-amber-950/40 text-amber-300", icon: <Clock className="h-3 w-3" />, label: "Pending" },
  ACCEPTED: { color: "border-blue-500/30 bg-blue-950/40 text-blue-300", icon: <CheckCircle2 className="h-3 w-3" />, label: "Accepted" },
  PROCESSING: { color: "border-cyan-500/30 bg-cyan-950/40 text-cyan-300", icon: <Package className="h-3 w-3" />, label: "Processing" },
  PACKED: { color: "border-indigo-500/30 bg-indigo-950/40 text-indigo-300", icon: <Package className="h-3 w-3" />, label: "Packed" },
  SHIPPED: { color: "border-violet-500/30 bg-violet-950/40 text-violet-300", icon: <Truck className="h-3 w-3" />, label: "Shipped" },
  DELIVERED: { color: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" />, label: "Delivered" },
  REJECTED: { color: "border-red-500/30 bg-red-950/40 text-red-300", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
  CANCELLED: { color: "border-slate-500/30 bg-slate-950/40 text-slate-300", icon: <XCircle className="h-3 w-3" />, label: "Cancelled" },
  RTO: { color: "border-orange-500/30 bg-orange-950/40 text-orange-300", icon: <AlertTriangle className="h-3 w-3" />, label: "RTO" },
};

export default async function DropshippingOrdersPage() {
  const ctx = await requirePermission("dropshipping:orders");

  const allSupplierOrders = await db
    .select()
    .from(supplierOrders)
    .innerJoin(suppliers, eq(suppliers.id, supplierOrders.supplierId))
    .where(eq(supplierOrders.storeId, ctx.store.id))
    .orderBy(desc(supplierOrders.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-violet-400" />
            Supplier Orders
          </h1>
          <p className="text-xs text-slate-400">
            Track supplier fulfillment for dropshipped products in {ctx.store.name}.
          </p>
        </div>
      </div>

      {allSupplierOrders.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No supplier orders yet.</p>
            <p className="text-xs text-slate-500 mt-1">Orders will appear when customers purchase imported products.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allSupplierOrders.map((row) => {
            const so = row.supplier_orders;
            const supplier = row.suppliers;
            const statusCfg = STATUS_CONFIG[so.status] || STATUS_CONFIG.PENDING;

            return (
              <Card key={so.id} className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-950/50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {supplier.displayName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Order: {so.orderId.slice(0, 8)}... · Created {new Date(so.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Supplier Cost</p>
                        <p className="text-sm font-semibold text-white">
                          {formatPaiseToRupees(so.supplierCostTotalPaise)}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${statusCfg.color} text-[10px] flex items-center gap-1`}>
                        {statusCfg.icon} {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                  {so.rejectionReason && (
                    <div className="mt-2 bg-red-950/20 border border-red-500/10 rounded px-2 py-1.5">
                      <p className="text-[10px] text-red-400">Rejection: {so.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

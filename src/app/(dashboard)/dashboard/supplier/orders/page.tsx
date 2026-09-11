import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { listSupplierOrders } from "@/modules/dropshipping/fulfillment/supplier-fulfillment-service";
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
  MapPin,
} from "lucide-react";
import { formatPaiseToRupees } from "@/lib/currency";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Supplier Orders — STOREFY",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING: { color: "border-amber-500/30 bg-amber-950/40 text-amber-300", icon: <Clock className="h-3 w-3" /> },
  ACCEPTED: { color: "border-blue-500/30 bg-blue-950/40 text-blue-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  PROCESSING: { color: "border-cyan-500/30 bg-cyan-950/40 text-cyan-300", icon: <Package className="h-3 w-3" /> },
  PACKED: { color: "border-indigo-500/30 bg-indigo-950/40 text-indigo-300", icon: <Package className="h-3 w-3" /> },
  SHIPPED: { color: "border-violet-500/30 bg-violet-950/40 text-violet-300", icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { color: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { color: "border-red-500/30 bg-red-950/40 text-red-300", icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { color: "border-slate-500/30 bg-slate-950/40 text-slate-300", icon: <XCircle className="h-3 w-3" /> },
  RTO: { color: "border-orange-500/30 bg-orange-950/40 text-orange-300", icon: <AlertTriangle className="h-3 w-3" /> },
};

export default async function SupplierOrdersPage() {
  const ctx = await requirePermission("supplier:orders");
  const supplier = await getSupplierByOrganization(ctx.organization.id);

  if (!supplier) {
    redirect("/dashboard/supplier");
  }

  const orders = await listSupplierOrders(supplier.id);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const activeCount = orders.filter((o) =>
    ["ACCEPTED", "PROCESSING", "PACKED", "SHIPPED"].includes(o.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            Incoming Orders
          </h1>
          <p className="text-xs text-slate-400">
            {pendingCount} pending · {activeCount} in progress
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No orders received yet.</p>
            <p className="text-xs text-slate-500 mt-1">Orders will appear when resellers sell your products.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const address = order.shippingAddress as Record<string, string>;

            return (
              <Card key={order.id} className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950/50 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {order.items.length} item(s) · {formatPaiseToRupees(order.supplierCostTotalPaise)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()} ·
                          {order.deadlineAt && ` Due: ${new Date(order.deadlineAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${statusCfg.color} text-[10px] flex items-center gap-1`}>
                      {statusCfg.icon} {order.status}
                    </Badge>
                  </div>

                  {/* Minimized shipping info — only what supplier needs */}
                  {address && (
                    <div className="bg-slate-800/30 rounded px-3 py-2 text-[10px] text-slate-400 flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {address.recipientName}, {address.city}, {address.state} {address.postalCode}
                      </span>
                    </div>
                  )}

                  {order.rejectionReason && (
                    <div className="mt-2 bg-red-950/20 border border-red-500/10 rounded px-2 py-1.5">
                      <p className="text-[10px] text-red-400">Rejection: {order.rejectionReason}</p>
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

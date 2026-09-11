import React from "react";
import Link from "next/link";
import { requirePermission } from "@/core/tenant/rbac";
import { listStoreOrders } from "@/modules/orders/order-service";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Clock,
  Truck,
  RotateCcw,
  IndianRupee,
  Plus,
} from "lucide-react";
import { formatPaiseToRupees } from "@/modules/cart/service";

export const metadata = {
  title: "Orders & Fulfillment — STOREFY",
  description: "Manage orders, shipments, GST invoices, and customer returns.",
};

export default async function OrdersDashboardPage() {
  const ctx = await requirePermission("orders:read");

  const { orders, total } = await listStoreOrders(ctx.store.id, {
    limit: 50,
  });

  // Calculate quick metrics
  const pendingOrders = orders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PACKED"
  ).length;

  const shippedOrders = orders.filter(
    (o) => o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY"
  ).length;

  const totalRevenuePaise = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Orders & Shipments</h1>
          <p className="text-xs text-slate-400">
            Real-time orders queue, carrier fulfillment, tracking, and GST tax invoices for {ctx.store.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 border-slate-700 text-xs text-slate-300">
            <Link href="/dashboard/returns">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Returns Portal
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Orders</p>
              <p className="text-xl font-bold text-white font-mono mt-1">{total}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pending Fulfillment</p>
              <p className="text-xl font-bold text-amber-400 font-mono mt-1">{pendingOrders}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">In Transit</p>
              <p className="text-xl font-bold text-cyan-400 font-mono mt-1">{shippedOrders}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Order Volume</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {formatPaiseToRupees(totalRevenuePaise)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Orders Table with Search & Status Filters */}
      <OrdersTable initialOrders={orders} total={total} />
    </div>
  );
}

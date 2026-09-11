import React from "react";
import Link from "next/link";
import { requirePermission } from "@/core/tenant/rbac";
import { listStoreReturns } from "@/modules/orders/returns-service";
import { ReturnsTable } from "@/components/dashboard/returns-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";

export const metadata = {
  title: "Returns & Exchanges — STOREFY",
  description: "Manage customer return requests, physical inspections, and inventory restock.",
};

export default async function ReturnsDashboardPage() {
  const ctx = await requirePermission("orders:read");

  const returns = await listStoreReturns(ctx.store.id);
  const total = returns.length;

  const requestedCount = returns.filter((r) => r.status === "REQUESTED").length;
  const approvedCount = returns.filter((r) => r.status === "APPROVED").length;
  const receivedCount = returns.filter((r) => r.status === "RECEIVED").length;
  const refundedCount = returns.filter((r) => r.status === "REFUNDED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="h-6 px-1.5 text-xs text-slate-400 hover:text-white">
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Orders
              </Link>
            </Button>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Customer Returns & Restock</h1>
          <p className="text-xs text-slate-400">
            Review customer return requests, approve shipments, record physical inspection, and restock your inventory ledger.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pending Review</p>
              <p className="text-xl font-bold text-amber-400 font-mono mt-1">{requestedCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Awaiting Package</p>
              <p className="text-xl font-bold text-blue-400 font-mono mt-1">{approvedCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <RotateCcw className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Received & Inspected</p>
              <p className="text-xl font-bold text-purple-400 font-mono mt-1">{receivedCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Completed / Refunded</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{refundedCount}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Returns Table */}
      <ReturnsTable initialReturns={returns} total={total} />
    </div>
  );
}

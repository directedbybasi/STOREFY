import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { organizations, stores, users } from "@/database/schema";
import { suppliers } from "@/database/schema/dropshipping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Store, Truck, Users as UsersIcon, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { sql } from "drizzle-orm";

export const metadata = {
  title: "Platform Overview — Storefy Admin",
};

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  // Aggregate platform metrics
  const [
    orgCountResult,
    storeCountResult,
    supplierCountResult,
    userCountResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(organizations),
    db.select({ count: sql<number>`count(*)::int` }).from(stores),
    db.select({ count: sql<number>`count(*)::int`, status: suppliers.status }).from(suppliers).groupBy(suppliers.status).catch(() => []),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
  ]);

  const totalMerchants = orgCountResult[0]?.count || 0;
  const totalStores = storeCountResult[0]?.count || 0;
  const totalUsers = userCountResult[0]?.count || 0;

  const totalSuppliers = supplierCountResult.reduce((sum, r) => sum + (r.count || 0), 0);
  const verifiedSuppliers = supplierCountResult.find((r) => r.status === "APPROVED")?.count || 0;
  const pendingSuppliers = supplierCountResult.find((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW")?.count || 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-violet-400" />
          Platform Overview
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Storefy platform-wide tenant telemetry, merchant oversight, and verification queue.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Merchants</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">{totalMerchants}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Active Stores</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{totalStores}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Supplier Merchants</p>
              <p className="text-2xl font-bold text-cyan-400 font-mono mt-1">{totalSuppliers}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Platform Users</p>
              <p className="text-2xl font-bold text-indigo-400 font-mono mt-1">{totalUsers}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Supplier Capability & Verification Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-400" />
              Supplier Verification Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-850">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-white">Pending Verification</p>
                  <p className="text-[11px] text-slate-400">Merchants awaiting supplier capability approval</p>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-amber-400">{pendingSuppliers}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-850">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-white">Verified Suppliers</p>
                  <p className="text-[11px] text-slate-400">Active supplier merchants in network</p>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-400">{verifiedSuppliers}</span>
            </div>

            <div className="pt-2">
              <Link
                href="/admin/suppliers"
                className="inline-flex items-center justify-center w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                Review Verification Queue
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-400" />
              Merchant Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-slate-300 space-y-3">
            <p className="leading-relaxed">
              Storefy enforces a strict 2-tier account model:
            </p>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-2 font-mono text-[11px]">
              <div className="text-violet-300 font-bold">1. PLATFORM ADMIN</div>
              <div className="pl-3 text-slate-400">Internal oversight, verification, compliance, operations</div>
              <div className="text-emerald-300 font-bold mt-2">2. MERCHANT</div>
              <div className="pl-3 text-slate-400">Standard Merchant or Supplier (Account Capability)</div>
              <div className="pl-6 text-slate-500">└ Shared RBAC: OWNER / ADMIN / MANAGER / STAFF / EDITOR / VIEWER</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Supplier is an account capability, not a role. Authorized merchant staff operate supplier catalog and fulfillment using standard merchant roles.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

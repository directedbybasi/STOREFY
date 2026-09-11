import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { getSupplierAnalytics } from "@/modules/dropshipping/analytics/supplier-analytics-service";
import { getPayoutSummary } from "@/modules/dropshipping/payouts/settlement-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Supplier Dashboard — STOREFY",
};

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  PENDING: { color: "border-amber-500/30 bg-amber-950/40 text-amber-300", label: "Pending Verification" },
  UNDER_REVIEW: { color: "border-blue-500/30 bg-blue-950/40 text-blue-300", label: "Under Review" },
  APPROVED: { color: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300", label: "Verified Supplier" },
  REJECTED: { color: "border-red-500/30 bg-red-950/40 text-red-300", label: "Application Rejected" },
  SUSPENDED: { color: "border-orange-500/30 bg-orange-950/40 text-orange-300", label: "Account Suspended" },
};

export default async function SupplierDashboardPage() {
  const ctx = await requirePermission("supplier:read");
  const supplier = await getSupplierByOrganization(ctx.organization.id);

  if (!supplier) {
    return (
      <div className="space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-400" />
            Supplier Portal
          </h1>
        </div>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-4">You haven&apos;t registered as a supplier yet.</p>
            <Link href="/dashboard/supplier/register">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                Apply as Supplier <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[supplier.status] || STATUS_BADGE.PENDING;
  const isApproved = supplier.status === "APPROVED";

  let analytics = null;
  let payouts = null;

  if (isApproved) {
    [analytics, payouts] = await Promise.all([
      getSupplierAnalytics(supplier.id),
      getPayoutSummary(supplier.id),
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-400" />
            {supplier.displayName}
          </h1>
          <p className="text-xs text-slate-400">
            Supplier Dashboard — {supplier.businessName}
          </p>
        </div>
        <Badge variant="outline" className={`${statusBadge.color} text-[10px] w-fit`}>
          {statusBadge.label}
        </Badge>
      </div>

      {/* Rejection/Suspension Notice */}
      {supplier.status === "REJECTED" && supplier.rejectionReason && (
        <Card className="bg-red-950/20 border-red-500/20">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Rejected: {supplier.rejectionReason}
            </p>
          </CardContent>
        </Card>
      )}
      {supplier.status === "SUSPENDED" && supplier.suspensionReason && (
        <Card className="bg-orange-950/20 border-orange-500/20">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-orange-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Suspended: {supplier.suspensionReason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {isApproved && analytics && payouts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-950/50 to-slate-900 border-violet-500/20">
            <CardContent className="pt-5 pb-4 px-4">
              <p className="text-[10px] text-violet-300/80 uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-white mt-1">{analytics.totalOrders}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {analytics.fulfilledOrders} fulfilled
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-500/20">
            <CardContent className="pt-5 pb-4 px-4">
              <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Total Earnings</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatPaiseToRupees(payouts.totalEarningsPaise)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {formatPaiseToRupees(payouts.pendingBalancePaise)} pending
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-950/50 to-slate-900 border-blue-500/20">
            <CardContent className="pt-5 pb-4 px-4">
              <p className="text-[10px] text-blue-300/80 uppercase tracking-wider">Fulfillment Rate</p>
              <p className="text-2xl font-bold text-white mt-1">{analytics.fulfillmentRate}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Avg {analytics.avgProcessingHours}h processing
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/20">
            <CardContent className="pt-5 pb-4 px-4">
              <p className="text-[10px] text-amber-300/80 uppercase tracking-wider">Quality</p>
              <p className="text-2xl font-bold text-white mt-1">{100 - analytics.rejectionRate}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {analytics.rtoCount} RTO · {analytics.rejectedOrders} rejected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Links */}
      {isApproved && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/supplier/products">
            <Card className="bg-slate-900/60 border-slate-800 hover:border-violet-500/30 transition-colors cursor-pointer">
              <CardContent className="py-5 px-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-950/50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Products</p>
                  <p className="text-[10px] text-slate-500">Manage your catalog</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/supplier/orders">
            <Card className="bg-slate-900/60 border-slate-800 hover:border-emerald-500/30 transition-colors cursor-pointer">
              <CardContent className="py-5 px-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/50 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Orders</p>
                  <p className="text-[10px] text-slate-500">Fulfill and ship</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/supplier/earnings">
            <Card className="bg-slate-900/60 border-slate-800 hover:border-amber-500/30 transition-colors cursor-pointer">
              <CardContent className="py-5 px-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-950/50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Earnings</p>
                  <p className="text-[10px] text-slate-500">Settlements & payouts</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}

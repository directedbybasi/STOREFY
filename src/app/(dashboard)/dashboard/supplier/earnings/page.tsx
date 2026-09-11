import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { getSettlementLedger, getPayoutSummary } from "@/modules/dropshipping/payouts/settlement-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { formatPaiseToRupees } from "@/lib/currency";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Supplier Earnings — STOREFY",
};

const EVENT_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  EARNING: { color: "text-emerald-400", icon: <ArrowUpRight className="h-3 w-3" />, label: "Earning" },
  REFUND_ADJUSTMENT: { color: "text-red-400", icon: <ArrowDownRight className="h-3 w-3" />, label: "Refund" },
  RETURN_ADJUSTMENT: { color: "text-orange-400", icon: <ArrowDownRight className="h-3 w-3" />, label: "Return" },
  RTO_ADJUSTMENT: { color: "text-amber-400", icon: <ArrowDownRight className="h-3 w-3" />, label: "RTO" },
  PAYOUT: { color: "text-blue-400", icon: <CheckCircle2 className="h-3 w-3" />, label: "Payout" },
  REVERSAL: { color: "text-red-400", icon: <ArrowDownRight className="h-3 w-3" />, label: "Reversal" },
  MANUAL_ADJUSTMENT: { color: "text-slate-400", icon: <DollarSign className="h-3 w-3" />, label: "Adjustment" },
};

export default async function SupplierEarningsPage() {
  const ctx = await requirePermission("supplier:finance");
  const supplier = await getSupplierByOrganization(ctx.organization.id);

  if (!supplier) {
    redirect("/dashboard/supplier");
  }

  const [ledger, summary] = await Promise.all([
    getSettlementLedger(supplier.id, 50),
    getPayoutSummary(supplier.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-400" />
          Earnings & Settlements
        </h1>
        <p className="text-xs text-slate-400">
          Financial ledger for {supplier.displayName}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Total Earnings</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatPaiseToRupees(summary.totalEarningsPaise)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-950/50 to-slate-900 border-red-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-[10px] text-red-300/80 uppercase tracking-wider">Deductions</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatPaiseToRupees(summary.totalDeductionsPaise)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-[10px] text-amber-300/80 uppercase tracking-wider">Pending</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatPaiseToRupees(summary.pendingBalancePaise)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-950/50 to-slate-900 border-blue-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-[10px] text-blue-300/80 uppercase tracking-wider">Total Paid</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatPaiseToRupees(summary.totalPaidPaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Transaction History</h2>
        {ledger.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No transactions yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ledger.map((entry) => {
              const config = EVENT_CONFIG[entry.eventType] || EVENT_CONFIG.EARNING;
              const isPositive = entry.amountPaise > 0;

              return (
                <Card key={entry.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${config.color} flex items-center gap-1`}>
                          {config.icon}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{config.label}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(entry.createdAt).toLocaleDateString()}
                            {entry.notes && ` · ${entry.notes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{formatPaiseToRupees(entry.amountPaise)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            entry.settlementStatus === "PAID"
                              ? "border-emerald-500/30 text-emerald-400"
                              : entry.settlementStatus === "ELIGIBLE"
                              ? "border-blue-500/30 text-blue-400"
                              : "border-slate-500/30 text-slate-400"
                          }`}
                        >
                          {entry.settlementStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

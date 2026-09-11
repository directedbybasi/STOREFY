import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getDashboardAnalyticsAction } from "@/modules/marketing/analytics/actions";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Analytics & Intelligence — STOREFY",
};

export default async function AnalyticsDashboardPage() {
  const ctx = await requirePermission("analytics:view");
  const initialOverview = await getDashboardAnalyticsAction("7d");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            Analytics & Intelligence
          </h1>
          <p className="text-xs text-slate-400">
            Real-time financial performance, conversion funnel drop-off, and traffic attribution for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-[10px] w-fit">
          Phase 11: Authoritative
        </Badge>
      </div>

      <AnalyticsView initialOverview={initialOverview} />
    </div>
  );
}

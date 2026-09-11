import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getDashboardAnalyticsAction } from "@/modules/marketing/analytics/actions";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Analytics & Intelligence — STOREFY",
};

export default async function AnalyticsDashboardPage() {
  const ctx = await requirePermission("analytics:view");
  const initialOverview = await getDashboardAnalyticsAction("7d");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Financials"
        description={`Real-time sales performance, conversion funnels, and customer metrics for ${ctx.store.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Analytics" },
        ]}
      />

      <AnalyticsView initialOverview={initialOverview} />
    </div>
  );
}

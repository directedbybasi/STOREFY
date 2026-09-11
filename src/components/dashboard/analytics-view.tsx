"use client";

import React, { useState } from "react";
import type { DashboardAnalyticsOverview } from "@/modules/marketing/analytics/types";
import { getDashboardAnalyticsAction } from "@/modules/marketing/analytics/actions";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Users,
  RotateCcw,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface AnalyticsViewProps {
  initialOverview: DashboardAnalyticsOverview;
}

export function AnalyticsView({ initialOverview }: AnalyticsViewProps) {
  const [overview, setOverview] = useState<DashboardAnalyticsOverview>(initialOverview);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">(initialOverview.timeRange);
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeRangeChange = async (range: "today" | "7d" | "30d") => {
    try {
      setTimeRange(range);
      setIsLoading(true);
      const res = await getDashboardAnalyticsAction(range);
      setOverview(res);
    } finally {
      setIsLoading(false);
    }
  };

  const { financials, funnel, topProducts, campaigns } = overview;

  return (
    <div className="space-y-6">
      {/* Time Range Selector & Controls */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={isLoading}
              onClick={() => handleTimeRangeChange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === r
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>

        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Updating metrics...
          </span>
        )}
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Gross Sales"
          value={financials.grossSalesFormatted}
          helpText="Total orders placed"
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Net Sales"
          value={financials.netSalesFormatted}
          helpText="Revenue after refunds"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Orders"
          value={financials.totalOrders}
          helpText="Completed purchases"
          icon={<ShoppingBag className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Average Order Value"
          value={financials.averageOrderValueFormatted}
          helpText="Revenue per order"
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Refunds"
          value={financials.totalRefundsFormatted}
          helpText="Total return payouts"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Customers"
          value={financials.totalCustomers}
          helpText="Unique CRM accounts"
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Conversion Funnel Section */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Storefront Conversion Funnel
              </CardTitle>
              <CardDescription>
                Visitor progression from discovery through checkout completion.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall Conversion:</span>
              <Badge variant="success" dot className="font-tabular text-xs">
                {funnel.funnelPercentages.overallConversion}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Step 1: Product Views */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>1. Product Views</span>
                <span>100%</span>
              </div>
              <div className="text-lg font-semibold tracking-tight text-foreground font-tabular">
                {funnel.productViews.toLocaleString("en-IN")}
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full rounded-full" />
              </div>
              <p className="text-[10px] text-muted-foreground">Baseline views</p>
            </div>

            {/* Step 2: Added to Cart */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>2. Add to Cart</span>
                <span className="text-primary font-tabular">
                  {funnel.funnelPercentages.viewToCart}%
                </span>
              </div>
              <div className="text-lg font-semibold tracking-tight text-foreground font-tabular">
                {funnel.addToCart.toLocaleString("en-IN")}
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, funnel.funnelPercentages.viewToCart)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Of total views</p>
            </div>

            {/* Step 3: Checkout Started */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>3. Checkout</span>
                <span className="text-primary font-tabular">
                  {funnel.funnelPercentages.cartToCheckout}%
                </span>
              </div>
              <div className="text-lg font-semibold tracking-tight text-foreground font-tabular">
                {funnel.checkoutStarted.toLocaleString("en-IN")}
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, funnel.funnelPercentages.cartToCheckout)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Of active carts</p>
            </div>

            {/* Step 4: Payment Started */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>4. Payment</span>
                <span className="text-primary font-tabular">
                  {funnel.funnelPercentages.checkoutToPayment}%
                </span>
              </div>
              <div className="text-lg font-semibold tracking-tight text-foreground font-tabular">
                {funnel.paymentStarted.toLocaleString("en-IN")}
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, funnel.funnelPercentages.checkoutToPayment)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Of checkouts</p>
            </div>

            {/* Step 5: Completed Orders */}
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                <span>5. Orders</span>
                <span className="font-tabular">{funnel.funnelPercentages.paymentToOrder}%</span>
              </div>
              <div className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400 font-tabular">
                {funnel.ordersPlaced.toLocaleString("en-IN")}
              </div>
              <div className="h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, funnel.funnelPercentages.paymentToOrder)}%` }}
                />
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Products & Campaign Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Ranked by gross sales volume.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No orders recorded in this date range.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {topProducts.map((p, idx) => (
                  <div
                    key={p.productId}
                    className="px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-medium text-foreground truncate max-w-xs">{p.title}</h4>
                        <p className="text-[11px] text-muted-foreground font-tabular">
                          {p.totalQuantity} {p.totalQuantity === 1 ? "unit" : "units"} sold
                        </p>
                      </div>
                    </div>
                    <span className="font-tabular font-semibold text-foreground">
                      {p.totalRevenueFormatted}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Attribution */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Attribution</CardTitle>
                <CardDescription>Traffic sources identified via UTM tracking.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {campaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No campaign parameters detected yet.
              </div>
            ) : (
              <div className="divide-y divide-border text-xs">
                {campaigns.map((c, idx) => (
                  <div
                    key={`${c.utmSource}-${c.utmCampaign}-${idx}`}
                    className="px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">
                        {c.utmSource}{" "}
                        <span className="text-muted-foreground font-normal">/ {c.utmCampaign}</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-tabular">
                        {c.eventsCount} events recorded
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-tabular font-semibold text-foreground">
                        {c.sessionsCount}
                      </span>
                      <p className="text-[10px] text-muted-foreground">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

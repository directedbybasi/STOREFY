"use client";

import React, { useState } from "react";
import type { DashboardAnalyticsOverview } from "@/modules/marketing/analytics/types";
import { getDashboardAnalyticsAction } from "@/modules/marketing/analytics/actions";
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Users,
  RotateCcw,
  ArrowRight,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
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
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={isLoading}
              onClick={() => handleTimeRangeChange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timeRange === r
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "Last 7 Days" : "Last 30 Days"}
            </button>
          ))}
        </div>

        {isLoading && <span className="text-xs text-slate-400 animate-pulse">Refreshing metrics...</span>}
      </div>

      {/* Authoritative Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Gross Sales */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Gross Sales</span>
          <div className="text-xl font-bold text-white font-mono">{financials.grossSalesFormatted}</div>
          <span className="text-[10px] text-emerald-400">Authoritative orders</span>
        </div>

        {/* Net Sales */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Net Sales</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">{financials.netSalesFormatted}</div>
          <span className="text-[10px] text-slate-500">After refunds</span>
        </div>

        {/* Total Orders */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Total Orders</span>
          <div className="text-xl font-bold text-white font-mono">{financials.totalOrders}</div>
          <span className="text-[10px] text-slate-500">Confirmed purchases</span>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Average Order Value</span>
          <div className="text-xl font-bold text-white font-mono">{financials.averageOrderValueFormatted}</div>
          <span className="text-[10px] text-slate-500">Revenue per order</span>
        </div>

        {/* Total Refunds */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Total Refunds</span>
          <div className="text-xl font-bold text-rose-400 font-mono">{financials.totalRefundsFormatted}</div>
          <span className="text-[10px] text-rose-400/80">Completed payouts</span>
        </div>

        {/* Total Customers */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400">Customers</span>
          <div className="text-xl font-bold text-white font-mono">{financials.totalCustomers}</div>
          <span className="text-[10px] text-slate-500">Store CRM accounts</span>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400">
              Visitor progression from product discovery to completed checkout.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Overall Conversion: </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {funnel.funnelPercentages.overallConversion}%
            </span>
          </div>
        </div>

        {/* Funnel Steps Visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Step 1: Views */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] text-slate-400 block font-medium">1. Product Views</span>
            <div className="text-lg font-bold text-white font-mono">{funnel.productViews}</div>
            <div className="h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-full" />
            </div>
            <span className="text-[10px] text-slate-500">100% baseline</span>
          </div>

          {/* Step 2: Add to Cart */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] text-slate-400 block font-medium">2. Add to Cart</span>
            <div className="text-lg font-bold text-white font-mono">{funnel.addToCart}</div>
            <div className="h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${Math.min(100, funnel.funnelPercentages.viewToCart)}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400">{funnel.funnelPercentages.viewToCart}% of views</span>
          </div>

          {/* Step 3: Checkout Started */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] text-slate-400 block font-medium">3. Checkout Started</span>
            <div className="text-lg font-bold text-white font-mono">{funnel.checkoutStarted}</div>
            <div className="h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${Math.min(100, funnel.funnelPercentages.cartToCheckout)}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400">{funnel.funnelPercentages.cartToCheckout}% of carts</span>
          </div>

          {/* Step 4: Payment Started */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[11px] text-slate-400 block font-medium">4. Payment Started</span>
            <div className="text-lg font-bold text-white font-mono">{funnel.paymentStarted}</div>
            <div className="h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${Math.min(100, funnel.funnelPercentages.checkoutToPayment)}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400">
              {funnel.funnelPercentages.checkoutToPayment}% of checkouts
            </span>
          </div>

          {/* Step 5: Orders Placed */}
          <div className="p-4 bg-slate-950/80 border border-emerald-800/40 rounded-xl space-y-2">
            <span className="text-[11px] text-emerald-400 block font-medium">5. Orders Placed</span>
            <div className="text-lg font-bold text-emerald-400 font-mono">{funnel.ordersPlaced}</div>
            <div className="h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${Math.min(100, funnel.funnelPercentages.paymentToOrder)}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-400">
              {funnel.funnelPercentages.paymentToOrder}% completed
            </span>
          </div>
        </div>
      </div>

      {/* Top Products & Campaign Attribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products by Volume & Revenue */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Top Selling Products</h3>
            <span className="text-xs text-slate-500">By authoritative sales</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No orders recorded in this date range.</p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 first:pt-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-4">{idx + 1}</span>
                    <div>
                      <h4 className="font-semibold text-white truncate max-w-xs">{p.title}</h4>
                      <p className="text-[11px] text-slate-500">{p.totalQuantity} units sold</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{p.totalRevenueFormatted}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Attribution */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Campaign Attribution (UTM)</h3>
            <span className="text-xs text-slate-500">By traffic source</span>
          </div>

          {campaigns.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No campaign parameters detected yet.</p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs">
              {campaigns.map((c, idx) => (
                <div key={`${c.utmSource}-${c.utmCampaign}-${idx}`} className="py-3 first:pt-0 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">
                      {c.utmSource} / <span className="text-slate-400">{c.utmCampaign}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">{c.eventsCount} total events recorded</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{c.sessionsCount}</span>
                    <p className="text-[10px] text-slate-500">sessions</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

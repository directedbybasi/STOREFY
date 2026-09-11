import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Tag,
  Star,
  MessageCircle,
  Search,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/database/client";
import { coupons, couponRedemptions, productReviews, storeSettings } from "@/database/schema";
import { eq, sql, and } from "drizzle-orm";
import { formatPaiseToRupees } from "@/modules/cart";

export const metadata = {
  title: "Marketing & Growth Overview — STOREFY",
};

export default async function MarketingOverviewPage() {
  const ctx = await requirePermission("marketing:read");
  const storeId = ctx.store.id;

  // 1. Coupon statistics
  const [couponStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${coupons.isActive} = true)::int`,
    })
    .from(coupons)
    .where(eq(coupons.storeId, storeId));

  const [redemptionStats] = await db
    .select({
      totalRedemptions: sql<number>`count(*)::int`,
      totalDiscountGiven: sql<number>`coalesce(sum(${couponRedemptions.discountAmount}), 0)::bigint`,
    })
    .from(couponRedemptions)
    .where(eq(couponRedemptions.storeId, storeId));

  // 2. Reviews statistics
  const [reviewStats] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${productReviews.status} = 'PENDING')::int`,
      approved: sql<number>`count(*) filter (where ${productReviews.status} = 'APPROVED')::int`,
      averageRating: sql<number>`coalesce(avg(${productReviews.rating}) filter (where ${productReviews.status} = 'APPROVED'), 0)::float`,
    })
    .from(productReviews)
    .where(eq(productReviews.storeId, storeId));

  // 3. Store WhatsApp settings
  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId))
    .limit(1);

  const activeCoupons = couponStats?.active || 0;
  const totalRedemptions = redemptionStats?.totalRedemptions || 0;
  const totalDiscountPaise = Number(redemptionStats?.totalDiscountGiven || 0);
  const pendingReviews = reviewStats?.pending || 0;
  const approvedReviews = reviewStats?.approved || 0;
  const avgRating = Number((reviewStats?.averageRating || 0).toFixed(1));
  const isWhatsAppEnabled = !!settings?.whatsappOrderEnabled || !!settings?.whatsappSupportEnabled;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-400" />
            Marketing, Reviews & Growth
          </h1>
          <p className="text-xs text-slate-400">
            Grow sales, acquire repeat customers, and build social proof for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px] w-fit">
          Phase 11: Production
        </Badge>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Coupons */}
        <Card className="border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Coupons</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{activeCoupons}</span>
            <span className="text-xs text-slate-500">/ {couponStats?.total || 0} total</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for storefront checkout</p>
        </Card>

        {/* Total Redemptions */}
        <Card className="border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Redemptions</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{totalRedemptions}</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">
            {formatPaiseToRupees(totalDiscountPaise)} total discount granted
          </p>
        </Card>

        {/* Reviews & Social Proof */}
        <Card className="border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Customer Reviews</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {avgRating > 0 ? `${avgRating} ★` : "—"}
            </span>
            <span className="text-xs text-slate-500">({approvedReviews} approved)</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1">
            {pendingReviews > 0 ? `${pendingReviews} pending moderation` : "All reviews moderated"}
          </p>
        </Card>

        {/* WhatsApp & Channels */}
        <Card className="border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">WhatsApp Commerce</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-sm font-bold ${isWhatsAppEnabled ? "text-emerald-400" : "text-slate-400"}`}>
              {isWhatsAppEnabled ? "Active (Click-to-Chat)" : "Disabled"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {settings?.whatsappOrderPhone ? `Direct: +${settings.whatsappOrderPhone}` : "Phone not configured"}
          </p>
        </Card>
      </div>

      {/* Feature Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coupon Management Card */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Tag className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white">Coupons & Promo Codes</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create percentage discounts, flat amount off, BOGO offers, or free shipping rules with atomic usage limit guards.
            </p>
          </div>
          <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1">
            <Link href="/dashboard/marketing/coupons">
              <span>Manage Coupons</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>

        {/* Product Reviews Desk */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Star className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white">Product Reviews & Ratings</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Moderate verified buyer reviews, view star breakdowns, and approve testimonials with an immutable moderation audit log.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1">
            <Link href="/dashboard/reviews">
              <span>Moderate Reviews ({pendingReviews})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>

        {/* Analytics & Traffic Attribution */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <TrendingUp className="h-5 w-5" />
              <h3 className="text-sm font-bold text-white">Conversion & Attribution</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect server-authoritative gross sales, conversion funnel health, top-selling products, and UTM marketing campaign traffic.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-1">
            <Link href="/dashboard/analytics">
              <span>View Analytics</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

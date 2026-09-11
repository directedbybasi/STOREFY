import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Megaphone,
  Tag,
  Star,
  MessageCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/database/client";
import { coupons, couponRedemptions, productReviews, storeSettings } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { formatPaiseToRupees } from "@/modules/cart";

export const metadata = {
  title: "Marketing & Growth — STOREFY",
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
    <div className="space-y-6">
      <PageHeader
        title="Marketing & Growth"
        description={`Drive customer acquisition, repeat sales, and social proof for ${ctx.store.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Marketing" },
        ]}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/marketing/coupons">
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              Manage Coupons
            </Link>
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Coupons"
          value={activeCoupons}
          helpText={`${couponStats?.total || 0} total registered`}
          icon={<Tag className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Total Redemptions"
          value={totalRedemptions}
          helpText={`${formatPaiseToRupees(totalDiscountPaise)} granted`}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Average Rating"
          value={avgRating > 0 ? `${avgRating} ★` : "—"}
          helpText={`${approvedReviews} approved (${pendingReviews} pending)`}
          icon={<Star className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="WhatsApp Channel"
          value={isWhatsAppEnabled ? "Active" : "Disabled"}
          helpText={settings?.whatsappOrderPhone ? `+${settings.whatsappOrderPhone}` : "Not configured"}
          icon={<MessageCircle className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Feature Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coupons */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Tag className="h-4 w-4" />
              <CardTitle>Coupons & Promo Codes</CardTitle>
            </div>
            <CardDescription>
              Create percentage discounts, flat amount off, BOGO offers, or free shipping rules with usage limit protections.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild size="sm" className="w-full">
              <Link href="/dashboard/marketing/coupons">
                <span>Manage Coupons</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Star className="h-4 w-4" />
              <CardTitle>Product Reviews & Ratings</CardTitle>
            </div>
            <CardDescription>
              Moderate buyer reviews, verify purchaser authenticity, and highlight testimonials across your storefront catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/dashboard/reviews">
                <span>Moderate Reviews ({pendingReviews})</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <TrendingUp className="h-4 w-4" />
              <CardTitle>Conversion & Attribution</CardTitle>
            </div>
            <CardDescription>
              Analyze gross sales, checkout drop-off funnels, top selling products, and UTM marketing campaign sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/dashboard/analytics">
                <span>View Analytics</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

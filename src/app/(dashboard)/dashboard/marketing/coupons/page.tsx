import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreCouponsAction } from "@/modules/marketing/coupons/actions";
import { CouponManager } from "@/components/dashboard/coupon-manager";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Coupons & Discounts — STOREFY",
};

export default async function CouponsPage() {
  const ctx = await requirePermission("marketing:read");
  const coupons = await getStoreCouponsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons & Discounts"
        description={`Manage promotional codes, order discounts, and checkout rules for ${ctx.store.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Marketing", href: "/dashboard/marketing" },
          { label: "Coupons" },
        ]}
      />

      <CouponManager initialCoupons={coupons} storeCurrency={ctx.store.currency} />
    </div>
  );
}

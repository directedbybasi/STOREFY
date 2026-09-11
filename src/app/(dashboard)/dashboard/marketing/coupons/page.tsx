import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreCouponsAction } from "@/modules/marketing/coupons/actions";
import { CouponManager } from "@/components/dashboard/coupon-manager";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

export const metadata = {
  title: "Coupon & Discount Management — STOREFY",
};

export default async function CouponsPage() {
  const ctx = await requirePermission("marketing:read");
  const coupons = await getStoreCouponsAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-400" />
            Coupons & Discounts
          </h1>
          <p className="text-xs text-slate-400">
            Configure promotional promo codes, flash sales, and cart discount rules for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px] w-fit">
          Phase 11: Active
        </Badge>
      </div>

      <CouponManager initialCoupons={coupons} storeCurrency={ctx.store.currency} />
    </div>
  );
}

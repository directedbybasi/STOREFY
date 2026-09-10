import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Marketing & Discounts — STOREFY",
};

export default async function MarketingPage() {
  const ctx = await requirePermission("marketing:read");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing & Promotions</h1>
          <p className="text-xs text-slate-400">
            Discount coupons, promotional banners, and product review campaigns for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px] w-fit">
          Roadmap: Phase 10
        </Badge>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-12 text-center">
        <CardHeader className="p-0">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4 shadow-inner">
            <Megaphone className="h-7 w-7" />
          </div>
          <CardTitle className="text-base font-bold text-white">
            Marketing & Discount Tools Coming in Phase 10
          </CardTitle>
          <CardDescription className="mx-auto max-w-md text-xs text-slate-400 mt-1">
            Create coupon codes (percentage and flat discounts), set minimum order rules, and moderate verified customer reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button variant="outline" size="sm" asChild className="border-slate-700 text-xs text-slate-300">
            <Link href="/dashboard">Back to Overview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

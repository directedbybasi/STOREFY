import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Orders & Fulfillment — STOREFY",
};

export default async function OrdersPage() {
  const ctx = await requirePermission("orders:read");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Orders & Shipments</h1>
          <p className="text-xs text-slate-400">
            Real-time order queue, automated tracking, carrier fulfillment, and GST tax invoices for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-blue-500/30 bg-blue-950/40 text-blue-300 text-[10px] w-fit">
          Roadmap: Phase 6
        </Badge>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-12 text-center">
        <CardHeader className="p-0">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-4 shadow-inner">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <CardTitle className="text-base font-bold text-white">
            Order Processing Pipeline Coming in Phase 6
          </CardTitle>
          <CardDescription className="mx-auto max-w-md text-xs text-slate-400 mt-1">
            Orders placed on your storefront will appear here with instant courier routing, WhatsApp updates, and PDF invoice generation.
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

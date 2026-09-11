import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { listImportedMeeshoProducts } from "@/modules/marketplaces/import/import-service";
import { listMarketplaceOrderTasks } from "@/modules/marketplaces/orders/marketplace-order-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Meesho Reselling — STOREFY",
};

export default async function MeeshoDashboardPage() {
  const ctx = await requirePermission("marketplace:read");

  const [importedProducts, tasks] = await Promise.all([
    listImportedMeeshoProducts(ctx.store.id),
    listMarketplaceOrderTasks(ctx.store.id),
  ]);

  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const totalMarginPaise = importedProducts.reduce((sum, p) => sum + p.estimatedProfitPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-rose-400" />
            Meesho Reselling
          </h1>
          <p className="text-xs text-slate-400">
            Import, price, and manage Meesho marketplace products for {ctx.store.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/meesho/import">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Import Product
            </Button>
          </Link>
          <Link href="/dashboard/meesho/orders">
            <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
              Fulfillment Tasks ({pendingTasks.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-400">Imported Products</p>
                <h3 className="text-2xl font-bold text-white mt-1">{importedProducts.length}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Active in store catalog</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-400">Pending Tasks</p>
                <h3 className="text-2xl font-bold text-white mt-1">{pendingTasks.length}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting Meesho purchase</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-400">Total Potential Profit</p>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono">
                  {formatPaiseToRupees(totalMarginPaise)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Across imported catalog</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Imports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Quick Product Import</span>
              <Sparkles className="h-4 w-4 text-rose-400" />
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Paste a Meesho product URL or product code to fetch details, customize retail markup, and import to your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4 space-y-2">
              <p className="text-xs text-slate-300 font-medium">Supported Formats:</p>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>https://www.meesho.com/s/p/3b2a1</li>
                <li>https://meesho.com/product-title/p/123456</li>
                <li>Direct product code: 3b2a1, 123456, 789xyz</li>
              </ul>
            </div>
            <Link href="/dashboard/meesho/import" className="block">
              <Button className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs">
                Launch Import Tool <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Imported Catalog Preview</span>
              <Link href="/dashboard/meesho/products" className="text-xs text-rose-400 hover:underline">
                View all ({importedProducts.length})
              </Link>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Recently imported Meesho products and their selling margins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {importedProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No Meesho products imported yet. Use the import tool to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {importedProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-white truncate">{p.title}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Cost: {formatPaiseToRupees(p.sourceCostPaise)} | Sell: {formatPaiseToRupees(p.retailPricePaise)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px] shrink-0 font-mono">
                      +{formatPaiseToRupees(p.estimatedProfitPaise)} ({p.marginPercent}%)
                    </Badge>
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

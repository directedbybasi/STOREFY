import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { listImportedMeeshoProducts } from "@/modules/marketplaces/import/import-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Imported Meesho Products — STOREFY",
};

export default async function MeeshoProductsPage() {
  const ctx = await requirePermission("marketplace:read");
  const products = await listImportedMeeshoProducts(ctx.store.id);

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <Link href="/dashboard/meesho">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-400" />
              Imported Meesho Products
            </h1>
            <p className="text-xs text-slate-400">
              Manage external Meesho products imported into {ctx.store.name}.
            </p>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/60 text-center py-12">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No Meesho products imported yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Import high-demand wholesale items from Meesho, add your markup, and start reselling.
              </p>
            </div>
            <Link href="/dashboard/meesho/import">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Import First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/meesho">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-400" />
              Imported Meesho Products ({products.length})
            </h1>
            <p className="text-xs text-slate-400">
              Wholesale linkage, price tracking, and sync states.
            </p>
          </div>
        </div>
        <Link href="/dashboard/meesho/import">
          <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Import Product
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Store Product</th>
              <th className="px-4 py-3">Meesho ID</th>
              <th className="px-4 py-3">Wholesale Cost</th>
              <th className="px-4 py-3">Selling Price</th>
              <th className="px-4 py-3">Gross Margin</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Sync State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white truncate max-w-xs">{p.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Status: <span className={p.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}>{p.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">
                  {p.sourceProductId}
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">
                  {formatPaiseToRupees(p.sourceCostPaise)}
                </td>
                <td className="px-4 py-3 font-mono text-emerald-400 font-medium">
                  {formatPaiseToRupees(p.retailPricePaise)}
                </td>
                <td className="px-4 py-3 font-mono">
                  <span className="text-emerald-400">
                    +{formatPaiseToRupees(p.estimatedProfitPaise)} ({p.marginPercent}%)
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      p.availabilityStatus === "AVAILABLE"
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {p.availabilityStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                    {p.syncStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/products/${p.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

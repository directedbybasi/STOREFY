import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreMappings } from "@/modules/dropshipping/reseller-import/import-service";
import { db } from "@/database/client";
import { products, productVariants, suppliers, supplierProducts } from "@/database/schema";
import { eq, inArray } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Store,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Imported Dropshipping Products — STOREFY",
};

export default async function ImportedProductsPage() {
  const ctx = await requirePermission("dropshipping:read");
  const mappings = await getStoreMappings(ctx.store.id);

  if (mappings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <Link href="/dashboard/dropshipping">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-400" />
              Imported Products
            </h1>
            <p className="text-xs text-slate-400">
              Manage dropshipping products imported into {ctx.store.name}.
            </p>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/60 text-center py-12">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No products imported yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Explore our supplier marketplace to find high-margin products and import them to your store catalog with one click.
              </p>
            </div>
            <Link href="/dashboard/dropshipping">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
                <Store className="h-3.5 w-3.5 mr-1" /> Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch product titles and variants
  const productIds = Array.from(new Set(mappings.map((m) => m.productId)));
  const merchantProducts = await db
    .select({
      id: products.id,
      title: products.title,
      basePrice: products.basePrice,
      costPrice: products.costPrice,
      status: products.status,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const productMap = new Map(merchantProducts.map((p) => [p.id, p]));

  // Fetch supplier display names
  const supplierIds = Array.from(new Set(mappings.map((m) => m.supplierId)));
  const supplierRows = await db
    .select({
      id: suppliers.id,
      displayName: suppliers.displayName,
    })
    .from(suppliers)
    .where(inArray(suppliers.id, supplierIds));

  const supplierMap = new Map(supplierRows.map((s) => [s.id, s.displayName]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/dropshipping">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-400" />
              Imported Products ({mappings.length})
            </h1>
            <p className="text-xs text-slate-400">
              Live linkage between your catalog and platform suppliers.
            </p>
          </div>
        </div>
        <Link href="/dashboard/dropshipping">
          <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
            <Store className="h-3.5 w-3.5 mr-1" /> Browse More Products
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Store Product</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Supplier Cost</th>
              <th className="px-4 py-3">Selling Price</th>
              <th className="px-4 py-3">Estimated Margin</th>
              <th className="px-4 py-3">Auto-Sync</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {mappings.map((mapping) => {
              const product = productMap.get(mapping.productId);
              const supplierName = supplierMap.get(mapping.supplierId) || "Unknown Supplier";
              const retailPrice = product?.basePrice ?? 0;
              const costPrice = mapping.supplierCostSnapshot;
              const marginPaise = retailPrice - costPrice;
              const marginPercent = retailPrice > 0 ? Math.round((marginPaise / retailPrice) * 100) : 0;

              return (
                <tr key={mapping.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {product?.title || "Unknown Product"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      ID: {mapping.productId.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                      {supplierName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {formatPaiseToRupees(costPrice)}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-medium">
                    {formatPaiseToRupees(retailPrice)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={marginPaise >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {formatPaiseToRupees(marginPaise)} ({marginPercent}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          mapping.autoSyncPrice ? "bg-emerald-500" : "bg-slate-600"
                        }`}
                      />
                      <span className="text-[11px] text-slate-400">
                        {mapping.autoSyncPrice ? "Active" : "Manual"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/products/${mapping.productId}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

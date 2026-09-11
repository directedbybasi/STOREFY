import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { browseMarketplace } from "@/modules/dropshipping/supplier-catalog/catalog-service";
import { getStoreMappings } from "@/modules/dropshipping/reseller-import/import-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Package,
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  Search,
  Filter,
  Clock,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Dropshipping Marketplace — STOREFY",
};

export default async function DropshippingMarketplacePage() {
  const ctx = await requirePermission("dropshipping:read");

  const [marketplace, mappings] = await Promise.all([
    browseMarketplace({ limit: 20 }),
    getStoreMappings(ctx.store.id),
  ]);

  const importedSupplierProductIds = new Set(
    mappings.map((m) => m.supplierProductId)
  );

  const totalImported = mappings.length;
  const totalAvailable = marketplace.total;
  const uniqueSuppliers = new Set(marketplace.products.map((p) => p.supplierId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="h-5 w-5 text-violet-400" />
            Supplier Marketplace
          </h1>
          <p className="text-xs text-slate-400">
            Browse and import products from verified suppliers for {ctx.store.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/dropshipping/products">
            <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
              <Package className="h-3.5 w-3.5 mr-1" /> Imported Products ({totalImported})
            </Button>
          </Link>
          <Link href="/dashboard/dropshipping/orders">
            <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
              <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Supplier Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-violet-950/50 to-slate-900 border-violet-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-violet-300/80 uppercase tracking-wider">Available Products</p>
                <p className="text-2xl font-bold text-white mt-1">{totalAvailable}</p>
              </div>
              <Package className="h-8 w-8 text-violet-400/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border-emerald-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Imported Products</p>
                <p className="text-2xl font-bold text-white mt-1">{totalImported}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-950/50 to-slate-900 border-amber-500/20">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-300/80 uppercase tracking-wider">Active Suppliers</p>
                <p className="text-2xl font-bold text-white mt-1">{uniqueSuppliers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Featured Products</h2>
        {marketplace.products.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <Store className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No supplier products available yet.</p>
              <p className="text-xs text-slate-500 mt-1">Check back when suppliers publish their catalogs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketplace.products.map((product) => {
              const isImported = importedSupplierProductIds.has(product.id);
              const suggestedRetail = product.suggestedRetailPaise ?? Math.round(product.costPricePaise * 1.5);
              const estimatedMargin = suggestedRetail - product.costPricePaise;

              return (
                <Card key={product.id} className="bg-slate-900/60 border-slate-800 hover:border-violet-500/30 transition-colors group">
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="aspect-square bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-slate-600" />
                      )}
                    </div>

                    {/* Product Info */}
                    <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                      {product.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-2">
                      by {product.supplierDisplayName}
                    </p>

                    {/* Pricing */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs text-slate-400">Supplier Cost:</span>
                        <span className="text-sm font-semibold text-white ml-1">
                          {formatPaiseToRupees(product.costPricePaise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Suggested:</span>
                        <span className="text-sm font-medium text-emerald-400 ml-1">
                          {formatPaiseToRupees(suggestedRetail)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mb-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {product.processingTimeDays}d
                      </span>
                      {product.returnable && (
                        <span className="flex items-center gap-0.5">
                          <RefreshCw className="h-3 w-3" /> {product.returnWindowDays}d return
                        </span>
                      )}
                      <span>Stock: {product.totalStock}</span>
                    </div>

                    {/* Estimated Margin */}
                    <div className="bg-emerald-950/30 border border-emerald-500/10 rounded px-2 py-1.5 mb-3">
                      <span className="text-[10px] text-emerald-400/80">
                        Est. Margin: {formatPaiseToRupees(estimatedMargin)} per unit
                      </span>
                    </div>

                    {/* Action */}
                    {isImported ? (
                      <Badge className="w-full justify-center bg-emerald-900/30 text-emerald-400 border-emerald-500/20 text-[10px]">
                        ✓ Already Imported
                      </Badge>
                    ) : (
                      <Link href={`/dashboard/dropshipping/import/${product.id}`}>
                        <Button size="sm" className="w-full text-xs bg-violet-600 hover:bg-violet-500 text-white">
                          Import Product <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

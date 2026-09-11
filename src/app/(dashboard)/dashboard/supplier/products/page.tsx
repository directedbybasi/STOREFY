import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { listSupplierProducts } from "@/modules/dropshipping/supplier-catalog/catalog-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Plus,
  Eye,
  Archive,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Supplier Products — STOREFY",
};

export default async function SupplierProductsPage() {
  const ctx = await requirePermission("supplier:products");
  const supplier = await getSupplierByOrganization(ctx.organization.id);

  if (!supplier || supplier.status !== "APPROVED") {
    redirect("/dashboard/supplier");
  }

  const products = await listSupplierProducts(supplier.id);

  const activeCount = products.filter((p) => p.status === "ACTIVE").length;
  const draftCount = products.filter((p) => p.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-violet-400" />
            Supplier Catalog
          </h1>
          <p className="text-xs text-slate-400">
            {activeCount} active · {draftCount} draft products
          </p>
        </div>
        <Badge variant="outline" className="border-violet-500/30 bg-violet-950/40 text-violet-300 text-[10px] w-fit">
          Supplier Catalog
        </Badge>
      </div>

      {products.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-2">Your catalog is empty.</p>
            <p className="text-xs text-slate-500">Add products to start selling on the marketplace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-800/50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="h-6 w-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{product.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-400">
                        Cost: {formatPaiseToRupees(product.costPricePaise)}
                      </span>
                      {product.suggestedRetailPaise && (
                        <span className="text-[10px] text-emerald-400/80">
                          Suggested: {formatPaiseToRupees(product.suggestedRetailPaise)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {product.variants.length} variant(s) · Stock: {product.totalStock}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      product.status === "ACTIVE"
                        ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                        : product.status === "DRAFT"
                        ? "border-slate-500/30 bg-slate-950/40 text-slate-400"
                        : "border-amber-500/30 bg-amber-950/40 text-amber-300"
                    }`}
                  >
                    {product.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

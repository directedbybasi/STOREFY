import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Products & Catalog — STOREFY",
};

export default async function ProductsPage() {
  const ctx = await requirePermission("catalog:read");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Products & Catalog</h1>
          <p className="text-xs text-slate-400">
            Manage product variants, inventory, pricing, and visual builder assets for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-purple-500/30 bg-purple-950/40 text-purple-300 text-[10px] w-fit">
          Roadmap: Phase 4
        </Badge>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-12 text-center">
        <CardHeader className="p-0">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-4 shadow-inner">
            <Package className="h-7 w-7" />
          </div>
          <CardTitle className="text-base font-bold text-white">
            Product Catalog Engine Coming in Phase 4
          </CardTitle>
          <CardDescription className="mx-auto max-w-md text-xs text-slate-400 mt-1">
            The Phase 3 dashboard shell is prepared for catalog data. Full multi-variant creation, image galleries, and pricing matrices will be activated in Phase 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" asChild className="border-slate-700 text-xs text-slate-300">
              <Link href="/dashboard">Back to Overview</Link>
            </Button>
            <Button size="sm" disabled className="bg-purple-600 text-xs text-white opacity-60">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Product (Phase 4)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

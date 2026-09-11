import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { listImportedMeeshoProducts } from "@/modules/marketplaces/import/import-service";
import { listMarketplaceOrderTasks } from "@/modules/marketplaces/orders/marketplace-order-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowRight,
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
      <PageHeader
        title="Meesho Reselling"
        description={`Import, price, and synchronize catalog products from Meesho for ${ctx.store.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Meesho Reselling" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/meesho/orders">
                Fulfillment Tasks ({pendingTasks.length})
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/meesho/import">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Import Product
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Imported Products"
          value={importedProducts.length}
          helpText="Active in store catalog"
          icon={<Package className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Pending Tasks"
          value={pendingTasks.length}
          helpText="Awaiting order fulfillment"
          icon={<ShoppingBag className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Potential Profit"
          value={formatPaiseToRupees(totalMarginPaise)}
          helpText="Calculated from catalog markup"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Quick Actions & Recent Imports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Quick Product Import</CardTitle>
                <CardDescription>
                  Paste a Meesho product URL or code to import details with automatic retail markup.
                </CardDescription>
              </div>
              <Badge variant="secondary" dot>Meesho Sync</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="rounded-lg bg-muted/40 border border-border/70 p-3 space-y-1.5 text-xs">
              <p className="font-medium text-foreground">Supported Formats:</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside text-[11px]">
                <li>https://www.meesho.com/s/p/3b2a1</li>
                <li>https://meesho.com/product-title/p/123456</li>
                <li>Direct product code: 3b2a1, 123456</li>
              </ul>
            </div>
            <Button asChild size="sm" className="w-full">
              <Link href="/dashboard/meesho/import">
                <span>Launch Import Tool</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Imported Catalog</CardTitle>
                <CardDescription>Recently synchronized marketplace items.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="xs">
                <Link href="/dashboard/meesho/products">
                  View all ({importedProducts.length})
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {importedProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No Meesho products imported yet.
              </div>
            ) : (
              <div className="space-y-2">
                {importedProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground font-tabular font-mono">
                        Cost: {formatPaiseToRupees(p.sourceCostPaise)} | Sell: {formatPaiseToRupees(p.retailPricePaise)}
                      </p>
                    </div>
                    <Badge variant="success" dot className="font-tabular text-[10px] shrink-0">
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

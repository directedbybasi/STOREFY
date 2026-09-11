import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getSupplierByOrganization } from "@/modules/dropshipping/suppliers/supplier-service";
import { getSupplierAnalytics } from "@/modules/dropshipping/analytics/supplier-analytics-service";
import { getPayoutSummary } from "@/modules/dropshipping/payouts/settlement-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Building2,
  Package,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatPaiseToRupees } from "@/lib/currency";

export const metadata = {
  title: "Supplier Portal — STOREFY",
};

export default async function SupplierDashboardPage() {
  const ctx = await requirePermission("supplier:read");
  const supplier = await getSupplierByOrganization(ctx.organization.id);

  if (!supplier) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Supplier Portal"
          description="Fulfill merchant orders, sync warehouse stock, and track settlement payouts."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Supplier" },
          ]}
        />
        <Card className="py-12 text-center">
          <CardContent className="space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">You haven&apos;t registered as a supplier yet.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/supplier/register">
                Apply as Supplier <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = supplier.status === "APPROVED";

  let analytics = null;
  let payouts = null;

  if (isApproved) {
    [analytics, payouts] = await Promise.all([
      getSupplierAnalytics(supplier.id),
      getPayoutSummary(supplier.id),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.displayName}
        description={`Supplier Portal — ${supplier.businessName}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Supplier" },
        ]}
        actions={
          <Badge
            variant={
              supplier.status === "APPROVED"
                ? "success"
                : supplier.status === "PENDING"
                ? "warning"
                : "error"
            }
            dot
          >
            {supplier.status === "APPROVED"
              ? "Verified Supplier"
              : supplier.status === "PENDING"
              ? "Pending Verification"
              : supplier.status}
          </Badge>
        }
      />

      {/* Rejection / Suspension Notice */}
      {supplier.status === "REJECTED" && supplier.rejectionReason && (
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>Application Rejected: {supplier.rejectionReason}</span>
        </div>
      )}
      {supplier.status === "SUSPENDED" && supplier.suspensionReason && (
        <div className="p-3 rounded-lg border border-warning/20 bg-warning/10 text-warning text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Account Suspended: {supplier.suspensionReason}</span>
        </div>
      )}

      {/* Stats Grid */}
      {isApproved && analytics && payouts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Orders"
            value={analytics.totalOrders}
            helpText={`${analytics.fulfilledOrders} fulfilled`}
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Total Earnings"
            value={formatPaiseToRupees(payouts.totalEarningsPaise)}
            helpText={`${formatPaiseToRupees(payouts.pendingBalancePaise)} pending`}
            icon={<CreditCard className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Fulfillment Rate"
            value={`${analytics.fulfillmentRate}%`}
            helpText={`Avg ${analytics.avgProcessingHours}h processing`}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Fulfillment Quality"
            value={`${100 - analytics.rejectionRate}%`}
            helpText={`${analytics.rtoCount} RTO · ${analytics.rejectedOrders} rejected`}
            icon={<Package className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* Quick Links */}
      {isApproved && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/dashboard/supplier/products">
            <Card className="p-4 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-muted border border-border">
                    <Package className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Products</h4>
                    <p className="text-[11px] text-muted-foreground">Manage your catalog items</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/supplier/orders">
            <Card className="p-4 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-muted border border-border">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Orders</h4>
                    <p className="text-[11px] text-muted-foreground">Fulfill and ship packages</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/supplier/earnings">
            <Card className="p-4 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-muted border border-border">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Earnings</h4>
                    <p className="text-[11px] text-muted-foreground">Settlements and payout history</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}

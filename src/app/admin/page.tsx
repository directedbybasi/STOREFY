import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { organizations, stores, users } from "@/database/schema";
import { suppliers } from "@/database/schema/dropshipping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Building2,
  Store,
  Truck,
  Users as UsersIcon,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { sql } from "drizzle-orm";

export const metadata = {
  title: "Platform Overview — STOREFY ADMIN",
};

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  // Aggregate platform metrics
  const [
    orgCountResult,
    storeCountResult,
    supplierCountResult,
    userCountResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(organizations),
    db.select({ count: sql<number>`count(*)::int` }).from(stores),
    db.select({ count: sql<number>`count(*)::int`, status: suppliers.status }).from(suppliers).groupBy(suppliers.status).catch(() => []),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
  ]);

  const totalMerchants = orgCountResult[0]?.count || 0;
  const totalStores = storeCountResult[0]?.count || 0;
  const totalUsers = userCountResult[0]?.count || 0;

  const totalSuppliers = supplierCountResult.reduce((sum, r) => sum + (r.count || 0), 0);
  const verifiedSuppliers = supplierCountResult.find((r) => r.status === "APPROVED")?.count || 0;
  const pendingSuppliers = supplierCountResult.find((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW")?.count || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="STOREFY platform-wide tenant telemetry, merchant oversight, and verification queue."
        breadcrumbs={[
          { label: "Platform Admin", href: "/admin" },
          { label: "Overview" },
        ]}
        actions={
          <Badge variant="secondary" dot>
            Production Node Active
          </Badge>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Merchants"
          value={totalMerchants}
          helpText="Registered organizations"
          icon={<Building2 className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Active Stores"
          value={totalStores}
          helpText="Live commerce stores"
          icon={<Store className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Supplier Merchants"
          value={totalSuppliers}
          helpText={`${verifiedSuppliers} verified (${pendingSuppliers} pending)`}
          icon={<Truck className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Platform Users"
          value={totalUsers}
          helpText="Active user accounts"
          icon={<UsersIcon className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Supplier Capability & Verification Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Supplier Verification Queue
                </CardTitle>
                <CardDescription>Merchants awaiting B2B / supplier verification.</CardDescription>
              </div>
              <Badge variant={pendingSuppliers > 0 ? "warning" : "success"} dot>
                {pendingSuppliers} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">Pending Verification</p>
                  <p className="text-[11px] text-muted-foreground">Merchants awaiting supplier capability approval</p>
                </div>
              </div>
              <span className="font-semibold text-foreground font-tabular">{pendingSuppliers}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="font-medium text-foreground">Verified Suppliers</p>
                  <p className="text-[11px] text-muted-foreground">Active suppliers in distribution network</p>
                </div>
              </div>
              <span className="font-semibold text-foreground font-tabular">{verifiedSuppliers}</span>
            </div>

            <Button asChild size="sm" className="w-full">
              <Link href="/admin/suppliers">
                <span>Review Verification Queue</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Platform Account Architecture
            </CardTitle>
            <CardDescription>Canonical two-tier tenant structure.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-3">
            <p className="leading-relaxed">
              STOREFY enforces a strict 2-tier account architecture:
            </p>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1.5 font-mono text-[11px]">
              <div className="text-foreground font-semibold">1. PLATFORM ADMIN</div>
              <div className="pl-3 text-muted-foreground text-[10px]">Internal platform oversight, compliance, and systems</div>
              <div className="text-foreground font-semibold mt-1">2. MERCHANT</div>
              <div className="pl-3 text-muted-foreground text-[10px]">Merchant Store or Supplier capability</div>
              <div className="pl-6 text-muted-foreground text-[10px]">Shared RBAC: OWNER · ADMIN · MANAGER · STAFF · VIEWER</div>
            </div>
            <p className="text-[11px] leading-relaxed">
              Supplier is an account capability, not a disconnected role. Merchant staff manage catalog and fulfillment through unified RBAC policies.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

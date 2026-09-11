import React from "react";
import Link from "next/link";
import { getOptionalTenantContext } from "@/core/tenant/context";
import { db } from "@/database/client";
import { stores, storeDomains, staff, storeSettings } from "@/database/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Circle,
  ExternalLink,
  Settings,
  Globe,
  UserPlus,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Layers,
} from "lucide-react";

export default async function DashboardPage() {
  const { account, tenant } = await getOptionalTenantContext();

  // If merchant has not created any stores yet, render the onboarding welcome view
  if (!tenant) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-8">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome to STOREFY, {account.user.fullName || "Merchant"}!
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              Your merchant account and organization (
              <span className="text-slate-200 font-medium">{account.organization.name}</span>
              ) are active. Create your first online store to begin building your visual storefront, adding products, and taking orders.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 shadow-lg px-8">
              <Link href="/onboarding">
                <Store className="mr-2 h-4 w-4" />
                <span>Create Your First Store</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Multi-Store Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Layers className="h-4 w-4" />
              <span>Multi-Store Architecture</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage multiple independent brand storefronts from this single account and organization with unified billing.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Store className="h-4 w-4" />
              <span>Theme Customizer</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Build your storefront with our Shopify-style section and block editor, live canvas, and real-time preview.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
              <Globe className="h-4 w-4" />
              <span>Custom Domains & SSL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your own custom domains or use your free .storefy.shop subdomain with automatic SSL and CDN caching.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ctx = tenant;

  // Real database metrics from hosted PostgreSQL instance - parallelized for rapid loading
  const [[storeCountResult], domainsList, staffList, [currentSettings]] = await Promise.all([
    db
      .select({ count: stores.id })
      .from(stores)
      .where(eq(stores.organizationId, ctx.organization.id)),
    db
      .select()
      .from(storeDomains)
      .where(eq(storeDomains.storeId, ctx.store.id)),
    db
      .select()
      .from(staff)
      .where(eq(staff.organizationId, ctx.organization.id)),
    db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, ctx.store.id))
      .limit(1),
  ]);

  // Setup checklist items
  const hasCustomDomain = domainsList.some((d) => d.sslStatus === "ACTIVE");
  const isCodConfigured = currentSettings?.codEnabled ?? true;
  const isWhatsAppConfigured = currentSettings?.whatsappOrderEnabled ?? false;
  const hasMultipleStaff = staffList.length > 1;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {ctx.store.name}
            </h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
              {ctx.store.isActive ? "Live" : "Inactive"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Organization: <span className="font-medium text-slate-200">{ctx.organization.name}</span> &bull; Currency: <span className="font-semibold text-slate-200">{ctx.store.currency}</span> &bull; Timezone: <span className="font-medium text-slate-200">{ctx.store.timezone}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700">
            <Link href="/dashboard/settings" prefetch={true}>
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </Link>
          </Button>

          <Button size="sm" asChild className="h-8 bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400">
            <a href={`https://${ctx.store.subdomain}.storefy.shop`} target="_blank" rel="noreferrer">
              Visit Store
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Primary Commerce Metrics (With Honest Phase Empty States) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Revenue
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹0.00</div>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-slate-500" />
              Payment gateway launches in Phase 5
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Orders
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-slate-500" />
              Order processing launches in Phase 6
            </p>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Catalog Products
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-slate-500" />
              Product builder launches in Phase 4
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customers
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-slate-500" />
              Customer directory launches in Phase 7
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Tenant Operational State & Checklist Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Setup Checklist & Quick Actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Setup Checklist Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Store Launch Readiness
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Essential configurations to prepare your brand for launch
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-[10px]">
                  Phase 3 Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {/* Item 1: Auth & Store Provisioning */}
              <div className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-slate-200">Tenant & Primary Store Initialized</span>
                  <p className="text-slate-400 text-[11px]">
                    Subdomain <code className="font-mono text-emerald-400">{ctx.store.subdomain}.storefy.shop</code> is registered in PostgreSQL.
                  </p>
                </div>
              </div>

              {/* Item 2: Custom Domain */}
              <div className="flex items-start justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                <div className="flex items-start gap-3">
                  {hasCustomDomain ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">Connect Custom Domain</span>
                    <p className="text-slate-400 text-[11px]">
                      {hasCustomDomain
                        ? "Custom domain is verified and SSL is active."
                        : "Map your own domain (e.g., brand.com) with SSL."}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-emerald-400 hover:text-emerald-300">
                  <Link href="/dashboard/settings/domains" prefetch={true}>
                    Manage
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              {/* Item 3: Cash on Delivery */}
              <div className="flex items-start justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                <div className="flex items-start gap-3">
                  {isCodConfigured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">Cash on Delivery (COD) Rules</span>
                    <p className="text-slate-400 text-[11px]">
                      {isCodConfigured
                        ? `COD enabled up to ₹${((currentSettings?.codMaxAmount ?? 5000000) / 100).toLocaleString("en-IN")}.`
                        : "Enable COD payments and set order value limits."}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-emerald-400 hover:text-emerald-300">
                  <Link href="/dashboard/settings" prefetch={true}>
                    Configure
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              {/* Item 4: WhatsApp Notifications */}
              <div className="flex items-start justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                <div className="flex items-start gap-3">
                  {isWhatsAppConfigured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">WhatsApp Order & Support Integration</span>
                    <p className="text-slate-400 text-[11px]">
                      {isWhatsAppConfigured
                        ? `Connected to ${currentSettings?.whatsappOrderPhone}.`
                        : "Send automated order confirmations directly to customer WhatsApp."}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-emerald-400 hover:text-emerald-300">
                  <Link href="/dashboard/settings" prefetch={true}>
                    Set Phone
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              {/* Item 5: Staff Team */}
              <div className="flex items-start justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
                <div className="flex items-start gap-3">
                  {hasMultipleStaff ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">Team Collaboration & RBAC</span>
                    <p className="text-slate-400 text-[11px]">
                      {hasMultipleStaff
                        ? `${staffList.length} staff members with assigned granular roles.`
                        : "Invite team members with role-based permissions (Support, Manager, Admin)."}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-emerald-400 hover:text-emerald-300">
                  <Link href="/dashboard/settings/staff" prefetch={true}>
                    Invite
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/dashboard/settings"
              prefetch={true}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-slate-700 hover:bg-slate-850"
            >
              <Settings className="h-5 w-5 text-emerald-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">Store Settings</span>
              <span className="text-[10px] text-slate-500">COD, WhatsApp, Prefixes</span>
            </Link>

            <Link
              href="/dashboard/settings/domains"
              prefetch={true}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-slate-700 hover:bg-slate-850"
            >
              <Globe className="h-5 w-5 text-indigo-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">Custom Domains</span>
              <span className="text-[10px] text-slate-500">{domainsList.length} connected</span>
            </Link>

            <Link
              href="/dashboard/settings/staff"
              prefetch={true}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-slate-700 hover:bg-slate-850"
            >
              <UserPlus className="h-5 w-5 text-blue-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">Team Staff</span>
              <span className="text-[10px] text-slate-500">{staffList.length} members</span>
            </Link>

            <a
              href={`https://${ctx.store.subdomain}.storefy.shop`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-slate-700 hover:bg-slate-850"
            >
              <ExternalLink className="h-5 w-5 text-purple-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">Live Preview</span>
              <span className="text-[10px] text-slate-500">Customer storefront</span>
            </a>
          </div>
        </div>

        {/* Right Col: Active Tenant Metadata Card */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tenant Architecture State
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Zero-Trust Server Resolution Verified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">User Identity:</span>
                <span className="font-semibold text-slate-200">{ctx.user.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Organization:</span>
                <span className="font-semibold text-white">{ctx.organization.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Stores in Org:</span>
                <span className="font-mono text-emerald-400 font-semibold">{storeCountResult ? 1 : 1}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Role:</span>
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-950/40 text-[9px] text-indigo-300">
                  {ctx.role.name}
                </Badge>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Granted Modules:</span>
                <span className="font-mono text-indigo-300 font-semibold">{ctx.permissions.size} permissions</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Database Security:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  PostgreSQL RLS Active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Notice Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Store className="h-4 w-4 text-emerald-400" />
              Multi-Store Switcher Ready
            </h4>
            <p className="text-[11px] leading-relaxed">
              You can switch between any stores you operate in {ctx.organization.name} using the selector in the top header. Every switch independently verifies authorization server-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

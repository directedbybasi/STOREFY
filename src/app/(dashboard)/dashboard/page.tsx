import React from "react";
import { getTenantContext } from "@/core/tenant/context";
import { signOutAction } from "@/modules/auth/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ShieldCheck,
  ExternalLink,
  LogOut,
  KeyRound,
  CheckCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Dashboard Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 font-bold text-slate-950 shadow-md shadow-emerald-500/20">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">
                STORE<span className="text-emerald-400">FY</span>
              </span>
              <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Phase 2 Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-xs sm:flex">
              <span className="text-slate-400">Store:</span>
              <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                {ctx.store.name}
              </Badge>
            </div>

            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Welcome back, {ctx.user.fullName || ctx.user.email}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Active Tenant Session &bull; Organization:{" "}
                <span className="font-medium text-slate-200">{ctx.organization.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://${ctx.store.subdomain}.storefy.shop`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700"
              >
                <span>{ctx.store.subdomain}.storefy.shop</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Tenant Details Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Active Store Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  Active Store
                </CardTitle>
                <Store className="h-4 w-4 text-emerald-400" />
              </div>
              <CardDescription className="text-xs text-slate-400">
                Tenant ID: {ctx.store.id.slice(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{ctx.store.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Subdomain:</span>
                <span className="font-mono text-emerald-400">{ctx.store.subdomain}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Currency:</span>
                <span className="font-semibold text-slate-200">{ctx.store.currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <Badge
                  variant={ctx.store.isActive ? "default" : "destructive"}
                  className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]"
                >
                  {ctx.store.isActive ? "ONLINE" : "INACTIVE"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Access Control Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  Access & RBAC
                </CardTitle>
                <KeyRound className="h-4 w-4 text-indigo-400" />
              </div>
              <CardDescription className="text-xs text-slate-400">
                Staff ID: {ctx.staff.id.slice(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Role:</span>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                  {ctx.role.name}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Is Organization Owner:</span>
                <span className="font-semibold text-white">{ctx.isOwner ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Active Permissions:</span>
                <span className="font-mono text-indigo-300 font-semibold">
                  {ctx.permissions.size} modules
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Staff Membership:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Organization & Security Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-300">
                  Security & Isolation
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <CardDescription className="text-xs text-slate-400">
                Zero-Trust PostgreSQL RLS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Database Layer:</span>
                <span className="text-emerald-400 font-semibold">RLS Enforced</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Tenant Context:</span>
                <span className="text-emerald-400 font-semibold">Server Verified</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Session Type:</span>
                <span className="text-slate-200">HTTP-Only Cookie</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Cross-Tenant Isolation:</span>
                <span className="text-emerald-400 font-semibold">Protected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

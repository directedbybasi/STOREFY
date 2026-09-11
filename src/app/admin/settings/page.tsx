import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sliders, ShieldCheck, Server } from "lucide-react";

export const metadata = {
  title: "Platform Settings — Storefy Admin",
};

export default async function AdminSettingsPage() {
  await requirePlatformAdmin();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-5 w-5 text-violet-400" />
          Platform Configuration & Policies
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Storefy platform security controls, RBAC configuration, and environment boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Role & Capability Architecture Invariant
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-violet-400 font-bold">TOP-LEVEL AREAS: [PLATFORM_ADMIN, MERCHANT]</div>
              <div className="text-emerald-400">MERCHANT ROLES: [OWNER, ADMIN, MANAGER, STAFF, EDITOR, VIEWER]</div>
              <div className="text-cyan-400">MERCHANT CAPABILITY: [STANDARD, SUPPLIER]</div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Supplier is an account capability, NOT a separate role or separate account.
              Platform Admin is strictly decoupled from merchant staff roles.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              Environment & Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Platform Node Version:</span>
              <span className="font-mono text-slate-200">24.x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Next.js Engine:</span>
              <span className="font-mono text-slate-200">15.2+ (App Router)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Authorization Model:</span>
              <span className="font-mono text-emerald-400">Zero-Trust Server RBAC</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Database Provider:</span>
              <span className="font-mono text-slate-200">Hosted PostgreSQL (Tokyo Pooler)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Storefy Platform Administration",
  description: "Internal STOREFY platform management and operations portal.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side Platform Admin guard
  const adminAccount = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-violet-500/20 selection:text-violet-300">
      <AdminSidebar adminEmail={adminAccount.user.email} />
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">Platform Command Center</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 font-mono text-[11px] text-emerald-400">
              PRODUCTION CLUSTER
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

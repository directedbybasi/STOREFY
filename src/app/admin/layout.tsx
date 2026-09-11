import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "STOREFY ADMIN — Platform Operations",
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
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      <AdminSidebar adminEmail={adminAccount.user.email} />
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">Platform Command Center</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted/60 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
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

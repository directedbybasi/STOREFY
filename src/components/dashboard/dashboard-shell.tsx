"use client";

import React, { useState } from "react";
import { DashboardProvider, type AuthorizedStoreItem } from "./can";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { TenantContext } from "@/core/tenant/types";

interface DashboardShellProps {
  tenant: TenantContext;
  authorizedStores: AuthorizedStoreItem[];
  children: React.ReactNode;
}

export function DashboardShell({
  tenant,
  authorizedStores,
  children,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <DashboardProvider value={{ tenant, authorizedStores }}>
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        {/* Desktop Collapsible Sidebar */}
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex shrink-0 sticky top-0 h-screen"
        />

        {/* Mobile Slide-Over Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="p-0 border-r border-slate-800 bg-slate-950 w-72">
            <DashboardSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileDrawerOpen(false)}
              onItemClick={() => setMobileDrawerOpen(false)}
              className="h-full border-0"
            />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
          <DashboardHeader onOpenMobileSidebar={() => setMobileDrawerOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}

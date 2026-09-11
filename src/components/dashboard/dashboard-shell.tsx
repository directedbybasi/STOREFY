"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardProvider, type AuthorizedStoreItem, type DashboardTenantContext } from "./can";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardShellProps {
  tenant: DashboardTenantContext;
  authorizedStores: AuthorizedStoreItem[];
  children: React.ReactNode;
}

export function DashboardShell({
  tenant,
  authorizedStores,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Proactively pre-warm primary dashboard routes in client memory during idle time
  useEffect(() => {
    const primaryRoutes = [
      "/dashboard",
      "/dashboard/products",
      "/dashboard/orders",
      "/dashboard/inventory",
      "/dashboard/customers",
      "/dashboard/analytics",
      "/dashboard/settings",
      "/dashboard/ai",
      "/dashboard/settings/payments",
      "/dashboard/settings/shipping",
    ];

    const warmRoutes = () => {
      primaryRoutes.forEach((route, index) => {
        // Stagger prefetch requests slightly to allow idle execution
        setTimeout(() => {
          router.prefetch(route);
        }, index * 80);
      });
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => warmRoutes());
      } else {
        setTimeout(warmRoutes, 200);
      }
    }
  }, [router]);

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

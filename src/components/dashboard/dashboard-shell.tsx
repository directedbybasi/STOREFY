"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardProvider, type AuthorizedStoreItem, type DashboardTenantContext } from "./can";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import DashboardLoading from "@/app/(dashboard)/loading";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Clear navigation state whenever active route or query changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Safety fallback: ensure navigation indicator never gets stuck
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  // Global click & pointer intent interceptor for sub-10ms UI feedback across ALL dashboard links
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      try {
        const url = new URL(target.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith("/dashboard")) {
          // Prefetch on early pointer down (50-150ms before click completes)
          router.prefetch(url.pathname + url.search);
        }
      } catch {
        // ignore invalid urls
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      try {
        const url = new URL(target.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith("/dashboard")) {
          const currentFull = window.location.pathname + window.location.search;
          const targetFull = url.pathname + url.search;

          if (targetFull !== currentFull) {
            // Trigger instant navigation feedback (0ms perceived delay)
            setIsNavigating(true);
            router.prefetch(targetFull);
          }
        }
      } catch {
        // ignore invalid urls
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [router, pathname]);

  // Proactively pre-warm primary dashboard routes in client memory during idle time
  useEffect(() => {
    const primaryRoutes = [
      "/dashboard",
      "/dashboard/products",
      "/dashboard/products/categories",
      "/dashboard/products/collections",
      "/dashboard/orders",
      "/dashboard/inventory",
      "/dashboard/customers",
      "/dashboard/analytics",
      "/dashboard/marketing",
      "/dashboard/settings",
      "/dashboard/ai",
      "/dashboard/online-store/themes",
      "/dashboard/pos",
      "/dashboard/b2b",
      "/dashboard/settings/payments",
      "/dashboard/settings/shipping",
    ];

    const warmRoutes = () => {
      primaryRoutes.forEach((route, index) => {
        setTimeout(() => {
          router.prefetch(route);
        }, index * 60);
      });
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => warmRoutes());
      } else {
        setTimeout(warmRoutes, 150);
      }
    }
  }, [router]);

  return (
    <DashboardProvider value={{ tenant, authorizedStores }}>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 relative">
        {/* Top Navigation Progress Bar */}
        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 overflow-hidden pointer-events-none">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_#10b981] animate-pulse" />
          </div>
        )}

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
            {isNavigating ? (
              <div className="animate-in fade-in duration-100">
                <DashboardLoading />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}

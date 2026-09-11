"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardProvider, type AuthorizedStoreItem, type DashboardTenantContext } from "./can";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { CommandPalette } from "@/components/ui/command-palette";
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  // Global Ctrl/Cmd + K shortcut listener for Command Center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Global pointer intent interceptor for sub-10ms UI feedback
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      try {
        const url = new URL(target.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith("/dashboard")) {
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

  // Proactively pre-warm primary routes during idle time
  useEffect(() => {
    const primaryRoutes = [
      "/dashboard",
      "/dashboard/products",
      "/dashboard/orders",
      "/dashboard/inventory",
      "/dashboard/customers",
      "/dashboard/analytics",
      "/dashboard/marketing",
      "/dashboard/settings",
      "/dashboard/ai",
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
      <div className="flex min-h-screen bg-background text-foreground relative">
        {/* Top Navigation Progress Bar */}
        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden pointer-events-none">
            <div className="h-full w-full bg-primary animate-pulse" />
          </div>
        )}

        {/* Global Command Palette Dialog */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        {/* Desktop Collapsible Sidebar */}
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex shrink-0 sticky top-0 h-screen"
        />

        {/* Mobile Slide-Over Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="p-0 border-r border-border bg-card w-64">
            <DashboardSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileDrawerOpen(false)}
              onItemClick={() => setMobileDrawerOpen(false)}
              className="h-full border-0 w-full"
            />
          </SheetContent>
        </Sheet>

        {/* Main Content Area (Responsive 12-Column Alignment) */}
        <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
          <DashboardHeader
            onOpenMobileSidebar={() => setMobileDrawerOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />

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

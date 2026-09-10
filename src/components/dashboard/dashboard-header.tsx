"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreSwitcher } from "./store-switcher";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { Menu, Bell, ChevronRight, Home } from "lucide-react";

interface DashboardHeaderProps {
  onOpenMobileSidebar: () => void;
}

export function DashboardHeader({ onOpenMobileSidebar }: DashboardHeaderProps) {
  const pathname = usePathname();

  // Generate dynamic breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label =
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMobileSidebar}
          className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-850 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs sm:flex">
          <Link
            href="/dashboard"
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>

          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              {crumb.isLast ? (
                <span className="font-semibold text-slate-200">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-400 transition-colors hover:text-slate-200"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Store Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Real multi-store switcher */}
        <StoreSwitcher />

        {/* Notifications preview bell */}
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 text-slate-400 hover:bg-slate-850 hover:text-white"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Account Dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}

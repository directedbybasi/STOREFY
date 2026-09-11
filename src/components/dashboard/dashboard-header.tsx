"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreSwitcher } from "./store-switcher";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { Menu, Bell, ChevronRight, Home, Search, HelpCircle } from "lucide-react";

interface DashboardHeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette?: () => void;
}

export function DashboardHeader({
  onOpenMobileSidebar,
  onOpenCommandPalette,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  // Generate dynamic breadcrumbs (only for deeper pages as per Section 89)
  const segments = pathname.split("/").filter(Boolean);
  const isDeep = segments.length > 2;

  const breadcrumbs = segments.slice(1).map((segment, index) => {
    const href = "/" + segments.slice(0, index + 2).join("/");
    const label =
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    const isLast = index === segments.length - 2;
    return { href, label, isLast };
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Sidebar Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 overflow-hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenMobileSidebar}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        {/* Minimal Breadcrumb Navigation (Section 89: deeper pages only) */}
        {isDeep && (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs sm:flex">
            <Link
              href="/dashboard"
              className="text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>

            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.href}>
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                {crumb.isLast ? (
                  <span className="font-medium text-foreground truncate max-w-[160px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground/70 hover:text-foreground transition-colors truncate max-w-[120px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Center: Command Center Shortcut Button (Section 16 & 17) */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between gap-2 h-8 rounded-md border border-input bg-muted/20 px-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>Search Storefy...</span>
            </div>
            <kbd className="inline-flex h-4.5 items-center rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: Actions, Store Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile Command Palette Trigger */}
        {onOpenCommandPalette && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenCommandPalette}
            className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
            title="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="sr-only">Search</span>
          </Button>
        )}

        {/* Real Multi-Store Switcher */}
        <StoreSwitcher />

        {/* Documentation / Help Link */}
        <Link
          href="https://storefy.shop/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Storefy Help & Documentation"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="sr-only">Help</span>
        </Link>

        {/* Notifications Bell */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

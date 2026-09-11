"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "./can";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Boxes,
  Megaphone,
  BarChart3,
  Globe,
  Store,
  Building2,
  Truck,
  ShoppingBag,
  FileText,
  Sparkles,
  Bell,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  groupName: string;
  capability?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupName: "COMMERCE",
    items: [
      {
        title: "Orders",
        href: "/dashboard/orders",
        icon: ShoppingCart,
        permission: "orders:read",
      },
      {
        title: "Products",
        href: "/dashboard/products",
        icon: Package,
        permission: "catalog:read",
      },
      {
        title: "Inventory",
        href: "/dashboard/inventory",
        icon: Boxes,
        permission: "inventory:read",
      },
      {
        title: "Customers",
        href: "/dashboard/customers",
        icon: Users,
        permission: "customers:read",
      },
    ],
  },
  {
    groupName: "GROWTH",
    items: [
      {
        title: "Marketing",
        href: "/dashboard/marketing",
        icon: Megaphone,
        permission: "marketing:read",
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        permission: "analytics:view",
      },
    ],
  },
  {
    groupName: "CHANNELS",
    items: [
      {
        title: "Online Store",
        href: "/dashboard/online-store/themes",
        icon: Globe,
        permission: "builder:read",
      },
      {
        title: "POS",
        href: "/dashboard/pos",
        icon: Store,
        permission: "pos:read",
      },
      {
        title: "B2B",
        href: "/dashboard/b2b",
        icon: Building2,
        permission: "b2b:read",
      },
      {
        title: "Supplier",
        href: "/dashboard/supplier",
        icon: Truck,
        permission: "supplier:read",
      },
      {
        title: "Meesho",
        href: "/dashboard/meesho",
        icon: ShoppingBag,
        permission: "marketplace:read",
      },
    ],
  },
  {
    groupName: "CONTENT",
    items: [
      {
        title: "Pages",
        href: "/dashboard/content",
        icon: FileText,
        permission: "content:read",
      },
    ],
  },
  {
    groupName: "TOOLS",
    items: [
      {
        title: "AI Intelligence",
        href: "/dashboard/ai",
        icon: Sparkles,
        permission: "catalog:read",
      },
      {
        title: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        permission: "dashboard:view",
      },
    ],
  },
  {
    groupName: "DEVELOPER",
    items: [
      {
        title: "Developer",
        href: "/dashboard/settings/developer",
        icon: Code,
        permission: "developer:read",
      },
    ],
  },
  {
    groupName: "SETTINGS",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        permission: "settings:read",
      },
    ],
  },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void;
  className?: string;
}

export function DashboardSidebar({
  collapsed,
  onToggleCollapse,
  onItemClick,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant } = useDashboard();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending optimistic state on path update
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const effectivePath = pendingHref || pathname;

  const handleNavTrigger = (href: string, targetEl?: HTMLElement | null) => {
    if (targetEl) {
      document.querySelectorAll('aside a[data-active="true"]').forEach((el) => {
        el.setAttribute("data-active", "false");
        el.removeAttribute("aria-current");
        el.classList.remove("bg-accent", "text-foreground", "font-semibold");
        el.classList.add("text-muted-foreground");
      });
      targetEl.setAttribute("data-active", "true");
      targetEl.setAttribute("aria-current", "page");
      targetEl.classList.add("bg-accent", "text-foreground", "font-semibold");
      targetEl.classList.remove("text-muted-foreground");
    }
    setPendingHref(href);
  };

  const isOverviewActive = effectivePath === "/dashboard";

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-180 select-none",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Brand & Store Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3.5">
        <Link
          href="/dashboard"
          prefetch={true}
          onPointerEnter={() => router.prefetch("/dashboard")}
          onPointerDown={(e) => {
            handleNavTrigger("/dashboard", e.currentTarget);
            router.prefetch("/dashboard");
          }}
          onClick={(e) => {
            handleNavTrigger("/dashboard", e.currentTarget);
            onItemClick?.();
          }}
          className="flex items-center gap-2 overflow-hidden text-sm font-bold tracking-tight text-foreground"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-xs">
            S
          </div>
          {!collapsed && (
            <span className="truncate tracking-tight font-semibold">
              STOREFY
            </span>
          )}
        </Link>

        {/* Collapse toggle button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-6 w-6 p-0 text-muted-foreground hover:text-foreground md:flex"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
        {/* Top-level Overview Link */}
        <div>
          <Link
            href="/dashboard"
            prefetch={true}
            aria-current={isOverviewActive ? "page" : undefined}
            data-active={isOverviewActive ? "true" : "false"}
            onPointerEnter={() => router.prefetch("/dashboard")}
            onPointerDown={(e) => {
              handleNavTrigger("/dashboard", e.currentTarget);
              router.prefetch("/dashboard");
            }}
            onClick={(e) => {
              handleNavTrigger("/dashboard", e.currentTarget);
              onItemClick?.();
            }}
            title={collapsed ? "Overview" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isOverviewActive
                ? "bg-accent text-accent-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:rounded-r before:bg-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <LayoutDashboard
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isOverviewActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {!collapsed && <span className="truncate">Overview</span>}
          </Link>
        </div>

        {/* Categorized Groups */}
        {NAV_GROUPS.map((group) => {
          // If group requires a capability (e.g. SUPPLIER), verify capability
          if (group.capability && !tenant.user.isPlatformAdmin && !tenant.capabilities?.has(group.capability)) {
            return null;
          }

          // Filter items based on permissions
          const accessibleItems = group.items.filter((item) => {
            // Channel supplier gating
            if (item.href.startsWith("/dashboard/supplier")) {
              if (!tenant.user.isPlatformAdmin && !tenant.capabilities?.has("SUPPLIER")) {
                return false;
              }
            }
            if (!item.permission) return true;
            if (tenant.user.isPlatformAdmin || tenant.isOwner) return true;
            return tenant.permissions.has(item.permission);
          });

          if (accessibleItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.groupName}
                </div>
              )}

              <nav className="space-y-0.5">
                {accessibleItems.map((item) => {
                  const isActive =
                    effectivePath === item.href ||
                    (item.href !== "/dashboard" && effectivePath.startsWith(item.href + "/"));

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      aria-current={isActive ? "page" : undefined}
                      data-active={isActive ? "true" : "false"}
                      onPointerEnter={() => router.prefetch(item.href)}
                      onPointerDown={(e) => {
                        handleNavTrigger(item.href, e.currentTarget);
                        router.prefetch(item.href);
                      }}
                      onClick={(e) => {
                        handleNavTrigger(item.href, e.currentTarget);
                        onItemClick?.();
                      }}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:rounded-r before:bg-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Platform Admin Console Link (For Platform Admin Users) */}
      {!collapsed && tenant.user.isPlatformAdmin && (
        <div className="border-t border-border p-2.5">
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-md border border-violet-500/20 bg-violet-500/5 p-2 text-xs text-violet-700 dark:text-violet-300 transition-colors hover:bg-violet-500/10"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-[11px] leading-tight text-foreground">Platform Admin</p>
                <p className="text-[10px] text-muted-foreground">Storefy Operations</p>
              </div>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          </Link>
        </div>
      )}

      {/* Footer Storefront Link */}
      {!collapsed && tenant.store && (
        <div className="border-t border-border p-2.5">
          <a
            href={`https://${tenant.store.subdomain}.storefy.shop`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <div className="truncate min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Live Storefront
              </p>
              <p className="truncate font-mono text-[10px] text-foreground font-medium">
                {tenant.store.subdomain}.storefy.shop
              </p>
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </a>
        </div>
      )}
    </aside>
  );
}

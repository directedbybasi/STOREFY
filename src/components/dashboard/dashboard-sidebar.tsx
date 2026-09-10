"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "./can";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  Globe,
  UserCheck,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Palette,
  Brush,
  FolderTree,
  Layers,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Main",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Products",
        href: "/dashboard/products",
        icon: Package,
        permission: "catalog:read",
      },
      {
        title: "Categories",
        href: "/dashboard/products/categories",
        icon: FolderTree,
        permission: "catalog:read",
      },
      {
        title: "Collections",
        href: "/dashboard/products/collections",
        icon: Layers,
        permission: "catalog:read",
      },
      {
        title: "Inventory",
        href: "/dashboard/inventory",
        icon: Boxes,
        permission: "inventory:read",
      },
      {
        title: "Orders",
        href: "/dashboard/orders",
        icon: ShoppingCart,
        permission: "orders:read",
        badge: "Phase 9",
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
    groupName: "Sales Channels",
    items: [
      {
        title: "Themes",
        href: "/dashboard/online-store/themes",
        icon: Palette,
        permission: "builder:read",
      },
      {
        title: "Theme Customizer",
        href: "/dashboard/online-store/themes/customizer",
        icon: Brush,
        permission: "builder:write",
      },
    ],
  },
  {
    groupName: "Growth",
    items: [
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        permission: "analytics:view",
        badge: "Phase 11",
      },
      {
        title: "Marketing",
        href: "/dashboard/marketing",
        icon: Megaphone,
        permission: "marketing:read",
        badge: "Phase 10",
      },
    ],
  },
  {
    groupName: "Store Operations",
    items: [
      {
        title: "Store Settings",
        href: "/dashboard/settings",
        icon: Settings,
        permission: "settings:read",
      },
      {
        title: "Custom Domains",
        href: "/dashboard/settings/domains",
        icon: Globe,
        permission: "domains:manage",
      },
      {
        title: "Staff & RBAC",
        href: "/dashboard/settings/staff",
        icon: UserCheck,
        permission: "staff:read",
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
  const { tenant } = useDashboard();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-800/80 bg-slate-950 text-slate-200 transition-all duration-300 select-none",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden font-black tracking-tight text-white"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20">
            <ShoppingBag className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="truncate text-lg">
              STORE<span className="text-emerald-400">FY</span>
            </span>
          )}
        </Link>

        {/* Collapse toggle (Desktop) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="hidden h-7 w-7 p-0 text-slate-400 hover:bg-slate-800 hover:text-white md:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          // Filter items based on user permissions
          const accessibleItems = group.items.filter((item) => {
            if (!item.permission) return true;
            if (tenant.user.isPlatformAdmin || tenant.isOwner) return true;
            return tenant.permissions.has(item.permission);
          });

          if (accessibleItems.length === 0) return null;

          return (
            <div key={group.groupName} className="space-y-1">
              {!collapsed && (
                <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.groupName}
                </h4>
              )}

              <nav className="space-y-0.5">
                {accessibleItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-emerald-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        )}
                      />

                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between">
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer / Storefront link */}
      {!collapsed && tenant.store && (
        <div className="border-t border-slate-800/80 p-3">
          <a
            href={`https://${tenant.store.subdomain}.storefy.shop`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-850"
          >
            <div className="truncate">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Live Storefront
              </p>
              <p className="truncate font-mono text-[11px] text-emerald-400">
                {tenant.store.subdomain}.storefy.shop
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </a>
        </div>
      )}
    </aside>
  );
}

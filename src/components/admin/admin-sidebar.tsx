"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Store,
  Truck,
  FileText,
  Sliders,
  LayoutDashboard,
  ExternalLink,
  LifeBuoy,
  CreditCard,
  AlertTriangle,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Merchants",
    href: "/admin/merchants",
    icon: Building2,
  },
  {
    title: "Stores",
    href: "/admin/stores",
    icon: Store,
  },
  {
    title: "Suppliers",
    href: "/admin/suppliers",
    icon: Truck,
  },
  {
    title: "Support",
    href: "/admin/support",
    icon: LifeBuoy,
  },
  {
    title: "Billing",
    href: "/admin/billing",
    icon: CreditCard,
  },
  {
    title: "Risk & Fraud",
    href: "/admin/risk",
    icon: AlertTriangle,
  },
  {
    title: "Audit History",
    href: "/admin/audit",
    icon: FileText,
  },
  {
    title: "System & Settings",
    href: "/admin/settings",
    icon: Server,
  },
];

interface AdminSidebarProps {
  adminEmail: string;
}

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-xs">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight text-foreground text-xs uppercase">
            STOREFY
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border uppercase tracking-wider">
            ADMIN
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Operations
        </p>
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors relative",
                isActive
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Admin user profile & link to merchant dashboard */}
      <div className="border-t border-border p-3 space-y-2.5 bg-muted/20">
        <div className="truncate text-xs">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Logged in as</p>
          <p className="truncate text-foreground font-mono text-[11px] mt-0.5">{adminEmail}</p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        >
          <span>Merchant Dashboard</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}

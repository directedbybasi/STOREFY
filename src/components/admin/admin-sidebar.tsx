"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Store,
  Truck,
  Users,
  FileText,
  Sliders,
  LayoutDashboard,
  ExternalLink,
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
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    href: "/admin/audit",
    icon: FileText,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Sliders,
  },
];

interface AdminSidebarProps {
  adminEmail: string;
}

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-800 bg-slate-900/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div>
          <span className="font-black tracking-tight text-white text-sm">
            STORE<span className="text-violet-400">FY</span>
          </span>
          <span className="ml-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/30">
            ADMIN
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-violet-600/15 text-violet-300 font-semibold border border-violet-500/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-slate-500")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Admin user profile & link to merchant dashboard */}
      <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs">
          <div className="truncate">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Logged in as</p>
            <p className="truncate text-slate-300 font-mono text-[11px]">{adminEmail}</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
        >
          <span>Merchant Dashboard</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}

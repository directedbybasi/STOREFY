"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useDashboard } from "./can";
import { signOutAction } from "@/modules/auth/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Globe, Users, LogOut, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";

export function UserMenu() {
  const { tenant } = useDashboard();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const displayName = tenant.user.fullName || tenant.user.email.split("@")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white focus-visible:ring-emerald-500"
        >
          {initials || <UserIcon className="h-4 w-4" />}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">{displayName}</span>
            <Badge
              variant="outline"
              className="border-indigo-500/30 bg-indigo-950/40 text-[9px] font-semibold text-indigo-300"
            >
              {tenant.role.name}
            </Badge>
          </div>
          <p className="truncate text-[11px] text-slate-400">{tenant.user.email}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>{tenant.organization.name}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/settings"
            className="flex w-full items-center gap-2 text-xs text-slate-200"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            Store Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/settings/domains"
            className="flex w-full items-center gap-2 text-xs text-slate-200"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            Custom Domains
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/settings/staff"
            className="flex w-full items-center gap-2 text-xs text-slate-200"
          >
            <Users className="h-3.5 w-3.5 text-slate-400" />
            Staff & RBAC
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isPending}
          className="flex cursor-pointer items-center gap-2 text-xs text-rose-400 focus:bg-rose-950/30 focus:text-rose-300"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

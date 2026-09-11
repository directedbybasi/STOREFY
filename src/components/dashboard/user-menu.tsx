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
  DropdownMenuGroup,
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
          size="icon-sm"
          disabled={isPending}
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60 text-[11px] font-semibold text-foreground hover:bg-muted focus-visible:ring-1.5 focus-visible:ring-ring"
        >
          {initials || <UserIcon className="h-3.5 w-3.5" />}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-background" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5 bg-popover border-border">
        <DropdownMenuLabel className="space-y-1 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground truncate">{displayName}</span>
            <Badge
              variant="neutral"
              className="text-[10px] px-1.5 py-0 font-medium"
            >
              {tenant.role.name}
            </Badge>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{tenant.user.email}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pt-0.5">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <span className="truncate">{tenant.organization.name}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/dashboard/settings"
              className="flex w-full items-center gap-2 text-xs text-foreground"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Store Settings</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/dashboard/settings/domains"
              className="flex w-full items-center gap-2 text-xs text-foreground"
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Custom Domains</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/dashboard/settings/staff"
              className="flex w-full items-center gap-2 text-xs text-foreground"
            >
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Staff & Permissions</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isPending}
          className="flex w-full items-center gap-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-600 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

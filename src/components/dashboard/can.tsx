"use client";

import React, { createContext, useContext } from "react";
import type { TenantContext } from "@/core/tenant/types";

export interface AuthorizedStoreItem {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  isActive: boolean;
  roleName: string;
}

export interface DashboardContextValue {
  tenant: TenantContext;
  authorizedStores: AuthorizedStoreItem[];
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  value,
  children,
}: {
  value: DashboardContextValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function usePermission(permissionCode: string): boolean {
  const { tenant } = useDashboard();
  if (tenant.user.isPlatformAdmin || tenant.isOwner) {
    return true;
  }
  return tenant.permissions.has(permissionCode);
}

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const isAllowed = usePermission(permission);
  if (!isAllowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

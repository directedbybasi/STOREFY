import React from "react";
import { getOptionalTenantContext, getOrgStores } from "@/core/tenant/context";
import { db } from "@/database/client";
import { stores, staff, roles } from "@/database/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { AuthorizedStoreItem } from "@/components/dashboard/can";

export const metadata = {
  title: "Merchant Dashboard — STOREFY",
  description: "Manage your online stores, catalog, orders, team, and settings.",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Resolve and verify active account / tenant context server-side
  const { account, tenant } = await getOptionalTenantContext();

  // 2. Fetch all stores in the organization that this user is authorized to access
  const storeMap = new Map<string, AuthorizedStoreItem>();

  if (account.isOwner || account.user.isPlatformAdmin) {
    // Fast path: Owners and Platform Admins have full access to all organization stores.
    // Reuses the memoized org stores query (0ms additional DB query).
    const orgStores = await getOrgStores(account.organization.id);
    for (const store of orgStores) {
      storeMap.set(store.id, {
        id: store.id,
        name: store.name,
        subdomain: store.subdomain,
        customDomain: store.customDomain,
        isActive: store.isActive,
        roleName: account.role.name,
      });
    }
  } else {
    // Standard path for scoped staff members
    const membershipQuery = await db
      .select({
        store: stores,
        roleName: roles.name,
      })
      .from(stores)
      .innerJoin(
        staff,
        and(
          eq(staff.organizationId, account.organization.id),
          eq(staff.userId, account.user.id),
          eq(staff.isActive, true),
          or(isNull(staff.storeId), eq(staff.storeId, stores.id))
        )
      )
      .innerJoin(roles, eq(staff.roleId, roles.id))
      .where(eq(stores.organizationId, account.organization.id));

    for (const row of membershipQuery) {
      if (!storeMap.has(row.store.id)) {
        storeMap.set(row.store.id, {
          id: row.store.id,
          name: row.store.name,
          subdomain: row.store.subdomain,
          customDomain: row.store.customDomain,
          isActive: row.store.isActive,
          roleName: row.roleName,
        });
      }
    }
  }

  // Ensure current store is always in the list if one is active
  if (tenant?.store && !storeMap.has(tenant.store.id)) {
    storeMap.set(tenant.store.id, {
      id: tenant.store.id,
      name: tenant.store.name,
      subdomain: tenant.store.subdomain,
      customDomain: tenant.store.customDomain,
      isActive: tenant.store.isActive,
      roleName: tenant.role.name,
    });
  }

  const authorizedStores = Array.from(storeMap.values());
  const shellTenant = tenant || { ...account, store: null };

  return (
    <DashboardShell tenant={shellTenant} authorizedStores={authorizedStores}>
      {children}
    </DashboardShell>
  );
}

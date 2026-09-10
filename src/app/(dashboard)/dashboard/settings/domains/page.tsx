import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { storeDomains } from "@/database/schema";
import { eq } from "drizzle-orm";
import { DomainsClient } from "./domains-client";

export const metadata = {
  title: "Custom Domains — STOREFY",
};

export default async function DomainsPage() {
  const ctx = await requirePermission("domains:manage");

  // Fetch all custom domains for the current store
  const customDomains = await db
    .select()
    .from(storeDomains)
    .where(eq(storeDomains.storeId, ctx.store.id));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold text-white">Custom Domains & SSL</h1>
        <p className="text-xs text-slate-400">
          Connect your custom domain name and manage SSL edge certificates for{" "}
          <span className="font-semibold text-emerald-400">{ctx.store.name}</span>.
        </p>
      </div>

      <DomainsClient subdomain={ctx.store.subdomain} customDomains={customDomains} />
    </div>
  );
}

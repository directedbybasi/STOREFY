import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { organizations } from "@/database/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Store, Truck } from "lucide-react";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Merchants Management — Storefy Admin",
};

export default async function AdminMerchantsPage() {
  await requirePlatformAdmin();

  // Query all organizations with store counts and supplier status
  const orgList = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      billingEmail: organizations.billingEmail,
      merchantType: organizations.merchantType,
      createdAt: organizations.createdAt,
      storeCount: sql<number>`(SELECT count(*)::int FROM stores WHERE stores.organization_id = organizations.id)`,
      hasSupplierRecord: sql<boolean>`EXISTS (SELECT 1 FROM suppliers WHERE suppliers.organization_id = organizations.id)`,
      supplierStatus: sql<string | null>`(SELECT status FROM suppliers WHERE suppliers.organization_id = organizations.id LIMIT 1)`,
    })
    .from(organizations)
    .orderBy(organizations.createdAt);

  async function toggleSupplierCapability(formData: FormData) {
    "use server";
    await requirePlatformAdmin();
    const orgId = formData.get("orgId") as string;
    const currentType = formData.get("currentType") as string;
    const newType = currentType === "SUPPLIER" ? "STANDARD" : "SUPPLIER";

    await db
      .update(organizations)
      .set({ merchantType: newType, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    revalidatePath("/admin/merchants");
    revalidatePath("/admin");
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-400" />
            Merchant Organizations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform-wide directory of merchant accounts and supplier capability controls.
          </p>
        </div>
        <Badge variant="outline" className="border-slate-800 text-slate-400 font-mono text-xs">
          {orgList.length} Total Merchants
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Organization</th>
                <th className="p-3.5">Billing Email</th>
                <th className="p-3.5">Stores</th>
                <th className="p-3.5">Account Capability</th>
                <th className="p-3.5">Supplier Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {orgList.map((org) => {
                const isSupplier = org.merchantType === "SUPPLIER" || org.hasSupplierRecord;
                return (
                  <tr key={org.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{org.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{org.slug}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{org.billingEmail}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                        <Store className="h-3 w-3 text-slate-500" />
                        {org.storeCount}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {isSupplier ? (
                        <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 gap-1 text-[10px]">
                          <Truck className="h-3 w-3" />
                          SUPPLIER
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px]">
                          STANDARD
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5">
                      {org.supplierStatus ? (
                        <span className="font-mono text-[11px] text-emerald-400">
                          {org.supplierStatus}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <form action={toggleSupplierCapability}>
                        <input type="hidden" name="orgId" value={org.id} />
                        <input type="hidden" name="currentType" value={org.merchantType} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-slate-700 text-slate-300 hover:text-white"
                        >
                          {isSupplier ? "Disable Supplier" : "Enable Supplier"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

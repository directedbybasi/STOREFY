import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { stores, organizations } from "@/database/schema";
import { Badge } from "@/components/ui/badge";
import { Store, Globe } from "lucide-react";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Stores Oversight — Storefy Admin",
};

export default async function AdminStoresPage() {
  await requirePlatformAdmin();

  const storeList = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      subdomain: stores.subdomain,
      customDomain: stores.customDomain,
      status: stores.status,
      isActive: stores.isActive,
      organizationName: organizations.name,
      createdAt: stores.createdAt,
    })
    .from(stores)
    .innerJoin(organizations, eq(stores.organizationId, organizations.id))
    .orderBy(stores.createdAt);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-400" />
            Platform Stores
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global oversight of merchant storefronts, tenant subdomains, and custom domain routings.
          </p>
        </div>
        <Badge variant="outline" className="border-slate-800 text-slate-400 font-mono text-xs">
          {storeList.length} Active Stores
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Store Name</th>
                <th className="p-3.5">Organization</th>
                <th className="p-3.5">Subdomain</th>
                <th className="p-3.5">Custom Domain</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {storeList.map((st) => (
                <tr key={st.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="p-3.5 font-semibold text-white">{st.name}</td>
                  <td className="p-3.5 text-slate-400">{st.organizationName}</td>
                  <td className="p-3.5 font-mono text-emerald-400">{st.subdomain}.storefy.shop</td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {st.customDomain ? (
                      <span className="inline-flex items-center gap-1 text-cyan-400">
                        <Globe className="h-3 w-3" />
                        {st.customDomain}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <Badge className={st.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400"}>
                      {st.status}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(st.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

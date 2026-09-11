import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { organizations } from "@/database/schema";
import { suppliers, supplierVerificationAudit } from "@/database/schema/dropshipping";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Supplier Verification Queue — Storefy Admin",
};

export default async function AdminSuppliersPage() {
  await requirePlatformAdmin();

  const supplierList = await db
    .select({
      id: suppliers.id,
      businessName: suppliers.businessName,
      displayName: suppliers.displayName,
      email: suppliers.email,
      phone: suppliers.phone,
      gstin: suppliers.gstin,
      status: suppliers.status,
      createdAt: suppliers.createdAt,
      organizationName: organizations.name,
      organizationId: organizations.id,
    })
    .from(suppliers)
    .innerJoin(organizations, eq(suppliers.organizationId, organizations.id))
    .orderBy(suppliers.createdAt);

  async function updateSupplierStatus(formData: FormData) {
    "use server";
    const admin = await requirePlatformAdmin();
    const supplierId = formData.get("supplierId") as string;
    const action = formData.get("action") as "APPROVE" | "REJECT" | "SUSPEND";

    const targetStatus =
      action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "SUSPENDED";

    const [current] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
    if (!current) return;

    await db.transaction(async (tx) => {
      await tx
        .update(suppliers)
        .set({
          status: targetStatus,
          verifiedAt: targetStatus === "APPROVED" ? new Date() : current.verifiedAt,
          verifiedBy: targetStatus === "APPROVED" ? admin.user.id : current.verifiedBy,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, supplierId));

      // Also ensure organization merchantType reflects approved status
      if (targetStatus === "APPROVED") {
        await tx
          .update(organizations)
          .set({ merchantType: "SUPPLIER", updatedAt: new Date() })
          .where(eq(organizations.id, current.organizationId));
      }

      await tx.insert(supplierVerificationAudit).values({
        supplierId,
        reviewerUserId: admin.user.id,
        action: action as "APPROVE" | "REJECT" | "SUSPEND",
        fromStatus: current.status,
        toStatus: targetStatus,
        reason: `Platform Admin decision: ${action}`,
      });
    });

    revalidatePath("/admin/suppliers");
    revalidatePath("/admin");
    revalidatePath("/admin/merchants");
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Verified</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Pending</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">In Review</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30">Rejected</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-cyan-400" />
            Supplier Verification & Oversight
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review supplier merchant applications, approve verified catalog providers, and audit compliance.
          </p>
        </div>
        <Badge variant="outline" className="border-slate-800 text-slate-400 font-mono text-xs">
          {supplierList.length} Suppliers Registered
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Supplier Business</th>
                <th className="p-3.5">Organization</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Verification Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {supplierList.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{sup.businessName}</div>
                    <div className="text-[10px] text-slate-500">{sup.displayName}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">{sup.organizationName}</td>
                  <td className="p-3.5 font-mono text-slate-300">{sup.gstin || "—"}</td>
                  <td className="p-3.5">
                    <div className="text-slate-300">{sup.email}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{sup.phone}</div>
                  </td>
                  <td className="p-3.5">{getStatusBadge(sup.status)}</td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {sup.status !== "APPROVED" && (
                        <form action={updateSupplierStatus}>
                          <input type="hidden" name="supplierId" value={sup.id} />
                          <input type="hidden" name="action" value="APPROVE" />
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-2.5">
                            Approve
                          </Button>
                        </form>
                      )}
                      {sup.status === "APPROVED" && (
                        <form action={updateSupplierStatus}>
                          <input type="hidden" name="supplierId" value={sup.id} />
                          <input type="hidden" name="action" value="SUSPEND" />
                          <Button size="sm" variant="outline" className="h-7 border-orange-500/30 text-orange-400 hover:bg-orange-950/40 text-[11px] px-2.5">
                            Suspend
                          </Button>
                        </form>
                      )}
                      {sup.status !== "REJECTED" && (
                        <form action={updateSupplierStatus}>
                          <input type="hidden" name="supplierId" value={sup.id} />
                          <input type="hidden" name="action" value="REJECT" />
                          <Button size="sm" variant="ghost" className="h-7 text-rose-400 hover:bg-rose-950/40 text-[11px] px-2">
                            Reject
                          </Button>
                        </form>
                      )}
                    </div>
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

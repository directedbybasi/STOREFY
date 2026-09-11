import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { supplierVerificationAudit } from "@/database/schema/dropshipping";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield } from "lucide-react";
import { desc } from "drizzle-orm";

export const metadata = {
  title: "Platform Audit Logs — Storefy Admin",
};

export default async function AdminAuditPage() {
  await requirePlatformAdmin();

  const supplierAudits = await db
    .select()
    .from(supplierVerificationAudit)
    .orderBy(desc(supplierVerificationAudit.createdAt))
    .limit(50)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Platform Audit & Security Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Append-only verification logs, authorization decisions, and sensitive capability modifications.
          </p>
        </div>
      </div>

      {/* Supplier Verification Decisions Log */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          Supplier Verification Audit Decisions
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3">Action</th>
                  <th className="p-3">Transition</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Reviewer User</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {supplierAudits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      No supplier verification decisions logged yet.
                    </td>
                  </tr>
                ) : (
                  supplierAudits.map((aud) => (
                    <tr key={aud.id} className="hover:bg-slate-850/40">
                      <td className="p-3">
                        <Badge variant="outline" className="border-violet-500/30 text-violet-300 font-mono text-[10px]">
                          {aud.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {aud.fromStatus} → <span className="text-emerald-400 font-semibold">{aud.toStatus}</span>
                      </td>
                      <td className="p-3 text-slate-300">{aud.reason || "—"}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{aud.reviewerUserId}</td>
                      <td className="p-3 text-right font-mono text-slate-500 text-[11px]">
                        {new Date(aud.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

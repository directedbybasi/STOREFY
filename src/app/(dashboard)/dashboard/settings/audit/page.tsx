import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { listAuditLogsAction } from "@/modules/audit/actions";
import { History, ShieldCheck, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Audit Trail — STOREFY",
};

export default async function AuditCenterPage() {
  const ctx = await requirePermission("settings:manage");
  const logs = await listAuditLogsAction({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            Audit Center
          </h1>
          <p className="text-xs text-slate-400">
            Immutable system and staff action history for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-[10px] w-fit">
          Phase 15: Immutable Ledger
        </Badge>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center border border-slate-800/80 bg-slate-900/40 rounded-2xl space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No audit records yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All critical changes (orders, refunds, staff, automations, gift cards, transfers) will be captured immutably here.
          </p>
        </div>
      ) : (
        <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">IP / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                        {log.actorType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white font-mono">
                      {log.event}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.entityId ? `${log.entityId.slice(0, 8)}...` : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {log.ipAddress || "Internal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

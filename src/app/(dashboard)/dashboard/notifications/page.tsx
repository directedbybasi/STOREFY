import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { listInAppNotificationsAction } from "@/modules/notifications/actions";
import { Bell, CheckCircle2, Info, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Notifications — STOREFY",
};

export default async function NotificationsDashboardPage() {
  const ctx = await requirePermission("dashboard:view");
  const notifications = await listInAppNotificationsAction(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            Notification Center
          </h1>
          <p className="text-xs text-slate-400">
            System alerts, automation updates, and fulfillment notifications for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-[10px] w-fit">
          Phase 15: Centralized
        </Badge>
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center border border-slate-800/80 bg-slate-900/40 rounded-2xl space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No notifications yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When order alerts, inventory notices, or automation events fire, they will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                n.isRead
                  ? "bg-slate-950/40 border-slate-800/60 text-slate-400"
                  : "bg-slate-900/70 border-indigo-500/30 text-white shadow-sm"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300">{n.title}</span>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-slate-500 block">
                  {new Date(n.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
              </div>

              {n.link && (
                <Link
                  href={n.link}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 flex items-center gap-1 shrink-0 transition"
                >
                  <span>View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

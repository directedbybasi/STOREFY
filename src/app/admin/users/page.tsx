import React from "react";
import { requirePlatformAdmin } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { users } from "@/database/schema";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Platform Users — Storefy Admin",
};

export default async function AdminUsersPage() {
  await requirePlatformAdmin();

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      isPlatformAdmin: users.isPlatformAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-indigo-400" />
            Platform Users Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global directory of user accounts across merchants, staff, and platform administrators.
          </p>
        </div>
        <Badge variant="outline" className="border-slate-800 text-slate-400 font-mono text-xs">
          {userList.length} Registered Users
        </Badge>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Platform Role</th>
                <th className="p-3.5">User ID</th>
                <th className="p-3.5 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="p-3.5 font-semibold text-white">{u.fullName || "—"}</td>
                  <td className="p-3.5 font-mono text-slate-300">{u.email}</td>
                  <td className="p-3.5">
                    {u.isPlatformAdmin ? (
                      <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/40 gap-1 text-[10px]">
                        <ShieldAlert className="h-3 w-3 text-violet-400" />
                        PLATFORM ADMIN
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px]">
                        MERCHANT USER
                      </Badge>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-slate-500 text-[11px]">{u.id}</td>
                  <td className="p-3.5 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
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

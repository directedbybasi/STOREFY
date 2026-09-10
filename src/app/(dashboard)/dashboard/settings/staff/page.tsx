import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { staff, users, roles, stores } from "@/database/schema";
import { eq } from "drizzle-orm";
import { StaffClient, type StaffListItem, type RoleOption } from "./staff-client";

export const metadata = {
  title: "Team & RBAC — STOREFY",
};

export default async function StaffPage() {
  const ctx = await requirePermission("staff:read");

  // Fetch all staff members in the organization
  const staffQuery = await db
    .select({
      id: staff.id,
      userId: staff.userId,
      email: users.email,
      fullName: users.fullName,
      roleId: staff.roleId,
      roleName: roles.name,
      storeId: staff.storeId,
      storeName: stores.name,
      isActive: staff.isActive,
    })
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.id))
    .innerJoin(roles, eq(staff.roleId, roles.id))
    .leftJoin(stores, eq(staff.storeId, stores.id))
    .where(eq(staff.organizationId, ctx.organization.id));

  // Fetch available roles
  const rolesList: RoleOption[] = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
    })
    .from(roles);

  const staffMembers: StaffListItem[] = staffQuery.map((s) => ({
    id: s.id,
    userId: s.userId,
    email: s.email,
    fullName: s.fullName,
    roleId: s.roleId,
    roleName: s.roleName,
    storeId: s.storeId,
    storeName: s.storeName,
    isActive: s.isActive,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h1 className="text-xl font-bold text-white">Team Staff & Permissions (RBAC)</h1>
        <p className="text-xs text-slate-400">
          Manage staff memberships and granular module permissions for{" "}
          <span className="font-semibold text-emerald-400">{ctx.organization.name}</span>.
        </p>
      </div>

      <StaffClient
        currentUserId={ctx.user.id}
        isOwner={ctx.isOwner}
        staffMembers={staffMembers}
        availableRoles={rolesList}
      />
    </div>
  );
}

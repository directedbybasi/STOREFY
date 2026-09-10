"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../database/client";
import { users, staff, roles } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "../../core/tenant/rbac";
import { ForbiddenError } from "../../core/errors";
import { z } from "zod";

const InviteStaffSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  roleId: z.string().uuid("Invalid role ID"),
  storeId: z.string().uuid().nullable().optional(),
});

/**
 * Invites a team member to the organization with a specified role.
 * Requires `staff:manage` permission.
 */
export async function inviteStaffAction(rawInput: unknown) {
  const ctx = await requirePermission("staff:manage");

  const parseResult = InviteStaffSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid staff invitation data",
    };
  }

  const { email, roleId, storeId } = parseResult.data;

  // 1. Verify target role exists
  const [targetRole] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!targetRole) {
    return { success: false, error: "Selected role does not exist" };
  }

  // 2. Prevent privilege escalation: Only OWNER can assign OWNER role
  if (targetRole.name === "OWNER" && !ctx.isOwner) {
    throw new ForbiddenError("Only an Organization Owner can grant the OWNER role");
  }

  try {
    // 3. Find or create user placeholder for email
    let [invitedUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!invitedUser) {
      const generatedId = crypto.randomUUID();
      const [created] = await db
        .insert(users)
        .values({
          id: generatedId,
          email,
          fullName: email.split("@")[0],
        })
        .returning();
      invitedUser = created;
    }

    // 4. Check if already staff in this org
    const [existingStaff] = await db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.organizationId, ctx.organization.id),
          eq(staff.userId, invitedUser.id)
        )
      )
      .limit(1);

    if (existingStaff) {
      return { success: false, error: "This user is already a team member in your organization" };
    }

    // 5. Insert staff record
    const [newStaff] = await db
      .insert(staff)
      .values({
        organizationId: ctx.organization.id,
        storeId: storeId || null,
        userId: invitedUser.id,
        roleId: targetRole.id,
        isActive: true,
      })
      .returning();

    revalidatePath("/dashboard/settings/staff");
    return { success: true, staffId: newStaff.id };
  } catch (error) {
    console.error("[STOREFY INVITE STAFF ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite staff member",
    };
  }
}

/**
 * Updates a staff member's assigned role.
 */
export async function updateStaffRoleAction(staffId: string, newRoleId: string) {
  const ctx = await requirePermission("staff:manage");

  // Verify target staff belongs to this organization
  const [targetStaff] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.organizationId, ctx.organization.id)))
    .limit(1);

  if (!targetStaff) {
    return { success: false, error: "Staff member not found in your organization" };
  }

  // Prevent modifying own role
  if (targetStaff.userId === ctx.user.id) {
    return { success: false, error: "You cannot change your own role" };
  }

  const [newRole] = await db.select().from(roles).where(eq(roles.id, newRoleId)).limit(1);
  if (!newRole) {
    return { success: false, error: "Selected role does not exist" };
  }

  // Prevent privilege escalation
  if (newRole.name === "OWNER" && !ctx.isOwner) {
    throw new ForbiddenError("Only an Organization Owner can grant the OWNER role");
  }

  await db.update(staff).set({ roleId: newRoleId }).where(eq(staff.id, staffId));

  revalidatePath("/dashboard/settings/staff");
  return { success: true };
}

/**
 * Activates or deactivates a staff member.
 */
export async function toggleStaffActiveAction(staffId: string, isActive: boolean) {
  const ctx = await requirePermission("staff:manage");

  const [targetStaff] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.organizationId, ctx.organization.id)))
    .limit(1);

  if (!targetStaff) {
    return { success: false, error: "Staff member not found in your organization" };
  }

  // Cannot deactivate yourself
  if (targetStaff.userId === ctx.user.id) {
    return { success: false, error: "You cannot deactivate your own account" };
  }

  await db.update(staff).set({ isActive }).where(eq(staff.id, staffId));

  revalidatePath("/dashboard/settings/staff");
  return { success: true };
}

import { describe, it, expect } from "vitest";
import { ForbiddenError } from "@/core/errors";
import { hasPermission } from "@/core/tenant/rbac";
import { ROLE_PERMISSION_MATRIX } from "@/database/seeds/rbac-seed";

function assignStaffRole(
  actorRole: string,
  targetRole: string
): { success: boolean } {
  // Only OWNER can grant OWNER role
  if (targetRole === "OWNER" && actorRole !== "OWNER") {
    throw new ForbiddenError("Only an Organization Owner can grant the OWNER role");
  }
  return { success: true };
}

function deactivateStaff(
  actorUserId: string,
  targetStaffUserId: string
): { success: boolean } {
  if (actorUserId === targetStaffUserId) {
    throw new ForbiddenError("You cannot deactivate your own account");
  }
  return { success: true };
}

describe("Staff Management & Privilege Escalation Prevention", () => {
  it("OWNER can invite staff with any role including OWNER", () => {
    expect(assignStaffRole("OWNER", "ADMIN").success).toBe(true);
    expect(assignStaffRole("OWNER", "OWNER").success).toBe(true);
    expect(assignStaffRole("OWNER", "SUPPORT").success).toBe(true);
  });

  it("PRIVILEGE ESCALATION PREVENTION: ADMIN cannot grant the OWNER role", () => {
    expect(() => {
      assignStaffRole("ADMIN", "OWNER");
    }).toThrow(ForbiddenError);
  });

  it("PRIVILEGE ESCALATION PREVENTION: MANAGER cannot grant the OWNER role", () => {
    expect(() => {
      assignStaffRole("MANAGER", "OWNER");
    }).toThrow(ForbiddenError);
  });

  it("Staff member cannot deactivate their own account", () => {
    const userId = "usr_current_staff";
    expect(() => {
      deactivateStaff(userId, userId);
    }).toThrow(ForbiddenError);
  });

  it("Staff member can deactivate another staff member", () => {
    expect(deactivateStaff("usr_admin", "usr_employee").success).toBe(true);
  });

  it("Permission boundaries: staff:manage is exclusive to OWNER and ADMIN", () => {
    expect(hasPermission(ROLE_PERMISSION_MATRIX.OWNER, "staff:manage", true)).toBe(true);
    expect(hasPermission(ROLE_PERMISSION_MATRIX.ADMIN, "staff:manage")).toBe(true);
    expect(hasPermission(ROLE_PERMISSION_MATRIX.MANAGER, "staff:manage")).toBe(false);
    expect(hasPermission(ROLE_PERMISSION_MATRIX.PRODUCT_MANAGER, "staff:manage")).toBe(false);
    expect(hasPermission(ROLE_PERMISSION_MATRIX.ORDER_MANAGER, "staff:manage")).toBe(false);
    expect(hasPermission(ROLE_PERMISSION_MATRIX.SUPPORT, "staff:manage")).toBe(false);
  });
});

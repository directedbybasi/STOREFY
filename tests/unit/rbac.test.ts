import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROLES,
  CANONICAL_PERMISSIONS,
  ROLE_PERMISSION_MATRIX,
} from "@/database/seeds/rbac-seed";
import { hasPermission } from "@/core/tenant/rbac";

describe("Role-Based Access Control (RBAC) System", () => {
  it("defines all 7 canonical roles", () => {
    const roleNames = CANONICAL_ROLES.map((r) => r.name);
    expect(roleNames).toContain("OWNER");
    expect(roleNames).toContain("ADMIN");
    expect(roleNames).toContain("MANAGER");
    expect(roleNames).toContain("PRODUCT_MANAGER");
    expect(roleNames).toContain("ORDER_MANAGER");
    expect(roleNames).toContain("MARKETING_MANAGER");
    expect(roleNames).toContain("SUPPORT");
    expect(roleNames.length).toBe(7);
  });

  it("OWNER possesses all system permissions", () => {
    const ownerPerms = ROLE_PERMISSION_MATRIX.OWNER;
    expect(ownerPerms.length).toBe(CANONICAL_PERMISSIONS.length);
    expect(hasPermission(ownerPerms, "billing:manage", true)).toBe(true);
    expect(hasPermission(ownerPerms, "catalog:write", true)).toBe(true);
  });

  it("ADMIN cannot alter billing or transfer ownership", () => {
    const adminPerms = new Set(ROLE_PERMISSION_MATRIX.ADMIN);
    expect(hasPermission(adminPerms, "catalog:write")).toBe(true);
    expect(hasPermission(adminPerms, "orders:fulfill")).toBe(true);
    expect(hasPermission(adminPerms, "billing:manage")).toBe(false);
  });

  it("PRODUCT_MANAGER can adjust catalog and inventory but cannot view orders", () => {
    const pmPerms = new Set(ROLE_PERMISSION_MATRIX.PRODUCT_MANAGER);
    expect(hasPermission(pmPerms, "catalog:write")).toBe(true);
    expect(hasPermission(pmPerms, "inventory:adjust")).toBe(true);
    expect(hasPermission(pmPerms, "orders:read")).toBe(false);
    expect(hasPermission(pmPerms, "orders:refund")).toBe(false);
    expect(hasPermission(pmPerms, "settings:manage")).toBe(false);
  });

  it("ORDER_MANAGER can fulfill orders but cannot alter product catalog or settings", () => {
    const omPerms = new Set(ROLE_PERMISSION_MATRIX.ORDER_MANAGER);
    expect(hasPermission(omPerms, "orders:read")).toBe(true);
    expect(hasPermission(omPerms, "orders:fulfill")).toBe(true);
    expect(hasPermission(omPerms, "catalog:write")).toBe(false);
    expect(hasPermission(omPerms, "settings:manage")).toBe(false);
  });

  it("SUPPORT has strictly read-only visibility into orders and catalog", () => {
    const supportPerms = new Set(ROLE_PERMISSION_MATRIX.SUPPORT);
    expect(hasPermission(supportPerms, "orders:read")).toBe(true);
    expect(hasPermission(supportPerms, "catalog:read")).toBe(true);
    expect(hasPermission(supportPerms, "orders:fulfill")).toBe(false);
    expect(hasPermission(supportPerms, "catalog:write")).toBe(false);
    expect(hasPermission(supportPerms, "settings:manage")).toBe(false);
  });

  it("Platform SuperAdmin bypasses all permission checks unconditionally", () => {
    expect(hasPermission([], "billing:manage", false, true)).toBe(true);
    expect(hasPermission([], "catalog:write", false, true)).toBe(true);
  });
});

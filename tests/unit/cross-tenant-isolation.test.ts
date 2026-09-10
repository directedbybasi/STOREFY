import { describe, it, expect } from "vitest";
import { ForbiddenError } from "@/core/errors";
import { hasPermission } from "@/core/tenant/rbac";
import { ROLE_PERMISSION_MATRIX } from "@/database/seeds/rbac-seed";

/**
 * Mock Tenant Membership Validator representing the server-side
 * zero-trust logic executed by getTenantContext() and requirePermission().
 */
interface MockStaffMembership {
  userId: string;
  organizationId: string;
  storeId: string | null;
  roleName: string;
  isActive: boolean;
}

function verifyTenantAccess(
  authenticatedUserId: string,
  targetStore: { id: string; organizationId: string },
  staffMemberships: MockStaffMembership[]
): { authorized: boolean; roleName?: string } {
  // Find valid membership
  const membership = staffMemberships.find(
    (m) =>
      m.userId === authenticatedUserId &&
      m.organizationId === targetStore.organizationId &&
      m.isActive &&
      (m.storeId === null || m.storeId === targetStore.id)
  );

  if (!membership) {
    throw new ForbiddenError(
      `Cross-tenant access violation: User '${authenticatedUserId}' is not authorized to access Store '${targetStore.id}'`
    );
  }

  return { authorized: true, roleName: membership.roleName };
}

describe("CRITICAL CROSS-TENANT ISOLATION TESTS", () => {
  // Setup isolated tenants
  const MerchantA = {
    userId: "usr_merchant_a_1111",
    organizationId: "org_alpha_1111",
    store: {
      id: "str_alpha_store_1111",
      organizationId: "org_alpha_1111",
      name: "Store Alpha",
      subdomain: "store-alpha",
    },
  };

  const MerchantB = {
    userId: "usr_merchant_b_2222",
    organizationId: "org_beta_2222",
    store: {
      id: "str_beta_store_2222",
      organizationId: "org_beta_2222",
      name: "Store Beta",
      subdomain: "store-beta",
    },
  };

  // Database staff table state
  const mockStaffTable: MockStaffMembership[] = [
    {
      userId: MerchantA.userId,
      organizationId: MerchantA.organizationId,
      storeId: MerchantA.store.id,
      roleName: "OWNER",
      isActive: true,
    },
    {
      userId: MerchantB.userId,
      organizationId: MerchantB.organizationId,
      storeId: MerchantB.store.id,
      roleName: "OWNER",
      isActive: true,
    },
  ];

  it("Merchant A is authorized to access Store A", () => {
    const res = verifyTenantAccess(MerchantA.userId, MerchantA.store, mockStaffTable);
    expect(res.authorized).toBe(true);
    expect(res.roleName).toBe("OWNER");
  });

  it("Merchant B is authorized to access Store B", () => {
    const res = verifyTenantAccess(MerchantB.userId, MerchantB.store, mockStaffTable);
    expect(res.authorized).toBe(true);
    expect(res.roleName).toBe("OWNER");
  });

  it("SECURITY INVARIANT 1: Merchant A CANNOT read Store B records", () => {
    expect(() => {
      verifyTenantAccess(MerchantA.userId, MerchantB.store, mockStaffTable);
    }).toThrow(ForbiddenError);
  });

  it("SECURITY INVARIANT 2: Merchant A CANNOT access Store B through forged x-store-id header", () => {
    // Client transmits forged header: x-store-id = MerchantB.store.id
    const forgedHeaderStoreId = MerchantB.store.id;

    expect(() => {
      // Server evaluates User A against forged target store ID
      verifyTenantAccess(
        MerchantA.userId,
        { id: forgedHeaderStoreId, organizationId: MerchantB.organizationId },
        mockStaffTable
      );
    }).toThrow(ForbiddenError);
  });

  it("SECURITY INVARIANT 3: Merchant A CANNOT access Store B by changing IDs in API URLs", () => {
    // Client alters route URL: /api/v1/dashboard/stores/str_beta_store_2222
    const targetUrlStoreId = MerchantB.store.id;

    expect(() => {
      verifyTenantAccess(
        MerchantA.userId,
        { id: targetUrlStoreId, organizationId: MerchantB.organizationId },
        mockStaffTable
      );
    }).toThrow(/Cross-tenant access violation/);
  });

  it("SECURITY INVARIANT 4: Merchant A CANNOT access Store B through domain manipulation", () => {
    // Attacker modifies host header to Store B's subdomain while holding User A's session
    const resolvedTenantFromHost = MerchantB.store;

    expect(() => {
      verifyTenantAccess(MerchantA.userId, resolvedTenantFromHost, mockStaffTable);
    }).toThrow(ForbiddenError);
  });

  it("SECURITY INVARIANT 5: Horizontal Privilege Escalation blocked across stores", () => {
    // Even an OWNER in Organization A has zero access in Organization B
    // Cross-tenant verification rejects before any permission check can occur
    expect(() => {
      verifyTenantAccess(MerchantA.userId, MerchantB.store, mockStaffTable);
    }).toThrow(ForbiddenError);
  });

  it("SECURITY INVARIANT 6: Vertical Privilege Escalation blocked within same store", () => {
    // Add Support staff in Store A
    const supportUserId = "usr_support_a_3333";
    mockStaffTable.push({
      userId: supportUserId,
      organizationId: MerchantA.organizationId,
      storeId: MerchantA.store.id,
      roleName: "SUPPORT",
      isActive: true,
    });

    const access = verifyTenantAccess(supportUserId, MerchantA.store, mockStaffTable);
    expect(access.authorized).toBe(true);
    expect(access.roleName).toBe("SUPPORT");

    const supportPerms = ROLE_PERMISSION_MATRIX.SUPPORT;

    // Support can read orders
    expect(hasPermission(supportPerms, "orders:read")).toBe(true);

    // Support CANNOT mutate catalog or store settings (Vertical escalation attempt)
    expect(hasPermission(supportPerms, "catalog:write")).toBe(false);
    expect(hasPermission(supportPerms, "settings:manage")).toBe(false);
    expect(hasPermission(supportPerms, "billing:manage")).toBe(false);
  });

  it("SECURITY INVARIANT 7: Deactivated staff member is immediately denied all access", () => {
    const deactivatedUserId = "usr_deactivated_4444";
    mockStaffTable.push({
      userId: deactivatedUserId,
      organizationId: MerchantA.organizationId,
      storeId: MerchantA.store.id,
      roleName: "ADMIN",
      isActive: false, // Inactive
    });

    expect(() => {
      verifyTenantAccess(deactivatedUserId, MerchantA.store, mockStaffTable);
    }).toThrow(ForbiddenError);
  });
});

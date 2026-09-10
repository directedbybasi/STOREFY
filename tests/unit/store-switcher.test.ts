import { describe, it, expect } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/core/errors";

interface MockStaffMembership {
  userId: string;
  organizationId: string;
  storeId: string | null;
  isActive: boolean;
}

interface MockStore {
  id: string;
  organizationId: string;
  name: string;
}

/**
 * Pure simulation of switchStoreAction verification logic
 */
function verifyAndSwitchStore(
  userId: string | null,
  targetStoreId: string,
  stores: MockStore[],
  staffTable: MockStaffMembership[]
): { success: boolean; activeStoreId: string } {
  if (!userId) {
    throw new UnauthorizedError("Authentication required to switch store");
  }

  const targetStore = stores.find((s) => s.id === targetStoreId);
  if (!targetStore) {
    throw new ForbiddenError("Target store does not exist");
  }

  const authorizedMembership = staffTable.find(
    (m) =>
      m.userId === userId &&
      m.organizationId === targetStore.organizationId &&
      m.isActive &&
      (m.storeId === null || m.storeId === targetStoreId)
  );

  if (!authorizedMembership) {
    throw new ForbiddenError(
      `Cross-tenant violation: User '${userId}' is not authorized to access Store '${targetStoreId}'`
    );
  }

  return { success: true, activeStoreId: targetStore.id };
}

describe("Multi-Store Switcher Security & Authorization", () => {
  const userA = "usr_merchant_a_1111";
  const userB = "usr_merchant_b_2222";

  const orgA = "org_alpha";
  const orgB = "org_beta";

  const stores: MockStore[] = [
    { id: "str_a_1", organizationId: orgA, name: "Store Alpha 1" },
    { id: "str_a_2", organizationId: orgA, name: "Store Alpha 2" },
    { id: "str_b_1", organizationId: orgB, name: "Store Beta 1" },
  ];

  const staffTable: MockStaffMembership[] = [
    // User A has access to Store A1 and Store A2
    { userId: userA, organizationId: orgA, storeId: "str_a_1", isActive: true },
    { userId: userA, organizationId: orgA, storeId: "str_a_2", isActive: true },
    // User B has access to Store B1
    { userId: userB, organizationId: orgB, storeId: "str_b_1", isActive: true },
  ];

  it("User A can successfully switch between Store A1 and Store A2", () => {
    const res1 = verifyAndSwitchStore(userA, "str_a_1", stores, staffTable);
    expect(res1.success).toBe(true);
    expect(res1.activeStoreId).toBe("str_a_1");

    const res2 = verifyAndSwitchStore(userA, "str_a_2", stores, staffTable);
    expect(res2.success).toBe(true);
    expect(res2.activeStoreId).toBe("str_a_2");
  });

  it("User A CANNOT switch into Store B1 (belonging to Merchant B)", () => {
    expect(() => {
      verifyAndSwitchStore(userA, "str_b_1", stores, staffTable);
    }).toThrow(ForbiddenError);
  });

  it("User B CANNOT switch into Store A1 or Store A2", () => {
    expect(() => {
      verifyAndSwitchStore(userB, "str_a_1", stores, staffTable);
    }).toThrow(ForbiddenError);

    expect(() => {
      verifyAndSwitchStore(userB, "str_a_2", stores, staffTable);
    }).toThrow(ForbiddenError);
  });

  it("Reject switching when store ID does not exist", () => {
    expect(() => {
      verifyAndSwitchStore(userA, "str_non_existent", stores, staffTable);
    }).toThrow(ForbiddenError);
  });

  it("Reject unauthenticated switch attempts", () => {
    expect(() => {
      verifyAndSwitchStore(null, "str_a_1", stores, staffTable);
    }).toThrow(UnauthorizedError);
  });

  it("Org-wide staff member (storeId = null) can access all stores in their organization", () => {
    const orgOwner = "usr_org_owner";
    staffTable.push({
      userId: orgOwner,
      organizationId: orgA,
      storeId: null, // Org-wide access
      isActive: true,
    });

    const res1 = verifyAndSwitchStore(orgOwner, "str_a_1", stores, staffTable);
    expect(res1.success).toBe(true);

    const res2 = verifyAndSwitchStore(orgOwner, "str_a_2", stores, staffTable);
    expect(res2.success).toBe(true);

    // But cannot access Store B1 in org B
    expect(() => {
      verifyAndSwitchStore(orgOwner, "str_b_1", stores, staffTable);
    }).toThrow(ForbiddenError);
  });
});

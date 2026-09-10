import { describe, it, expect, beforeEach } from "vitest";
import { ForbiddenError, UnauthorizedError, NotFoundError } from "@/core/errors";
import { AccountSignUpSchema, CreateStoreSchema } from "@/modules/auth/validation";

interface MockUser {
  id: string;
  email: string;
  fullName: string;
}

interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
}

interface MockStore {
  id: string;
  organizationId: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

interface MockStaffMembership {
  id: string;
  userId: string;
  organizationId: string;
  storeId: string | null; // null represents org-wide membership
  roleName: string;
  isActive: boolean;
}

interface SimulatedState {
  users: MockUser[];
  organizations: MockOrganization[];
  stores: MockStore[];
  staff: MockStaffMembership[];
  activeStoreCookies: Map<string, string>; // userId -> activeStoreId
}

/**
 * Simulates account-first signup without store creation
 */
function simulateAccountSignUp(
  state: SimulatedState,
  input: { fullName: string; email: string; password: string; confirmPassword: string }
) {
  const parse = AccountSignUpSchema.safeParse(input);
  if (!parse.success) {
    throw new Error(parse.error.errors[0]?.message || "Invalid input");
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const user: MockUser = {
    id: userId,
    email: input.email,
    fullName: input.fullName,
  };
  state.users.push(user);

  const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const organization: MockOrganization = {
    id: orgId,
    name: `${input.fullName}'s Organization`,
    slug: `${input.fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-org`,
    billingEmail: input.email,
  };
  state.organizations.push(organization);

  // Org-wide OWNER staff membership (storeId: null)
  const staffId = `stf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  state.staff.push({
    id: staffId,
    userId,
    organizationId: orgId,
    storeId: null,
    roleName: "OWNER",
    isActive: true,
  });

  return { userId, organizationId: orgId, redirectTo: "/onboarding" };
}

/**
 * Simulates store creation (first store or subsequent stores)
 */
function simulateCreateStore(
  state: SimulatedState,
  userId: string,
  organizationId: string,
  input: { name: string; subdomain: string }
) {
  const parse = CreateStoreSchema.safeParse(input);
  if (!parse.success) {
    throw new Error(parse.error.errors[0]?.message || "Invalid store data");
  }

  // Verify user is owner or admin in this org
  const membership = state.staff.find(
    (m) => m.userId === userId && m.organizationId === organizationId && m.isActive
  );
  if (!membership || (membership.roleName !== "OWNER" && membership.roleName !== "ADMIN")) {
    throw new ForbiddenError("Only organization owners can provision new stores");
  }

  // Check unique subdomain
  const normalizedSub = input.subdomain.toLowerCase().trim();
  if (state.stores.some((s) => s.subdomain === normalizedSub)) {
    throw new Error(`Subdomain '${normalizedSub}' is already taken.`);
  }

  const storeId = `str_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newStore: MockStore = {
    id: storeId,
    organizationId,
    name: input.name.trim(),
    subdomain: normalizedSub,
    isActive: true,
  };
  state.stores.push(newStore);

  // Set active store cookie
  state.activeStoreCookies.set(userId, storeId);

  return { success: true, storeId, subdomain: normalizedSub };
}

/**
 * Simulates store switching with zero-trust cross-tenant verification
 */
function simulateSwitchStore(
  state: SimulatedState,
  userId: string,
  targetStoreId: string
) {
  if (!userId) {
    throw new UnauthorizedError("Authentication required to switch store");
  }

  const targetStore = state.stores.find((s) => s.id === targetStoreId);
  if (!targetStore) {
    throw new NotFoundError("Store", targetStoreId);
  }

  // Verify staff membership in the store's organization
  const authorized = state.staff.find(
    (m) =>
      m.userId === userId &&
      m.organizationId === targetStore.organizationId &&
      m.isActive &&
      (m.storeId === null || m.storeId === targetStoreId)
  );

  if (!authorized) {
    throw new ForbiddenError(
      `Cross-tenant violation: User '${userId}' is not authorized to access Store '${targetStoreId}'`
    );
  }

  // Update active store cookie
  state.activeStoreCookies.set(userId, targetStore.id);
  return { success: true, activeStoreId: targetStore.id, storeName: targetStore.name };
}

/**
 * Simulates resolving tenant context for dashboard
 */
function simulateGetTenantContext(state: SimulatedState, userId: string, targetStoreId?: string) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) throw new UnauthorizedError("Authentication required");

  const resolvedStoreId = targetStoreId || state.activeStoreCookies.get(userId);

  const memberships = state.staff.filter((m) => m.userId === userId && m.isActive);
  if (!memberships || memberships.length === 0) {
    throw new ForbiddenError("No authorized staff access");
  }

  const activeMembership = memberships[0];
  const org = state.organizations.find((o) => o.id === activeMembership.organizationId)!;

  const orgStores = state.stores.filter((s) => s.organizationId === org.id);

  if (resolvedStoreId) {
    const matchingStore = orgStores.find((s) => s.id === resolvedStoreId);
    if (!matchingStore) {
      throw new NotFoundError("Store", resolvedStoreId);
    }
    return { user, organization: org, store: matchingStore, isOwner: activeMembership.roleName === "OWNER" };
  }

  // If no store requested, return active or first store, or null if org has 0 stores
  const defaultStore = orgStores[0] || null;
  return { user, organization: org, store: defaultStore, isOwner: activeMembership.roleName === "OWNER" };
}

describe("Multi-Store Merchant Account Model", () => {
  let state: SimulatedState;

  beforeEach(() => {
    state = {
      users: [],
      organizations: [],
      stores: [],
      staff: [],
      activeStoreCookies: new Map(),
    };
  });

  it("1. Account signup without store provisions user, organization, and org-wide OWNER staff", () => {
    const signupResult = simulateAccountSignUp(state, {
      fullName: "Ananya Roy",
      email: "ananya@roycrafts.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    expect(signupResult.userId).toBeDefined();
    expect(signupResult.organizationId).toBeDefined();
    expect(signupResult.redirectTo).toBe("/onboarding");

    // Zero stores initially
    expect(state.stores.length).toBe(0);

    // Organization was created
    const org = state.organizations.find((o) => o.id === signupResult.organizationId);
    expect(org).toBeDefined();
    expect(org?.name).toBe("Ananya Roy's Organization");

    // Org-wide staff record exists (storeId === null)
    const staffRec = state.staff.find((s) => s.userId === signupResult.userId);
    expect(staffRec).toBeDefined();
    expect(staffRec?.storeId).toBeNull();
    expect(staffRec?.roleName).toBe("OWNER");
  });

  it("2. Skipping first-store creation leaves user in organization with 0 stores", () => {
    const signupResult = simulateAccountSignUp(state, {
      fullName: "Kabir Mehta",
      email: "kabir@mehta.com",
      password: "SecurePassword123",
      confirmPassword: "SecurePassword123",
    });

    // User skips onboarding
    const ctx = simulateGetTenantContext(state, signupResult.userId);
    expect(ctx.user.id).toBe(signupResult.userId);
    expect(ctx.organization.id).toBe(signupResult.organizationId);
    expect(ctx.store).toBeNull(); // Gracefully handles 0 stores
    expect(ctx.isOwner).toBe(true);
  });

  it("3. Optional first-store creation during onboarding provisions store and sets active cookie", () => {
    const signupResult = simulateAccountSignUp(state, {
      fullName: "Vikram Sen",
      email: "vikram@senstudios.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    // User creates first store in onboarding
    const storeRes = simulateCreateStore(state, signupResult.userId, signupResult.organizationId, {
      name: "Sen Studios",
      subdomain: "sen-studios",
    });

    expect(storeRes.success).toBe(true);
    expect(state.stores.length).toBe(1);

    // Active store cookie was set
    expect(state.activeStoreCookies.get(signupResult.userId)).toBe(storeRes.storeId);

    // Dashboard context now resolves the newly created store
    const ctx = simulateGetTenantContext(state, signupResult.userId);
    expect(ctx.store).not.toBeNull();
    expect(ctx.store?.name).toBe("Sen Studios");
    expect(ctx.store?.subdomain).toBe("sen-studios");
  });

  it("4. Creating a second store under the same organization", () => {
    const signup = simulateAccountSignUp(state, {
      fullName: "Rohan Kapoor",
      email: "rohan@kapoor.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    // Store A
    const storeA = simulateCreateStore(state, signup.userId, signup.organizationId, {
      name: "Kapoor Apparel",
      subdomain: "kapoor-apparel",
    });

    // Store B
    const storeB = simulateCreateStore(state, signup.userId, signup.organizationId, {
      name: "Kapoor Luxury",
      subdomain: "kapoor-luxury",
    });

    expect(storeA.success).toBe(true);
    expect(storeB.success).toBe(true);
    expect(state.stores.length).toBe(2);
    expect(state.stores[0].organizationId).toBe(signup.organizationId);
    expect(state.stores[1].organizationId).toBe(signup.organizationId);

    // Active store cookie points to the most recently created store
    expect(state.activeStoreCookies.get(signup.userId)).toBe(storeB.storeId);
  });

  it("5. Seamlessly switching between Store A and Store B without logging out", () => {
    const signup = simulateAccountSignUp(state, {
      fullName: "Neha Sharma",
      email: "neha@sharma.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    const storeA = simulateCreateStore(state, signup.userId, signup.organizationId, {
      name: "Store Alpha",
      subdomain: "store-alpha",
    });
    const storeB = simulateCreateStore(state, signup.userId, signup.organizationId, {
      name: "Store Beta",
      subdomain: "store-beta",
    });

    // Currently on Store B
    expect(state.activeStoreCookies.get(signup.userId)).toBe(storeB.storeId);

    // Switch to Store A
    const switchRes = simulateSwitchStore(state, signup.userId, storeA.storeId);
    expect(switchRes.success).toBe(true);
    expect(switchRes.activeStoreId).toBe(storeA.storeId);
    expect(state.activeStoreCookies.get(signup.userId)).toBe(storeA.storeId);

    // User session remains unchanged
    const ctxA = simulateGetTenantContext(state, signup.userId);
    expect(ctxA.user.id).toBe(signup.userId);
    expect(ctxA.store?.id).toBe(storeA.storeId);

    // Switch back to Store B
    const switchBack = simulateSwitchStore(state, signup.userId, storeB.storeId);
    expect(switchBack.success).toBe(true);
    expect(state.activeStoreCookies.get(signup.userId)).toBe(storeB.storeId);
    const ctxB = simulateGetTenantContext(state, signup.userId);
    expect(ctxB.store?.id).toBe(storeB.storeId);
  });

  it("6. Rejects unauthorized cross-tenant store switching", () => {
    // Merchant 1
    const user1 = simulateAccountSignUp(state, {
      fullName: "Merchant One",
      email: "one@test.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const store1 = simulateCreateStore(state, user1.userId, user1.organizationId, {
      name: "Store One",
      subdomain: "store-one",
    });

    // Merchant 2
    const user2 = simulateAccountSignUp(state, {
      fullName: "Merchant Two",
      email: "two@test.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const store2 = simulateCreateStore(state, user2.userId, user2.organizationId, {
      name: "Store Two",
      subdomain: "store-two",
    });

    // User 1 cannot switch to Store 2
    expect(() => {
      simulateSwitchStore(state, user1.userId, store2.storeId);
    }).toThrow(ForbiddenError);

    // User 2 cannot switch to Store 1
    expect(() => {
      simulateSwitchStore(state, user2.userId, store1.storeId);
    }).toThrow(ForbiddenError);
  });

  it("7. Rejects forged or non-existent store IDs", () => {
    const user = simulateAccountSignUp(state, {
      fullName: "Merchant Test",
      email: "test@merchant.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    expect(() => {
      simulateSwitchStore(state, user.userId, "forged_store_uuid_9999");
    }).toThrow(NotFoundError);

    expect(() => {
      simulateGetTenantContext(state, user.userId, "forged_store_uuid_9999");
    }).toThrow(NotFoundError);
  });
});

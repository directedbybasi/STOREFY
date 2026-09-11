import { describe, it, expect } from "vitest";
import { ForbiddenError } from "@/core/errors";
import type { AccountContext, TenantContext, MerchantType } from "@/core/tenant/types";

describe("STOREFY Final Role Architecture — RBAC & Capability Security Suite", () => {
  // Mock factory helpers to test zero-trust security invariants
  const createMockAccount = (overrides: {
    isPlatformAdmin?: boolean;
    roleName?: string;
    merchantType?: MerchantType;
    capabilities?: string[];
    permissions?: string[];
    orgId?: string;
    userId?: string;
  }): AccountContext => {
    const role = overrides.roleName || "OWNER";
    const isOwner = role === "OWNER";
    const isPlatformAdmin = !!overrides.isPlatformAdmin;
    const permissions = new Set(overrides.permissions || []);
    const capabilities = new Set(overrides.capabilities || []);

    return {
      user: {
        id: overrides.userId || "00000000-0000-0000-0000-000000000001",
        email: isPlatformAdmin ? "admin@storefy.com" : "merchant@storefy.com",
        fullName: isPlatformAdmin ? "Platform Admin" : "Merchant User",
        avatarUrl: null,
        isPlatformAdmin,
      },
      organization: {
        id: overrides.orgId || "11111111-1111-1111-1111-111111111111",
        name: "Test Organization",
        slug: "test-org",
        billingEmail: "billing@test.com",
        merchantType: overrides.merchantType || "STANDARD",
      },
      capabilities,
      staff: {
        id: "22222222-2222-2222-2222-222222222222",
        roleId: "33333333-3333-3333-3333-333333333333",
        isActive: true,
      },
      role: {
        id: "33333333-3333-3333-3333-333333333333",
        name: role,
      },
      permissions,
      isOwner,
    };
  };

  const createMockTenantContext = (
    accountOverrides: Parameters<typeof createMockAccount>[0],
    storeId = "44444444-4444-4444-4444-444444444444"
  ): TenantContext => {
    const account = createMockAccount(accountOverrides);
    return {
      ...account,
      store: {
        id: storeId,
        organizationId: account.organization.id,
        name: "Store Alpha",
        slug: "store-alpha",
        subdomain: "alpha",
        customDomain: null,
        currency: "INR",
        timezone: "Asia/Kolkata",
        isActive: true,
      },
    };
  };

  // Pure verification wrappers modeling server-side guards
  function guardPlatformAdmin(account: AccountContext): AccountContext {
    if (!account.user.isPlatformAdmin) {
      throw new ForbiddenError(
        "Platform Admin authorization required. Merchant accounts cannot access platform administration."
      );
    }
    return account;
  }

  function guardSupplierCapability(ctx: TenantContext): TenantContext {
    if (ctx.user.isPlatformAdmin) return ctx;
    if (!ctx.capabilities.has("SUPPLIER")) {
      throw new ForbiddenError(
        `Access denied: Organization '${ctx.organization.name}' does not possess the Supplier capability.`
      );
    }
    return ctx;
  }

  function guardPermission(ctx: TenantContext, permissionCode: string): TenantContext {
    if (ctx.user.isPlatformAdmin) return ctx;

    // Supplier operations strictly require supplier capability
    if (permissionCode.startsWith("supplier:")) {
      if (!ctx.capabilities.has("SUPPLIER")) {
        throw new ForbiddenError(
          `Access denied: Organization does not possess Supplier capability.`
        );
      }
    }

    if (ctx.isOwner) return ctx;

    if (!ctx.permissions.has(permissionCode)) {
      throw new ForbiddenError(
        `Access denied: Missing required permission '${permissionCode}'`
      );
    }
    return ctx;
  }

  // =========================================================================
  // TEST 1: Merchant cannot access Platform Admin
  // =========================================================================
  it("TEST 1: Merchant cannot access Platform Admin", () => {
    const standardMerchantOwner = createMockAccount({
      isPlatformAdmin: false,
      roleName: "OWNER",
      merchantType: "STANDARD",
    });

    expect(() => guardPlatformAdmin(standardMerchantOwner)).toThrow(ForbiddenError);
    expect(() => guardPlatformAdmin(standardMerchantOwner)).toThrow(
      /Platform Admin authorization required/
    );

    const supplierMerchantOwner = createMockAccount({
      isPlatformAdmin: false,
      roleName: "OWNER",
      merchantType: "SUPPLIER",
      capabilities: ["SUPPLIER"],
    });

    expect(() => guardPlatformAdmin(supplierMerchantOwner)).toThrow(ForbiddenError);
  });

  // =========================================================================
  // TEST 2: Platform Admin can access authorized platform functions
  // =========================================================================
  it("TEST 2: Platform Admin can access authorized platform functions", () => {
    const platformAdmin = createMockAccount({
      isPlatformAdmin: true,
      roleName: "ADMIN",
    });

    const authorizedAccount = guardPlatformAdmin(platformAdmin);
    expect(authorizedAccount.user.isPlatformAdmin).toBe(true);
    expect(authorizedAccount.user.email).toBe("admin@storefy.com");
  });

  // =========================================================================
  // TEST 3: Normal Merchant without supplier capability cannot access supplier dashboard
  // =========================================================================
  it("TEST 3: Normal Merchant without supplier capability cannot access supplier dashboard", () => {
    const normalMerchant = createMockTenantContext({
      roleName: "OWNER",
      merchantType: "STANDARD",
      capabilities: [], // Zero supplier capability
    });

    expect(() => guardSupplierCapability(normalMerchant)).toThrow(ForbiddenError);
    expect(() => guardSupplierCapability(normalMerchant)).toThrow(
      /does not possess the Supplier capability/
    );

    // Even if normal merchant attempts calling supplier:read, it must be rejected
    expect(() => guardPermission(normalMerchant, "supplier:read")).toThrow(ForbiddenError);
  });

  // =========================================================================
  // TEST 4: Supplier Merchant OWNER can access permitted supplier functions
  // =========================================================================
  it("TEST 4: Supplier Merchant OWNER can access permitted supplier functions", () => {
    const supplierOwner = createMockTenantContext({
      roleName: "OWNER",
      merchantType: "SUPPLIER",
      capabilities: ["SUPPLIER"],
      permissions: ["supplier:read", "supplier:products", "supplier:orders", "supplier:finance"],
    });

    expect(() => guardSupplierCapability(supplierOwner)).not.toThrow();
    expect(() => guardPermission(supplierOwner, "supplier:read")).not.toThrow();
    expect(() => guardPermission(supplierOwner, "supplier:products")).not.toThrow();
    expect(() => guardPermission(supplierOwner, "supplier:orders")).not.toThrow();
    expect(() => guardPermission(supplierOwner, "supplier:finance")).not.toThrow();
  });

  // =========================================================================
  // TEST 5: Supplier Merchant MANAGER cannot access OWNER-only functions
  // =========================================================================
  it("TEST 5: Supplier Merchant MANAGER cannot access OWNER-only functions", () => {
    const supplierManager = createMockTenantContext({
      roleName: "MANAGER",
      merchantType: "SUPPLIER",
      capabilities: ["SUPPLIER"],
      // Manager has operational permissions but lacks finance, verification, and settings
      permissions: ["supplier:read", "supplier:products", "supplier:orders", "supplier:fulfill"],
    });

    // Allowed operational actions
    expect(() => guardPermission(supplierManager, "supplier:read")).not.toThrow();
    expect(() => guardPermission(supplierManager, "supplier:products")).not.toThrow();
    expect(() => guardPermission(supplierManager, "supplier:orders")).not.toThrow();

    // Denied OWNER-only financial and administrative functions
    expect(() => guardPermission(supplierManager, "supplier:finance")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierManager, "supplier:verify")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierManager, "billing:manage")).toThrow(ForbiddenError);
  });

  // =========================================================================
  // TEST 6: Supplier Merchant VIEWER cannot mutate supplier data
  // =========================================================================
  it("TEST 6: Supplier Merchant VIEWER cannot mutate supplier data", () => {
    const supplierViewer = createMockTenantContext({
      roleName: "VIEWER",
      merchantType: "SUPPLIER",
      capabilities: ["SUPPLIER"],
      // Read-only permissions
      permissions: ["supplier:read", "supplier:orders"],
    });

    // Allowed read operations
    expect(() => guardPermission(supplierViewer, "supplier:read")).not.toThrow();

    // Denied mutating operations
    expect(() => guardPermission(supplierViewer, "supplier:products")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierViewer, "supplier:write")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierViewer, "supplier:inventory")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierViewer, "supplier:fulfill")).toThrow(ForbiddenError);
    expect(() => guardPermission(supplierViewer, "supplier:finance")).toThrow(ForbiddenError);
  });

  // =========================================================================
  // TEST 7: Supplier cannot access another supplier's data
  // =========================================================================
  it("TEST 7: Supplier cannot access another supplier's data (cross-tenant isolation)", () => {
    const supplierOrgA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const supplierOrgB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const supplierUserA = createMockTenantContext({
      orgId: supplierOrgA,
      roleName: "OWNER",
      merchantType: "SUPPLIER",
      capabilities: ["SUPPLIER"],
    });

    // Data query boundary enforcement: supplier data queries must filter on ctx.organization.id
    function querySupplierProducts(ctx: TenantContext, requestedOrgId: string) {
      if (ctx.organization.id !== requestedOrgId && !ctx.user.isPlatformAdmin) {
        throw new ForbiddenError("Cross-tenant access violation: Cannot inspect another supplier's catalog");
      }
      return [{ id: "prod-1", organizationId: requestedOrgId }];
    }

    // Access own data: succeeds
    expect(() => querySupplierProducts(supplierUserA, supplierOrgA)).not.toThrow();

    // Attempt to access another supplier's data: rejected
    expect(() => querySupplierProducts(supplierUserA, supplierOrgB)).toThrow(ForbiddenError);
    expect(() => querySupplierProducts(supplierUserA, supplierOrgB)).toThrow(/Cross-tenant access violation/);
  });

  // =========================================================================
  // TEST 8: Merchant cannot promote itself to Platform Admin
  // =========================================================================
  it("TEST 8: Merchant cannot promote itself to Platform Admin", () => {
    // Untrusted client payload attempting privilege escalation
    const clientPayload = {
      fullName: "Malicious Merchant",
      isPlatformAdmin: true, // Attempted injection
      isAdmin: true,
      role: "PLATFORM_ADMIN",
    };

    // Safe server-side sanitization: only permit whitelisted profile fields
    function sanitizeProfileUpdate(input: Record<string, unknown>) {
      const allowed: { fullName?: string } = {};
      if (typeof input.fullName === "string") {
        allowed.fullName = input.fullName;
      }
      // Never accept isPlatformAdmin from user input
      return allowed;
    }

    const sanitized = sanitizeProfileUpdate(clientPayload);
    const unverifiedFields = sanitized as Record<string, unknown>;
    expect(unverifiedFields.isPlatformAdmin).toBeUndefined();
    expect(unverifiedFields.isAdmin).toBeUndefined();
    expect(unverifiedFields.role).toBeUndefined();
    expect(sanitized.fullName).toBe("Malicious Merchant");
  });

  // =========================================================================
  // TEST 9: Browser cannot forge supplier capability
  // =========================================================================
  it("TEST 9: Browser cannot forge supplier capability", () => {
    const standardMerchant = createMockTenantContext({
      roleName: "OWNER",
      merchantType: "STANDARD",
      capabilities: [],
    });

    // Browser client sends forged header / cookie
    const forgedClientRequest = {
      headers: { "x-merchant-capability": "SUPPLIER", "x-is-supplier": "true" },
    };

    // Server authoritative resolution must ignore client capability headers
    // and rely EXCLUSIVELY on database-backed organization context
    function resolveCapabilitiesFromServer(
      dbOrg: { merchantType: string },
      _untrustedHeaders: Record<string, string>
    ): Set<string> {
      void _untrustedHeaders;
      const caps = new Set<string>();
      if (dbOrg.merchantType === "SUPPLIER") {
        caps.add("SUPPLIER");
      }
      return caps;
    }

    const resolved = resolveCapabilitiesFromServer(
      { merchantType: standardMerchant.organization.merchantType },
      forgedClientRequest.headers
    );

    expect(resolved.has("SUPPLIER")).toBe(false);
  });

  // =========================================================================
  // TEST 10: Browser cannot forge role
  // =========================================================================
  it("TEST 10: Browser cannot forge role", () => {
    const viewerAccount = createMockAccount({
      roleName: "VIEWER",
      permissions: ["catalog:read"],
    });

    // Browser attempts sending forged role header
    const forgedRequest = {
      headers: { "x-user-role": "OWNER", role: "ADMIN" },
    };

    // Server-side verification strictly relies on authenticated database staff membership
    function resolveUserRole(
      dbStaffRecord: { roleName: string },
      _untrustedHeaders: Record<string, string>
    ): string {
      void _untrustedHeaders;
      // Untrusted headers are completely discarded
      return dbStaffRecord.roleName;
    }

    const verifiedRole = resolveUserRole(
      { roleName: viewerAccount.role.name },
      forgedRequest.headers
    );

    expect(verifiedRole).toBe("VIEWER");
    expect(verifiedRole).not.toBe("OWNER");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { db } from "@/database/client";

// Mock database client
vi.mock("@/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("Storefront Tenant & Domain Resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND when domain string is empty or invalid", async () => {
    const res = await resolveStorefrontTenant("");
    expect(res.status).toBe("NOT_FOUND");
  });

  it("resolves store via platform subdomain (e.g. acme.storefy.shop)", async () => {
    const mockStore = {
      id: "store-uuid-1",
      organizationId: "org-uuid-1",
      name: "Acme Apparel",
      slug: "acme-apparel",
      subdomain: "acme",
      customDomain: null,
      isActive: true,
      status: "ACTIVE",
      currency: "INR",
      timezone: "Asia/Kolkata",
      logoUrl: "https://cdn.storefy.shop/logo.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Chain setup for db.select()
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockStore]),
        }),
      }),
    }));

    const res = await resolveStorefrontTenant("acme.storefy.shop");

    expect(res.status).toBe("ACTIVE");
    if (res.status === "ACTIVE") {
      expect(res.store.id).toBe("store-uuid-1");
      expect(res.store.name).toBe("Acme Apparel");
      expect(res.domain).toBe("acme.storefy.shop");
    }
  });

  it("evaluates SUSPENDED store lifecycle state", async () => {
    const suspendedStore = {
      id: "store-suspended-1",
      name: "Suspended Store",
      subdomain: "suspended-brand",
      isActive: true,
      status: "SUSPENDED",
    };

    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([suspendedStore]),
        }),
      }),
    }));

    const res = await resolveStorefrontTenant("suspended-brand.storefy.shop");
    expect(res.status).toBe("SUSPENDED");
    if (res.status === "SUSPENDED") {
      expect(res.store.name).toBe("Suspended Store");
    }
  });

  it("evaluates inactive store (isActive = false) as SUSPENDED", async () => {
    const inactiveStore = {
      id: "store-inactive-1",
      name: "Inactive Store",
      subdomain: "inactive-brand",
      isActive: false,
      status: "ACTIVE",
    };

    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([inactiveStore]),
        }),
      }),
    }));

    const res = await resolveStorefrontTenant("inactive-brand.storefy.shop");
    expect(res.status).toBe("SUSPENDED");
  });

  it("evaluates MAINTENANCE store lifecycle state", async () => {
    const maintenanceStore = {
      id: "store-maint-1",
      name: "Maintenance Store",
      subdomain: "maint-brand",
      isActive: true,
      status: "MAINTENANCE",
    };

    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([maintenanceStore]),
        }),
      }),
    }));

    const res = await resolveStorefrontTenant("maint-brand.storefy.shop");
    expect(res.status).toBe("MAINTENANCE");
    if (res.status === "MAINTENANCE") {
      expect(res.store.name).toBe("Maintenance Store");
    }
  });

  it("returns NOT_FOUND when store is not in database", async () => {
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }));

    const res = await resolveStorefrontTenant("unknown-store.storefy.shop");
    expect(res.status).toBe("NOT_FOUND");
  });
});

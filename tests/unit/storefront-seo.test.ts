/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";

vi.mock("@/modules/storefront/store-resolver", () => ({
  resolveStorefrontTenant: vi.fn(),
}));

vi.mock("@/database/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

describe("Dynamic Storefront SEO & OpenGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates store-scoped metadata for Home page", async () => {
    (resolveStorefrontTenant as any).mockResolvedValue({
      status: "ACTIVE",
      store: {
        id: "store-1",
        name: "Artisan Leather",
        logoUrl: "https://cdn.storefy.shop/artisan-logo.png",
      },
      settings: null,
      domain: "artisan.storefy.shop",
    });

    const meta = await generateStorefrontMetadata({
      domain: "artisan.storefy.shop",
      pageType: "HOME",
    });

    expect(meta.title).toBe("Artisan Leather — Official Online Store");
    expect(meta.alternates?.canonical).toBe("https://artisan.storefy.shop");
    expect(meta.openGraph?.siteName).toBe("Artisan Leather");
    expect(meta.openGraph?.title).toBe("Artisan Leather — Official Online Store");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("generates page-scoped metadata for Catalog page", async () => {
    (resolveStorefrontTenant as any).mockResolvedValue({
      status: "ACTIVE",
      store: {
        id: "store-2",
        name: "Nordic Living",
        logoUrl: null,
      },
      settings: null,
      domain: "nordic.storefy.shop",
    });

    const meta = await generateStorefrontMetadata({
      domain: "nordic.storefy.shop",
      pageType: "PRODUCTS",
      pageSlug: "products",
      defaultTitle: "All Products",
    });

    expect(meta.title).toBe("All Products | Nordic Living");
    expect(meta.openGraph?.siteName).toBe("Nordic Living");
  });

  it("sets robots noindex for missing or suspended stores", async () => {
    (resolveStorefrontTenant as any).mockResolvedValue({
      status: "NOT_FOUND",
      domain: "missing.storefy.shop",
    });

    const meta = await generateStorefrontMetadata({
      domain: "missing.storefy.shop",
      pageType: "HOME",
    });

    expect(meta.title).toContain("Store Not Found");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("sets robots noindex for maintenance mode", async () => {
    (resolveStorefrontTenant as any).mockResolvedValue({
      status: "MAINTENANCE",
      store: {
        name: "Upgrading Shop",
      },
      domain: "upgrading.storefy.shop",
    });

    const meta = await generateStorefrontMetadata({
      domain: "upgrading.storefy.shop",
      pageType: "HOME",
    });

    expect(meta.title).toContain("Maintenance Mode");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

import { describe, it, expect } from "vitest";
import {
  normalizeHostname,
  extractSubdomain,
  isPlatformApexDomain,
  isInternalOrSystemRoute,
} from "@/modules/stores/domain-service";

describe("Domain Normalization & Resolution", () => {
  describe("normalizeHostname", () => {
    it("lowercases hostname", () => {
      expect(normalizeHostname("STORE-A.STOREFY.SHOP")).toBe("store-a.storefy.shop");
    });

    it("strips development and proxy ports", () => {
      expect(normalizeHostname("brand.localhost:3000")).toBe("brand.localhost");
      expect(normalizeHostname("merchant.com:8080")).toBe("merchant.com");
    });

    it("removes trailing dots", () => {
      expect(normalizeHostname("storefy.shop.")).toBe("storefy.shop");
    });

    it("handles empty or whitespace inputs gracefully", () => {
      expect(normalizeHostname("")).toBe("");
      expect(normalizeHostname("   ")).toBe("");
    });
  });

  describe("extractSubdomain", () => {
    it("extracts valid merchant subdomain from production domain", () => {
      expect(extractSubdomain("acme-apparel.storefy.shop")).toBe("acme-apparel");
      expect(extractSubdomain("artisan-crafts.storefy.shop")).toBe("artisan-crafts");
    });

    it("extracts valid merchant subdomain in local development", () => {
      expect(extractSubdomain("acme.localhost")).toBe("acme");
    });

    it("ignores 'www' subdomain", () => {
      expect(extractSubdomain("www.storefy.shop")).toBeNull();
      expect(extractSubdomain("www.localhost")).toBeNull();
    });

    it("returns null for custom domains or apex platform domain", () => {
      expect(extractSubdomain("custom-merchant.com")).toBeNull();
      expect(extractSubdomain("storefy.shop")).toBeNull();
    });
  });

  describe("isPlatformApexDomain", () => {
    it("recognizes localhost and loopback interfaces as platform apex", () => {
      expect(isPlatformApexDomain("localhost")).toBe(true);
      expect(isPlatformApexDomain("127.0.0.1")).toBe(true);
      expect(isPlatformApexDomain("::1")).toBe(true);
    });

    it("recognizes root production domain and system subdomains", () => {
      expect(isPlatformApexDomain("storefy.shop")).toBe(true);
      expect(isPlatformApexDomain("www.storefy.shop")).toBe(true);
      expect(isPlatformApexDomain("dev.storefy.shop")).toBe(true);
      expect(isPlatformApexDomain("staging.storefy.shop")).toBe(true);
    });

    it("recognizes Vercel preview deployment hosts (*.vercel.app)", () => {
      expect(isPlatformApexDomain("storefy-nc0iesgau-storefy1.vercel.app")).toBe(true);
      expect(isPlatformApexDomain("storefy-git-develop-storefy1.vercel.app")).toBe(true);
      expect(isPlatformApexDomain("storefy.vercel.app")).toBe(true);
    });

    it("identifies merchant custom domains and subdomains as non-apex", () => {
      expect(isPlatformApexDomain("acme.storefy.shop")).toBe(false);
      expect(isPlatformApexDomain("aurora-fashion.storefy.shop")).toBe(false);
      expect(isPlatformApexDomain("merchant-brand.com")).toBe(false);
      expect(isPlatformApexDomain("shop.acme.com")).toBe(false);
    });

    it("handles empty or falsy inputs", () => {
      expect(isPlatformApexDomain("")).toBe(false);
    });
  });

  describe("isInternalOrSystemRoute", () => {
    it("identifies system API and dashboard routes", () => {
      expect(isInternalOrSystemRoute("/api/v1/health")).toBe(true);
      expect(isInternalOrSystemRoute("/dashboard")).toBe(true);
      expect(isInternalOrSystemRoute("/dashboard/online-store/themes/customizer")).toBe(true);
    });

    it("identifies authentication routes", () => {
      expect(isInternalOrSystemRoute("/login")).toBe(true);
      expect(isInternalOrSystemRoute("/register")).toBe(true);
      expect(isInternalOrSystemRoute("/forgot-password")).toBe(true);
      expect(isInternalOrSystemRoute("/reset-password")).toBe(true);
    });

    it("identifies public storefront paths as non-system routes", () => {
      expect(isInternalOrSystemRoute("/")).toBe(false);
      expect(isInternalOrSystemRoute("/products")).toBe(false);
      expect(isInternalOrSystemRoute("/products/summer-linen-shirt")).toBe(false);
      expect(isInternalOrSystemRoute("/cart")).toBe(false);
    });
  });
});

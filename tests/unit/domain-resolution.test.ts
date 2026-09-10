import { describe, it, expect } from "vitest";
import { normalizeHostname, extractSubdomain } from "@/modules/stores/domain-service";

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
});

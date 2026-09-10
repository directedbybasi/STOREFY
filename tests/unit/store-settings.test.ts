import { describe, it, expect } from "vitest";
import { StoreSettingsSchema } from "@/modules/stores/validation";
import { hasPermission } from "@/core/tenant/rbac";
import { ROLE_PERMISSION_MATRIX } from "@/database/seeds/rbac-seed";

describe("Store Settings Validation & Permissions", () => {
  describe("StoreSettingsSchema Validation", () => {
    it("accepts valid store configuration", () => {
      const valid = {
        name: "Velvet Bloom",
        slug: "velvet-bloom",
        currency: "INR",
        timezone: "Asia/Kolkata",
        isActive: true,
        logoUrl: "https://example.com/logo.png",
        whatsappOrderPhone: "+919876543210",
        whatsappOrderEnabled: true,
        whatsappSupportPhone: "+919876543210",
        whatsappSupportEnabled: true,
        codEnabled: true,
        codMinAmountRupees: 0,
        codMaxAmountRupees: 25000,
        taxInclusive: true,
        orderIdPrefix: "ORD-",
        invoicePrefix: "INV-",
      };

      const res = StoreSettingsSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects invalid slugs with special characters", () => {
      const invalid = {
        name: "Velvet Bloom",
        slug: "Velvet_Bloom!",
        currency: "INR",
        timezone: "Asia/Kolkata",
      };
      expect(StoreSettingsSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects currency codes that are not 3 characters", () => {
      const invalid = {
        name: "Velvet Bloom",
        slug: "velvet-bloom",
        currency: "INDIA",
      };
      expect(StoreSettingsSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects out-of-bounds COD limits (e.g. negative or exceeding ₹5,00,000)", () => {
      const negative = {
        name: "Velvet Bloom",
        slug: "velvet-bloom",
        codMinAmountRupees: -50,
      };
      expect(StoreSettingsSchema.safeParse(negative).success).toBe(false);

      const excessive = {
        name: "Velvet Bloom",
        slug: "velvet-bloom",
        codMaxAmountRupees: 10000000, // ₹1 crore exceeds ₹5,00,000 limit
      };
      expect(StoreSettingsSchema.safeParse(excessive).success).toBe(false);
    });
  });

  describe("Store Settings Permission Control", () => {
    it("OWNER and ADMIN have settings:manage permission", () => {
      expect(hasPermission(ROLE_PERMISSION_MATRIX.OWNER, "settings:manage", true)).toBe(true);
      expect(hasPermission(ROLE_PERMISSION_MATRIX.ADMIN, "settings:manage")).toBe(true);
    });

    it("MANAGER, PRODUCT_MANAGER, and SUPPORT CANNOT manage settings", () => {
      expect(hasPermission(ROLE_PERMISSION_MATRIX.MANAGER, "settings:manage")).toBe(false);
      expect(hasPermission(ROLE_PERMISSION_MATRIX.PRODUCT_MANAGER, "settings:manage")).toBe(false);
      expect(hasPermission(ROLE_PERMISSION_MATRIX.SUPPORT, "settings:manage")).toBe(false);
    });
  });
});

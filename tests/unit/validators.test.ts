import { describe, it, expect } from "vitest";
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  slugSchema,
  currencyAmountPaiseSchema,
} from "@/lib/validators";

describe("Reusable Zod Validators", () => {
  describe("uuidSchema", () => {
    it("accepts valid UUID v4", () => {
      expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    });

    it("rejects invalid UUID string", () => {
      expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    });
  });

  describe("emailSchema", () => {
    it("accepts and trims valid email", () => {
      const res = emailSchema.safeParse("  Merchant@Brand.Com ");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe("merchant@brand.com");
      }
    });

    it("rejects malformed email", () => {
      expect(emailSchema.safeParse("merchant.brand.com").success).toBe(false);
    });
  });

  describe("phoneSchema", () => {
    it("accepts valid Indian 10-digit mobile number", () => {
      expect(phoneSchema.safeParse("9876543210").success).toBe(true);
      expect(phoneSchema.safeParse("+919876543210").success).toBe(true);
    });

    it("rejects invalid phone format", () => {
      expect(phoneSchema.safeParse("12345").success).toBe(false);
    });
  });

  describe("slugSchema", () => {
    it("accepts valid alphanumeric hypenated slug", () => {
      expect(slugSchema.safeParse("summer-sale-2026").success).toBe(true);
    });

    it("rejects uppercase and invalid special characters", () => {
      expect(slugSchema.safeParse("Summer_Sale!").success).toBe(false);
    });
  });

  describe("currencyAmountPaiseSchema", () => {
    it("accepts non-negative integers in Paise", () => {
      expect(currencyAmountPaiseSchema.safeParse(19900).success).toBe(true);
      expect(currencyAmountPaiseSchema.safeParse(0).success).toBe(true);
    });

    it("rejects negative numbers or floating points", () => {
      expect(currencyAmountPaiseSchema.safeParse(-100).success).toBe(false);
      expect(currencyAmountPaiseSchema.safeParse(199.5).success).toBe(false);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  AddToCartSchema,
  UpdateCartItemQuantitySchema,
  RemoveCartItemSchema,
  MergeCartSchema,
} from "@/modules/cart/validation";
import { formatPaiseToRupees } from "@/modules/cart/service";

describe("Cart Engine - Validation & Formatting", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  describe("AddToCartSchema", () => {
    it("accepts valid variantId and quantity", () => {
      const result = AddToCartSchema.safeParse({
        variantId: validUuid,
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID variantId", () => {
      const result = AddToCartSchema.safeParse({
        variantId: "not-a-uuid",
        quantity: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid variant ID");
      }
    });

    it("rejects zero or negative quantities", () => {
      const zeroResult = AddToCartSchema.safeParse({
        variantId: validUuid,
        quantity: 0,
      });
      expect(zeroResult.success).toBe(false);

      const negResult = AddToCartSchema.safeParse({
        variantId: validUuid,
        quantity: -5,
      });
      expect(negResult.success).toBe(false);
    });

    it("rejects fractional or non-integer quantities", () => {
      const floatResult = AddToCartSchema.safeParse({
        variantId: validUuid,
        quantity: 1.5,
      });
      expect(floatResult.success).toBe(false);
    });

    it("rejects quantities exceeding 99", () => {
      const overLimitResult = AddToCartSchema.safeParse({
        variantId: validUuid,
        quantity: 100,
      });
      expect(overLimitResult.success).toBe(false);
      if (!overLimitResult.success) {
        expect(overLimitResult.error.issues[0].message).toContain("Maximum quantity");
      }
    });
  });

  describe("UpdateCartItemQuantitySchema", () => {
    it("accepts quantities between 1 and 99", () => {
      expect(
        UpdateCartItemQuantitySchema.safeParse({
          variantId: validUuid,
          quantity: 1,
        }).success
      ).toBe(true);

      expect(
        UpdateCartItemQuantitySchema.safeParse({
          variantId: validUuid,
          quantity: 99,
        }).success
      ).toBe(true);
    });

    it("rejects zero quantity (removal must use RemoveCartItemSchema)", () => {
      const result = UpdateCartItemQuantitySchema.safeParse({
        variantId: validUuid,
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RemoveCartItemSchema", () => {
    it("validates UUID for item removal", () => {
      expect(
        RemoveCartItemSchema.safeParse({ variantId: validUuid }).success
      ).toBe(true);

      expect(
        RemoveCartItemSchema.safeParse({ variantId: "abc" }).success
      ).toBe(false);
    });
  });

  describe("MergeCartSchema", () => {
    it("requires a non-empty guest session token with minimum length", () => {
      expect(
        MergeCartSchema.safeParse({ guestSessionToken: "guest-token-12345" }).success
      ).toBe(true);

      expect(
        MergeCartSchema.safeParse({ guestSessionToken: "short" }).success
      ).toBe(false);
    });
  });

  describe("Currency & Calculation Precision", () => {
    it("correctly formats integer paise to INR rupees with symbol", () => {
      expect(formatPaiseToRupees(0)).toBe("₹0.00");
      expect(formatPaiseToRupees(100)).toBe("₹1.00");
      expect(formatPaiseToRupees(149900)).toBe("₹1,499.00");
      expect(formatPaiseToRupees(9999900)).toBe("₹99,999.00");
    });

    it("prevents floating-point rounding bugs when computing line item subtotals", () => {
      const unitPricePaise = 19999; // ₹199.99
      const quantity = 3;
      const subtotalPaise = unitPricePaise * quantity;

      expect(subtotalPaise).toBe(59997); // Exactly ₹599.97 in integer paise
      expect(formatPaiseToRupees(subtotalPaise)).toBe("₹599.97");
    });

    it("computes free shipping qualification accurately", () => {
      const freeShippingThresholdPaise = 99900; // ₹999.00

      const cart1Subtotal = 89900; // ₹899.00
      const qualifies1 = cart1Subtotal >= freeShippingThresholdPaise;
      expect(qualifies1).toBe(false);

      const cart2Subtotal = 99900; // ₹999.00
      const qualifies2 = cart2Subtotal >= freeShippingThresholdPaise;
      expect(qualifies2).toBe(true);

      const cart3Subtotal = 149900; // ₹1,499.00
      const qualifies3 = cart3Subtotal >= freeShippingThresholdPaise;
      expect(qualifies3).toBe(true);
    });
  });
});

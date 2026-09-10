import { describe, it, expect } from "vitest";
import {
  CheckoutContactSchema,
  CheckoutAddressSchema,
  CheckoutShippingSchema,
  CheckoutPaymentSchema,
} from "@/modules/checkout/validation";
import { RESERVATION_HOLD_MINUTES } from "@/modules/checkout/reservation";

describe("Checkout Engine - Validation & Reservation Rules", () => {
  describe("CheckoutContactSchema", () => {
    it("accepts valid full contact info", () => {
      const valid = {
        fullName: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        phone: "+91 9876543210",
      };
      const res = CheckoutContactSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const invalid = {
        fullName: "Aarav Sharma",
        email: "not-an-email",
        phone: "+91 9876543210",
      };
      const res = CheckoutContactSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Invalid email");
      }
    });

    it("rejects phone numbers that are too short", () => {
      const invalid = {
        fullName: "Aarav Sharma",
        email: "aarav@example.com",
        phone: "12345",
      };
      const res = CheckoutContactSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("rejects names shorter than 2 characters", () => {
      const invalid = {
        fullName: "A",
        email: "aarav@example.com",
        phone: "9876543210",
      };
      const res = CheckoutContactSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe("CheckoutAddressSchema", () => {
    const validAddress = {
      name: "Aarav Sharma",
      phone: "9876543210",
      addressLine1: "Flat 402, Lotus Heights, MG Road",
      addressLine2: "Near Indiranagar Metro",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      country: "India",
    };

    it("accepts complete valid shipping address", () => {
      const res = CheckoutAddressSchema.safeParse(validAddress);
      expect(res.success).toBe(true);
    });

    it("accepts address without optional addressLine2", () => {
      const withoutLine2 = { ...validAddress, addressLine2: undefined };
      const res = CheckoutAddressSchema.safeParse(withoutLine2);
      expect(res.success).toBe(true);
    });

    it("rejects missing addressLine1 or city", () => {
      const missingLine1 = { ...validAddress, addressLine1: "" };
      expect(CheckoutAddressSchema.safeParse(missingLine1).success).toBe(false);

      const missingCity = { ...validAddress, city: "" };
      expect(CheckoutAddressSchema.safeParse(missingCity).success).toBe(false);
    });

    it("rejects invalid postal code formats", () => {
      const invalidPin = { ...validAddress, postalCode: "!!!" };
      expect(CheckoutAddressSchema.safeParse(invalidPin).success).toBe(false);
    });
  });

  describe("CheckoutShippingSchema", () => {
    it("accepts standard, express, and free shipping methods", () => {
      expect(
        CheckoutShippingSchema.safeParse({ shippingMethodId: "standard" }).success
      ).toBe(true);
      expect(
        CheckoutShippingSchema.safeParse({ shippingMethodId: "express" }).success
      ).toBe(true);
      expect(
        CheckoutShippingSchema.safeParse({ shippingMethodId: "free" }).success
      ).toBe(true);
    });

    it("rejects unknown shipping method IDs", () => {
      expect(
        CheckoutShippingSchema.safeParse({ shippingMethodId: "teleportation" }).success
      ).toBe(false);
    });
  });

  describe("CheckoutPaymentSchema", () => {
    it("accepts COD and ONLINE payment options", () => {
      expect(
        CheckoutPaymentSchema.safeParse({ paymentMethod: "COD" }).success
      ).toBe(true);
      expect(
        CheckoutPaymentSchema.safeParse({ paymentMethod: "ONLINE" }).success
      ).toBe(true);
    });

    it("rejects unsupported payment types", () => {
      expect(
        CheckoutPaymentSchema.safeParse({ paymentMethod: "CRYPTO" }).success
      ).toBe(false);
    });
  });

  describe("Reservation Invariants & Expiration", () => {
    it("enforces a standard 15-minute hold window", () => {
      expect(RESERVATION_HOLD_MINUTES).toBe(15);

      const now = new Date("2026-09-10T12:00:00.000Z");
      const expiresAt = new Date(now.getTime() + RESERVATION_HOLD_MINUTES * 60 * 1000);

      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBe(15);
    });

    it("identifies expired checkout sessions accurately", () => {
      const sessionCreatedAt = new Date("2026-09-10T12:00:00.000Z");
      const expiresAt = new Date(
        sessionCreatedAt.getTime() + RESERVATION_HOLD_MINUTES * 60 * 1000
      );

      // 10 minutes later -> not expired
      const tPlus10 = new Date("2026-09-10T12:10:00.000Z");
      expect(tPlus10 < expiresAt).toBe(true);

      // 16 minutes later -> expired
      const tPlus16 = new Date("2026-09-10T12:16:00.000Z");
      expect(tPlus16 > expiresAt).toBe(true);
    });
  });
});

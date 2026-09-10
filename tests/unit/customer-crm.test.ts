import { describe, it, expect } from "vitest";
import {
  CustomerCreateSchema,
  CustomerUpdateSchema,
  CustomerAddressSchema,
} from "@/modules/customers/validation";
import {
  determineCustomerSegment,
  calculateCustomerMetrics,
  formatPaiseToRupees,
  HIGH_VALUE_SPEND_THRESHOLD_PAISE,
  HIGH_VALUE_ORDERS_THRESHOLD,
} from "@/modules/customers/segmentation";

describe("PHASE 7 — Customer CRM, Segmentation & Financial Metrics", () => {
  it("validates that customer requires first name and either email or phone", () => {
    // Valid with email
    const withEmail = CustomerCreateSchema.safeParse({
      firstName: "Aarav",
      email: "aarav@example.com",
    });
    expect(withEmail.success).toBe(true);

    // Valid with phone
    const withPhone = CustomerCreateSchema.safeParse({
      firstName: "Priya",
      phone: "+91 98765 43210",
    });
    expect(withPhone.success).toBe(true);

    // Invalid: missing both email and phone
    const missingContact = CustomerCreateSchema.safeParse({
      firstName: "Rohan",
    });
    expect(missingContact.success).toBe(false);

    // Invalid: missing first name
    const missingName = CustomerCreateSchema.safeParse({
      firstName: "",
      email: "rohan@example.com",
    });
    expect(missingName.success).toBe(false);
  });

  it("assigns NEW segment for recent signups with 0 or 1 orders", () => {
    const recent = new Date();
    const segment = determineCustomerSegment({
      ordersCount: 0,
      totalSpent: 0n,
      createdAt: recent,
    });
    expect(segment).toBe("NEW");

    const oneOrder = determineCustomerSegment({
      ordersCount: 1,
      totalSpent: 150000n, // ₹1,500.00
      createdAt: recent,
      lastOrderAt: recent,
    });
    expect(oneOrder).toBe("NEW");
  });

  it("assigns RETURNING segment when ordersCount > 1 and not high-value", () => {
    const segment = determineCustomerSegment({
      ordersCount: 2,
      totalSpent: 300000n, // ₹3,000.00
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      lastOrderAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    });
    expect(segment).toBe("RETURNING");
  });

  it("assigns HIGH_VALUE segment when spend >= ₹10,000 or ordersCount >= 5", () => {
    // By spend threshold (1,000,000 Paise)
    const highSpend = determineCustomerSegment({
      ordersCount: 1,
      totalSpent: HIGH_VALUE_SPEND_THRESHOLD_PAISE,
      createdAt: new Date(),
    });
    expect(highSpend).toBe("HIGH_VALUE");

    // By orders threshold (>= 5 orders)
    const highOrders = determineCustomerSegment({
      ordersCount: HIGH_VALUE_ORDERS_THRESHOLD,
      totalSpent: 500000n,
      createdAt: new Date(),
    });
    expect(highOrders).toBe("HIGH_VALUE");
  });

  it("assigns INACTIVE segment when account created > 30 days with no orders, or last order > 90 days ago", () => {
    // 35 days old with 0 orders
    const inactiveNoOrders = determineCustomerSegment({
      ordersCount: 0,
      totalSpent: 0n,
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    });
    expect(inactiveNoOrders).toBe("INACTIVE");

    // Last order was 100 days ago
    const inactiveOldOrder = determineCustomerSegment({
      ordersCount: 2,
      totalSpent: 200000n,
      createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      lastOrderAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });
    expect(inactiveOldOrder).toBe("INACTIVE");
  });

  it("accurately formats monetary Paise values into INR", () => {
    expect(formatPaiseToRupees(0)).toBe("₹0.00");
    expect(formatPaiseToRupees(150000n)).toBe("₹1,500.00");
    expect(formatPaiseToRupees(1000000n)).toBe("₹10,000.00");
    expect(formatPaiseToRupees(49950)).toBe("₹499.50");
  });

  it("calculates customer metrics and average order value safely", () => {
    // 0 orders -> AOV is 0
    const zeroMetrics = calculateCustomerMetrics({
      ordersCount: 0,
      totalSpent: 0n,
    });
    expect(zeroMetrics.ordersCount).toBe(0);
    expect(zeroMetrics.averageOrderValuePaise).toBe(0n);
    expect(zeroMetrics.totalSpentFormatted).toBe("₹0.00");

    // 4 orders, total spend ₹10,000 (1,000,000 Paise) -> AOV = ₹2,500 (250,000 Paise)
    const metrics = calculateCustomerMetrics({
      ordersCount: 4,
      totalSpent: 1_000_000n,
      lastOrderAt: new Date("2026-09-01"),
    });
    expect(metrics.ordersCount).toBe(4);
    expect(metrics.totalSpentPaise).toBe(1_000_000n);
    expect(metrics.averageOrderValuePaise).toBe(250_000n);
    expect(metrics.averageOrderValueFormatted).toBe("₹2,500.00");
  });

  it("validates customer address schema", () => {
    const validAddress = CustomerAddressSchema.safeParse({
      customerId: "00000000-0000-0000-0000-000000000001",
      name: "Aarav Sharma",
      phone: "+91 98765 43210",
      addressLine1: "Flat 402, Lotus Heights",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      country: "India",
      isDefault: true,
      type: "SHIPPING",
    });
    expect(validAddress.success).toBe(true);

    const invalidPostal = CustomerAddressSchema.safeParse({
      customerId: "00000000-0000-0000-0000-000000000001",
      name: "Aarav Sharma",
      phone: "123", // too short
      addressLine1: "Street 1",
      city: "Delhi",
      state: "Delhi",
      postalCode: "",
    });
    expect(invalidPostal.success).toBe(false);
  });

  it("validates customer update schema", () => {
    const validUpdate = CustomerUpdateSchema.safeParse({
      id: "00000000-0000-0000-0000-000000000001",
      firstName: "Aarav Updated",
      status: "INACTIVE",
    });
    expect(validUpdate.success).toBe(true);

    const invalidId = CustomerUpdateSchema.safeParse({
      id: "invalid-uuid",
      firstName: "Test",
    });
    expect(invalidId.success).toBe(false);
  });
});

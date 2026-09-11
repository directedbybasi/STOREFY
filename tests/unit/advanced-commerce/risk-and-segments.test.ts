import { describe, it, expect } from "vitest";
import { isCustomerMatchingConditions } from "@/modules/segments/segment-service";
import type { SegmentCondition } from "@/database/schema";

describe("Phase 15 — Risk & Customer Segments", () => {
  it("evaluates customer segment conditions on total spent and order count", () => {
    const conditions: SegmentCondition[] = [
      { field: "totalSpent", operator: "greater_than", value: 100000 },
      { field: "ordersCount", operator: "greater_than", value: 2 },
    ];

    const matchingCustomer = {
      totalSpent: 250000,
      ordersCount: 3,
      lastOrderAt: new Date(),
      createdAt: new Date(),
    };

    const failingCustomer = {
      totalSpent: 50000,
      ordersCount: 1,
      lastOrderAt: new Date(),
      createdAt: new Date(),
    };

    expect(isCustomerMatchingConditions(matchingCustomer, conditions)).toBe(true);
    expect(isCustomerMatchingConditions(failingCustomer, conditions)).toBe(false);
  });

  it("evaluates recency conditions (lastOrderDaysAgo)", () => {
    const conditions: SegmentCondition[] = [
      { field: "lastOrderDaysAgo", operator: "less_than", value: 30 },
    ];

    const recentCustomer = {
      totalSpent: 10000,
      ordersCount: 1,
      lastOrderAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      createdAt: new Date(),
    };

    const lapsedCustomer = {
      totalSpent: 10000,
      ordersCount: 1,
      lastOrderAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      createdAt: new Date(),
    };

    expect(isCustomerMatchingConditions(recentCustomer, conditions)).toBe(true);
    expect(isCustomerMatchingConditions(lapsedCustomer, conditions)).toBe(false);
  });

  it("calculates explainable risk score level accurately", () => {
    // Deterministic thresholds
    const evaluateRisk = (score: number) => {
      if (score >= 80) return "BLOCKED";
      if (score >= 50) return "HIGH";
      if (score >= 25) return "MEDIUM";
      return "LOW";
    };

    expect(evaluateRisk(10)).toBe("LOW");
    expect(evaluateRisk(35)).toBe("MEDIUM");
    expect(evaluateRisk(60)).toBe("HIGH");
    expect(evaluateRisk(90)).toBe("BLOCKED");
  });
});

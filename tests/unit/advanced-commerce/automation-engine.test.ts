import { describe, it, expect } from "vitest";
import { evaluateConditions } from "@/modules/automation/engine";
import type { AutomationCondition } from "@/database/schema";

describe("Phase 15 — Automation Engine", () => {
  it("evaluates 'equals' and 'not_equals' conditions properly", () => {
    const conditions: AutomationCondition[] = [
      { field: "paymentMethod", operator: "equals", value: "COD" },
      { field: "status", operator: "not_equals", value: "CANCELLED" },
    ];

    const matchPayload = { paymentMethod: "COD", status: "CONFIRMED" };
    const failPayload = { paymentMethod: "ONLINE", status: "CONFIRMED" };

    expect(evaluateConditions(conditions, matchPayload)).toBe(true);
    expect(evaluateConditions(conditions, failPayload)).toBe(false);
  });

  it("evaluates numeric 'greater_than' and 'less_than' conditions", () => {
    const conditions: AutomationCondition[] = [
      { field: "orderTotalPaise", operator: "greater_than", value: 100000 },
      { field: "orderTotalPaise", operator: "less_than", value: 500000 },
    ];

    expect(evaluateConditions(conditions, { orderTotalPaise: 250000 })).toBe(true);
    expect(evaluateConditions(conditions, { orderTotalPaise: 50000 })).toBe(false);
    expect(evaluateConditions(conditions, { orderTotalPaise: 600000 })).toBe(false);
  });

  it("evaluates 'contains' string condition", () => {
    const conditions: AutomationCondition[] = [
      { field: "shippingCity", operator: "contains", value: "Bangalore" },
    ];

    expect(evaluateConditions(conditions, { shippingCity: "Bangalore Urban" })).toBe(true);
    expect(evaluateConditions(conditions, { shippingCity: "Mumbai" })).toBe(false);
  });

  it("evaluates 'in' array membership condition", () => {
    const conditions: AutomationCondition[] = [
      { field: "customerTier", operator: "in", value: ["GOLD", "PLATINUM"] },
    ];

    expect(evaluateConditions(conditions, { customerTier: "GOLD" })).toBe(true);
    expect(evaluateConditions(conditions, { customerTier: "SILVER" })).toBe(false);
  });

  it("returns true when no conditions are specified", () => {
    expect(evaluateConditions([], { any: "val" })).toBe(true);
  });
});

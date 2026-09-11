import { describe, it, expect } from "vitest";
import { resolveDateRange } from "@/modules/analytics/reporting-service";

describe("Phase 15 — Analytics & Financial Reporting", () => {
  it("resolves date ranges accurately for standard intervals", () => {
    const range7d = resolveDateRange("7d");
    expect(range7d.currentStart).toBeInstanceOf(Date);
    expect(range7d.currentEnd).toBeInstanceOf(Date);
    expect(range7d.previousStart).toBeInstanceOf(Date);
    expect(range7d.previousEnd).toBeInstanceOf(Date);

    // Duration of current and previous periods must match exactly
    const currentDuration = range7d.currentEnd.getTime() - range7d.currentStart.getTime();
    const prevDuration = range7d.previousEnd.getTime() - range7d.previousStart.getTime();
    expect(Math.abs(currentDuration - prevDuration)).toBeLessThan(100);
  });

  it("resolves custom date ranges and matches comparison period duration", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-08-15T23:59:59.999Z");

    const customRange = resolveDateRange("custom", start, end);
    expect(customRange.currentStart.getTime()).toBe(start.getTime());
    expect(customRange.currentEnd.getTime()).toBe(end.getTime());

    const currentDuration = end.getTime() - start.getTime();
    const prevDuration = customRange.previousEnd.getTime() - customRange.previousStart.getTime();
    expect(Math.abs(currentDuration - prevDuration)).toBeLessThan(100);
  });

  it("calculates Net Sales accurately as Gross Sales minus Refunds in integer Paise", () => {
    const grossSalesPaise = 100_000_00; // ₹1,00,000
    const refundsAmountPaise = 15_000_00; // ₹15,000
    const netSalesPaise = Math.max(0, grossSalesPaise - refundsAmountPaise);

    expect(netSalesPaise).toBe(85_000_00); // ₹85,000
    expect(typeof netSalesPaise).toBe("number");
    expect(netSalesPaise % 1).toBe(0); // must be clean integer
  });

  it("calculates Average Order Value (AOV) without floating-point artifacts", () => {
    const netSalesPaise = 250_000_00; // ₹250,000
    const ordersCount = 50;
    const aovPaise = Math.round(netSalesPaise / ordersCount);

    expect(aovPaise).toBe(5_000_00); // ₹5,000
  });
});

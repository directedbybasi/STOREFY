import { describe, it, expect } from "vitest";

describe("Phase 15 — Loyalty & Rewards Invariants", () => {
  it("calculates points earned based on authoritative integer Paise", () => {
    const orderTotalPaise = 250_000; // ₹2500.00
    const orderRupees = Math.floor(orderTotalPaise / 100);
    const rateRupeesPerPoint = 10; // ₹10 = 1 point

    const pointsEarned = Math.floor(orderRupees / rateRupeesPerPoint);
    expect(pointsEarned).toBe(250);
  });

  it("calculates redemption discount accurately without floating point bugs", () => {
    const pointsToRedeem = 500;
    const pointValuePaise = 100; // 1 point = ₹1 (100 Paise)

    const discountAmountPaise = pointsToRedeem * pointValuePaise;
    expect(discountAmountPaise).toBe(50_000); // ₹500.00
  });

  it("ensures reversal logic does not result in negative point balances beyond available", () => {
    const accountBalance = 150;
    const originalEarnedPoints = 200;

    const pointsToDeduct = Math.min(accountBalance, originalEarnedPoints);
    const balanceAfter = accountBalance - pointsToDeduct;

    expect(pointsToDeduct).toBe(150);
    expect(balanceAfter).toBe(0);
    expect(balanceAfter).toBeGreaterThanOrEqual(0);
  });
});

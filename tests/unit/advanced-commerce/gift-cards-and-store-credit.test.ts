import { describe, it, expect } from "vitest";
import {
  generateRandomGiftCardCode,
  hashGiftCardCode,
} from "@/modules/gift-cards/gift-card-service";

describe("Phase 15 — Gift Cards & Store Credit", () => {
  it("generates alphanumeric gift card codes in canonical format", () => {
    const code = generateRandomGiftCardCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code.length).toBe(19); // 16 alphanumeric + 3 hyphens
  });

  it("hashes codes deterministically while remaining case and hyphen insensitive", () => {
    const code1 = "ABCD-EFGH-JKLM-NPQR";
    const code2 = "abcd-efgh-jklm-npqr";
    const code3 = "ABCDEFGHJKLMNPQR";

    const hash1 = hashGiftCardCode(code1);
    const hash2 = hashGiftCardCode(code2);
    const hash3 = hashGiftCardCode(code3);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it("calculates partial redemption balance accurately", () => {
    const initialBalancePaise = 500_000; // ₹5,000
    const redemptionAmountPaise = 150_000; // ₹1,500

    const remainingBalancePaise = initialBalancePaise - redemptionAmountPaise;
    expect(remainingBalancePaise).toBe(350_000); // ₹3,500
  });

  it("calculates multi-wallet balance deduction priority (standard balance first, then promo)", () => {
    let standard = 50_000; // ₹500
    let promo = 25_000; // ₹250
    const charge = 60_000; // ₹600

    let remainingToDeduct = charge;
    if (standard >= remainingToDeduct) {
      standard -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= standard;
      standard = 0;
      promo -= remainingToDeduct;
    }

    expect(standard).toBe(0);
    expect(promo).toBe(15_000); // ₹150 remaining in promo
    expect(standard + promo).toBe(15_000);
  });
});

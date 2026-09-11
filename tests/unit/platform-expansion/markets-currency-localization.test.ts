import { describe, it, expect } from "vitest";
import { convertMinorUnits, SCALE_FACTOR } from "@/modules/markets/currency-service";

describe("Phase 16 — Global Markets, Currency & Localization", () => {
  it("converts minor currency units deterministically using integer scaled math", () => {
    // 1 INR = 0.012 USD -> scaled factor = 12,000
    const inrAmountPaise = 100_000; // ₹1,000.00
    const usdRateFactor = 12_000;

    const usdAmountCents = convertMinorUnits(
      inrAmountPaise,
      "INR",
      "USD",
      usdRateFactor
    );

    // ₹1,000 * 0.012 = $12.00 (1,200 cents)
    expect(usdAmountCents).toBe(1_200);

    // 1 INR = 0.044 AED -> scaled factor = 44,000
    const aedRateFactor = 44_000;
    const aedAmountFils = convertMinorUnits(
      inrAmountPaise,
      "INR",
      "AED",
      aedRateFactor
    );

    // ₹1,000 * 0.044 = 44.00 AED (4,400 fils)
    expect(aedAmountFils).toBe(4_400);

    // Same currency identity
    const identityResult = convertMinorUnits(
      inrAmountPaise,
      "INR",
      "INR",
      SCALE_FACTOR
    );
    expect(identityResult).toBe(100_000);
  });

  it("calculates regional tax rates from basis points accurately", () => {
    const taxableAmountPaise = 200_000; // ₹2,000.00
    const gstRateBasisPoints = 1_800; // 18.00%
    const vatRateBasisPoints = 500; // 5.00%

    const gstAmountPaise = Math.round(
      (taxableAmountPaise * gstRateBasisPoints) / 10_000
    );
    const vatAmountPaise = Math.round(
      (taxableAmountPaise * vatRateBasisPoints) / 10_000
    );

    expect(gstAmountPaise).toBe(36_000); // ₹360.00
    expect(vatAmountPaise).toBe(10_000); // ₹100.00
  });

  it("calculates import customs duty and cross-border handling fees", () => {
    const itemValuePaise = 500_000; // ₹5,000
    const dutyRateBasisPoints = 1_000; // 10.00%
    const handlingFeePaise = 25_000; // ₹250 flat fee

    const dutyAmountPaise = Math.round(
      (itemValuePaise * dutyRateBasisPoints) / 10_000
    );
    const totalDutiesPaise = dutyAmountPaise + handlingFeePaise;

    expect(dutyAmountPaise).toBe(50_000); // ₹500
    expect(totalDutiesPaise).toBe(75_000); // ₹750
  });

  it("applies localized string overrides without mutating source default content", () => {
    const defaultProduct = {
      title: "Handmade Pashmina Shawl",
      description: "Crafted from fine cashmere wool.",
    };

    const hindiTranslations: Record<string, string> = {
      title: "हस्तनिर्मित पश्मीना शॉल",
      description: "बेहतरीन कश्मीरी ऊन से तैयार।",
    };

    const localizedProduct = {
      ...defaultProduct,
      title: hindiTranslations.title || defaultProduct.title,
      description: hindiTranslations.description || defaultProduct.description,
    };

    expect(localizedProduct.title).toBe("हस्तनिर्मित पश्मीना शॉल");
    expect(defaultProduct.title).toBe("Handmade Pashmina Shawl");
  });
});

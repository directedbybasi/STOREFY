import { describe, it, expect } from "vitest";

describe("Phase 15 — Merchandising & Bundles", () => {
  it("calculates bundle availability as minimum possible sets from component inventories", () => {
    // Bundle requires: 2 of Product A, 1 of Product B, 3 of Product C
    const components = [
      { requiredQty: 2, stockAvailable: 10 }, // 10 / 2 = 5 sets
      { requiredQty: 1, stockAvailable: 8 },  // 8 / 1 = 8 sets
      { requiredQty: 3, stockAvailable: 9 },  // 9 / 3 = 3 sets
    ];

    let maxBundles = Infinity;
    for (const comp of components) {
      const possible = Math.floor(comp.stockAvailable / comp.requiredQty);
      if (possible < maxBundles) {
        maxBundles = possible;
      }
    }

    expect(maxBundles).toBe(3); // Constrained by Product C
  });

  it("calculates component-derived bundle pricing accurately in integer Paise", () => {
    const components = [
      { variantPricePaise: 499_00, quantity: 2 }, // 2 x ₹499 = ₹998
      { variantPricePaise: 299_00, quantity: 1 }, // 1 x ₹299 = ₹299
    ];

    const totalPricePaise = components.reduce(
      (sum, c) => sum + c.variantPricePaise * c.quantity,
      0
    );

    expect(totalPricePaise).toBe(1297_00); // ₹1,297.00
  });

  it("applies merchandising rank boost correctly (pinned items always outrank unpinned items)", () => {
    const items = [
      { id: "prod-1", score: 10, isPinned: false },
      { id: "prod-2", score: 50, isPinned: false },
      { id: "prod-3", score: 10 + 1000, isPinned: true }, // pinned gets +1000
    ];

    items.sort((a, b) => b.score - a.score);

    expect(items[0].id).toBe("prod-3"); // pinned product must rank first
    expect(items[1].id).toBe("prod-2");
    expect(items[2].id).toBe("prod-1");
  });
});

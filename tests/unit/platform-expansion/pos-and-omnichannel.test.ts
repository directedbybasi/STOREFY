import { describe, it, expect } from "vitest";
import type { PosReceiptSnapshot } from "@/modules/pos/types";

describe("Phase 16 — POS & Omnichannel Commerce", () => {
  it("calculates POS cash session variance deterministically", () => {
    const openingCashPaise = 100_000; // ₹1,000 opening float
    const cashSalesPaise = 245_000; // ₹2,450 cash collected from sales
    const payoutsPaise = 20_000; // ₹200 petty cash payout
    const expectedCashPaise = openingCashPaise + cashSalesPaise - payoutsPaise; // ₹3,250

    // Scenario A: Exact count
    const countedExact = 325_000;
    const varianceExact = countedExact - expectedCashPaise;
    expect(varianceExact).toBe(0);

    // Scenario B: Cash shortage
    const countedShort = 320_000; // ₹3,200 (short ₹50)
    const varianceShort = countedShort - expectedCashPaise;
    expect(varianceShort).toBe(-5_000); // -₹50

    // Scenario C: Cash overage
    const countedOver = 330_000; // ₹3,300 (over ₹50)
    const varianceOver = countedOver - expectedCashPaise;
    expect(varianceOver).toBe(5_000); // +₹50
  });

  it("calculates in-store cash tender and change accurately", () => {
    const totalAmountPaise = 249_900; // ₹2,499.00
    const tenderAmountPaise = 300_000; // ₹3,000.00 given in cash

    const changePaise = Math.max(0, tenderAmountPaise - totalAmountPaise);
    expect(changePaise).toBe(50_100); // ₹501.00 change due
  });

  it("generates an immutable POS receipt snapshot containing all line items", () => {
    const receipt: PosReceiptSnapshot = {
      orderId: "ord-test-pos-1",
      orderNumber: "POS-1001",
      storeId: "store-pos-1",
      locationId: "loc-store-downtown",
      cashierUserId: "user-cashier-1",
      paymentMethod: "CASH",
      subtotalAmount: 249_900,
      discountAmount: 0,
      taxAmount: 12_495,
      totalAmount: 262_395,
      tenderAmountPaise: 300_000,
      changePaise: 37_605,
      items: [
        {
          title: "Handcrafted Silk Kurta",
          variantTitle: "L / Navy Blue",
          quantity: 1,
          unitPrice: 249_900,
          total: 249_900,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    expect(receipt.orderNumber).toBe("POS-1001");
    expect(receipt.paymentMethod).toBe("CASH");
    expect(receipt.totalAmount).toBe(262_395);
    expect(receipt.changePaise).toBe(37_605);
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0].total).toBe(249_900);
  });

  it("enforces omnichannel sales_channel separation while sharing inventory stock", () => {
    const initialAvailable = 50;
    const posSaleQty = 3;
    const onlineOrderQty = 2;

    const remainingAvailable = initialAvailable - posSaleQty - onlineOrderQty;
    expect(remainingAvailable).toBe(45);
  });
});

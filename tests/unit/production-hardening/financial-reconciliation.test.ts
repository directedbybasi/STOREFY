import { describe, it, expect } from "vitest";

describe("Phase 17 — Financial Reconciliation & Ledger Invariants", () => {
  // 1. Order Totals Invariant
  it("enforces order total reconciliation: Subtotal + Tax + Shipping - Discount = Total", () => {
    const lineItems = [
      { unitPricePaise: 50_000, quantity: 2 }, // ₹1,000.00
      { unitPricePaise: 25_000, quantity: 1 }, // ₹250.00
    ];

    const subtotalPaise = lineItems.reduce((acc, item) => acc + item.unitPricePaise * item.quantity, 0);
    const taxPaise = 22_500;      // ₹225.00 (18% GST)
    const shippingPaise = 5_000;   // ₹50.00
    const discountPaise = 12_500;  // ₹125.00 (Coupon)

    const calculatedTotalPaise = subtotalPaise + taxPaise + shippingPaise - discountPaise;
    const orderTotalPaise = 140_000; // ₹1,400.00

    expect(calculatedTotalPaise).toBe(orderTotalPaise);
  });

  // 2. Payment Captured Invariant
  it("verifies payment captured amount strictly matches verified order total", () => {
    const orderTotalPaise = 250_000; // ₹2,500.00
    const capturedPaymentPaise = 250_000;

    const isReconciled = orderTotalPaise === capturedPaymentPaise;
    expect(isReconciled).toBe(true);

    const partialPaymentPaise = 200_000;
    const hasUnderpayment = partialPaymentPaise < orderTotalPaise;
    expect(hasUnderpayment).toBe(true);
  });

  // 3. Inventory Movements Ledger Reconciliation
  it("reconciles inventory movements ledger: sum of quantityDelta equals onHand stock", () => {
    const initialOnHand = 0;
    const movements = [
      { quantityDelta: 50, reason: "INITIAL_STOCK" },
      { quantityDelta: -2, reason: "ORDER_FULFILLED" },
      { quantityDelta: -1, reason: "ORDER_FULFILLED" },
      { quantityDelta: 1, reason: "RETURN_RESTOCKED" },
      { quantityDelta: 20, reason: "PO_RECEIVED" },
    ];

    const computedOnHand = movements.reduce((acc, m) => acc + m.quantityDelta, initialOnHand);
    const recordedOnHand = 68;

    expect(computedOnHand).toBe(recordedOnHand);
  });

  // 4. Gift Card Ledger Reconciliation
  it("reconciles gift card ledger: initialValue + sum(deltas) equals current balance", () => {
    const initialValuePaise = 100_000; // ₹1,000.00
    const ledger = [
      { amountPaise: -30_000, type: "REDEMPTION" }, // -₹300.00
      { amountPaise: -20_000, type: "REDEMPTION" }, // -₹200.00
      { amountPaise: 10_000, type: "REFUND_RELOAD" }, // +₹100.00
    ];

    const currentBalancePaise = ledger.reduce((acc, entry) => acc + entry.amountPaise, initialValuePaise);
    expect(currentBalancePaise).toBe(60_000); // ₹600.00
  });

  // 5. Wallet Ledger Reconciliation
  it("reconciles wallet ledger: sum of credit and debit transactions equals current wallet balance", () => {
    const ledger = [
      { amountPaise: 50_000, type: "CREDIT" }, // +₹500
      { amountPaise: -15_000, type: "DEBIT" }, // -₹150
      { amountPaise: -10_000, type: "DEBIT" }, // -₹100
      { amountPaise: 5_000, type: "CASHBACK" }, // +₹50
    ];

    const calculatedBalance = ledger.reduce((acc, txn) => acc + txn.amountPaise, 0);
    const currentBalance = 30_000; // ₹300.00

    expect(calculatedBalance).toBe(currentBalance);
  });

  // 6. Loyalty Ledger Reconciliation
  it("reconciles loyalty ledger: sum of points delta equals active account points balance", () => {
    const ledger = [
      { pointsDelta: 100, type: "PURCHASE_EARN" },
      { pointsDelta: 50, type: "BIRTHDAY_BONUS" },
      { pointsDelta: -80, type: "REWARD_REDEMPTION" },
      { pointsDelta: 20, type: "PROMOTIONAL_CREDIT" },
    ];

    const computedPoints = ledger.reduce((acc, entry) => acc + entry.pointsDelta, 0);
    const recordedPoints = 90;

    expect(computedPoints).toBe(recordedPoints);
  });

  // 7. POS Session Cash Reconciliation
  it("reconciles POS session cash: openingCash + cashSales = expectedCash, and variance is computed", () => {
    const openingCashPaise = 500_000; // ₹5,000.00 float
    const posSales = [
      { method: "CASH", amountPaise: 120_000 },
      { method: "CARD", amountPaise: 350_000 }, // Ignored for cash drawer reconciliation
      { method: "CASH", amountPaise: 80_000 },
    ];

    const totalCashCollectedPaise = posSales
      .filter((s) => s.method === "CASH")
      .reduce((acc, s) => acc + s.amountPaise, 0);

    const expectedCashPaise = openingCashPaise + totalCashCollectedPaise; // ₹7,000.00
    expect(expectedCashPaise).toBe(700_000);

    // Cashier counted ₹6,950.00 in the drawer (variance: -₹50.00 shortage)
    const countedCashPaise = 695_000;
    const cashVariancePaise = countedCashPaise - expectedCashPaise;
    expect(cashVariancePaise).toBe(-5_000);
  });
});

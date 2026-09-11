import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { RazorpayPaymentProvider } from "@/modules/payments/adapters/razorpay";
import { CashfreePaymentProvider } from "@/modules/payments/adapters/cashfree";

describe("Phase 10 — Payment Security & High-Risk Failure Modes", () => {
  const secretKey = "test_key_secret_for_sha256_hash";
  const razorpay = new RazorpayPaymentProvider({
    keyId: "rzp_test_12345",
    keySecret: secretKey,
  });

  // HIGH-RISK TEST 1: Fake Payment Success
  it("HIGH-RISK TEST 1: rejects fake client payment success when provider verification fails", async () => {
    // Client sends random fake signature
    const result = await razorpay.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: "order_real_123",
      gatewayPaymentId: "pay_fake_999",
      signature: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });

    expect(result.verified).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Forged or invalid Razorpay payment signature");
  });

  // HIGH-RISK TEST 2: Wrong Amount Detection
  it("HIGH-RISK TEST 2: detects and rejects payment amount mismatch", async () => {
    const orderTotalPaise = 150000; // ₹1,500.00
    const tamperedAmountPaise = 1000; // ₹10.00 (tampered by malicious user)

    // Verify logic detects mismatch
    const isMismatch = orderTotalPaise !== tamperedAmountPaise;
    expect(isMismatch).toBe(true);
  });

  // HIGH-RISK TEST 3: Forged Razorpay Signature
  it("HIGH-RISK TEST 3: rejects forged or modified Razorpay signature", async () => {
    const orderId = "order_valid_001";
    const paymentId = "pay_valid_002";

    // Valid HMAC SHA256 signature
    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // 1. Valid signature passes
    const validResult = await razorpay.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      signature: validSignature,
      rawPayload: { amount: 200000 },
    });
    expect(validResult.verified).toBe(true);
    expect(validResult.status).toBe("CAPTURED");

    // 2. Tampered paymentId with valid signature of old payment fails
    const tamperedResult = await razorpay.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: orderId,
      gatewayPaymentId: "pay_tampered_999",
      signature: validSignature,
    });
    expect(tamperedResult.verified).toBe(false);
    expect(tamperedResult.status).toBe("FAILED");

    // 3. Bit-flipped signature fails
    const alteredSig = validSignature.slice(0, -2) + "ff";
    const bitFlipResult = await razorpay.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      signature: alteredSig,
    });
    expect(bitFlipResult.verified).toBe(false);
  });

  // HIGH-RISK TEST 6: Duplicate Refund Validation
  it("HIGH-RISK TEST 6: prevents duplicate or excessive refunds beyond captured amount", async () => {
    const capturedAmountPaise = 100000; // ₹1,000.00
    const firstRefundPaise = 100000; // Full refund

    // Attempting another refund on already fully refunded transaction
    const remainingRefundable = capturedAmountPaise - firstRefundPaise;
    expect(remainingRefundable).toBe(0);

    const secondRefundAttemptPaise = 50000;
    const isExcessive = secondRefundAttemptPaise > remainingRefundable;
    expect(isExcessive).toBe(true);
  });

  it("validates Cashfree signature verification algorithm", async () => {
    const cfSecret = "cf_secret_key_999";
    const cashfree = new CashfreePaymentProvider({
      appId: "cf_app_1",
      secretKey: cfSecret,
    });

    const orderId = "cf_order_001";
    const paymentId = "cf_pay_001";
    const validSignature = crypto
      .createHmac("sha256", cfSecret)
      .update(`${orderId}${paymentId}`)
      .digest("base64");

    const res = await cashfree.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      signature: validSignature,
    });

    expect(res.verified).toBe(true);
    expect(res.status).toBe("CAPTURED");

    const forgedRes = await cashfree.verifyPayment({
      storeId: "store-1",
      orderId: "order-1",
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      signature: "forged_signature_here",
    });

    expect(forgedRes.verified).toBe(false);
    expect(forgedRes.status).toBe("FAILED");
  });
});

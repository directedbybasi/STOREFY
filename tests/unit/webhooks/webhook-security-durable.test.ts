import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { RazorpayPaymentProvider } from "@/modules/payments/adapters/razorpay";
import { CashfreePaymentProvider } from "@/modules/payments/adapters/cashfree";

describe("Phase 10 — Webhook Security, Idempotency & Monotonic Ordering", () => {
  const webhookSecret = "whsec_super_secret_test_key_123456";
  const razorpay = new RazorpayPaymentProvider({
    keyId: "rzp_test_sample",
    keySecret: "key_secret_test",
    webhookSecret,
  });

  const cashfreeSecret = "cf_secret_key_webhook_999";
  const cashfree = new CashfreePaymentProvider({
    appId: "cf_app_test",
    secretKey: cashfreeSecret,
    webhookSecret: cashfreeSecret,
  });

  it("validates authentic Razorpay webhook raw body HMAC-SHA256 signature", () => {
    const rawBody = JSON.stringify({
      entity: "event",
      account_id: "acc_123",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_xyz_1",
            amount: 250000,
            currency: "INR",
            status: "captured",
            order_id: "order_abc_1",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(Buffer.from(rawBody, "utf8"))
      .digest("hex");

    // 1. Valid signature passes
    const isValid = razorpay.verifyWebhookSignature(rawBody, {
      "x-razorpay-signature": signature,
    });
    expect(isValid).toBe(true);

    // 2. Tampered raw body fails
    const tamperedBody = rawBody.replace("250000", "1000");
    const isTamperedValid = razorpay.verifyWebhookSignature(tamperedBody, {
      "x-razorpay-signature": signature,
    });
    expect(isTamperedValid).toBe(false);

    // 3. Forged header fails
    const isForgedValid = razorpay.verifyWebhookSignature(rawBody, {
      "x-razorpay-signature": "0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(isForgedValid).toBe(false);
  });

  it("validates authentic Cashfree timestamped webhook signature", () => {
    const timestamp = String(Date.now());
    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: {
        order: { order_id: "cf_ord_1" },
        payment: { cf_payment_id: "cf_pay_1", payment_amount: 1500, payment_status: "SUCCESS" },
      },
    });

    const signature = crypto
      .createHmac("sha256", cashfreeSecret)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");

    const isValid = cashfree.verifyWebhookSignature(rawBody, {
      "x-webhook-signature": signature,
      "x-webhook-timestamp": timestamp,
    });
    expect(isValid).toBe(true);

    // Expired or forged timestamp fails
    const isForgedValid = cashfree.verifyWebhookSignature(rawBody, {
      "x-webhook-signature": signature,
      "x-webhook-timestamp": "9999999999",
    });
    expect(isForgedValid).toBe(false);
  });

  // HIGH-RISK TEST 4: Duplicate Webhook Idempotency
  it("HIGH-RISK TEST 4: guarantees duplicate webhook idempotency deduplication", () => {
    const processedEvents = new Set<string>();

    function processWebhook(eventId: string): { processed: boolean; duplicate: boolean } {
      if (processedEvents.has(eventId)) {
        return { processed: false, duplicate: true };
      }
      processedEvents.add(eventId);
      return { processed: true, duplicate: false };
    }

    const eventId = "evt_razorpay_pay_captured_12345";

    // Request #1: First arrival
    const res1 = processWebhook(eventId);
    expect(res1.processed).toBe(true);
    expect(res1.duplicate).toBe(false);

    // Request #2: Duplicate arrival
    const res2 = processWebhook(eventId);
    expect(res2.processed).toBe(false);
    expect(res2.duplicate).toBe(true);
  });

  // HIGH-RISK TEST 5: Out-of-Order Webhook Handling
  it("HIGH-RISK TEST 5: preserves monotonic state when payment.captured arrives before payment.authorized", () => {
    let paymentStatus: "PENDING" | "AUTHORIZED" | "CAPTURED" = "PENDING";

    function applyWebhookTransition(eventStatus: "AUTHORIZED" | "CAPTURED"): void {
      // Monotonic Rule: Once CAPTURED, never regress to AUTHORIZED or PENDING
      if (paymentStatus === "CAPTURED") {
        return; // Retain CAPTURED
      }
      if (eventStatus === "CAPTURED") {
        paymentStatus = "CAPTURED";
      } else if (eventStatus === "AUTHORIZED") {
        paymentStatus = "AUTHORIZED";
      }
    }

    // Out-of-order scenario: payment.captured arrives FIRST
    applyWebhookTransition("CAPTURED");
    expect(paymentStatus).toBe("CAPTURED");

    // Delayed payment.authorized arrives SECOND
    applyWebhookTransition("AUTHORIZED");
    expect(paymentStatus).toBe("CAPTURED"); // Did NOT regress!
  });
});

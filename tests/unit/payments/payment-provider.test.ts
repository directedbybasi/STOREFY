import { describe, it, expect } from "vitest";
import { RazorpayPaymentProvider } from "@/modules/payments/adapters/razorpay";
import { CashfreePaymentProvider } from "@/modules/payments/adapters/cashfree";
import { CODPaymentProvider } from "@/modules/payments/adapters/cod";
import { encryptCredentials, decryptCredentials, getMaskedCredentials, isMaskedPlaceholder } from "@/modules/payments/vault";

describe("Phase 10 — Payment Provider Architecture & Vault", () => {
  describe("AES-256-GCM Credential Vault", () => {
    it("encrypts and decrypts credentials with zero plaintext leakage", () => {
      const original = {
        keyId: "rzp_test_secKey12345",
        keySecret: "ultra_secret_passphrase_here",
        webhookSecret: "whsec_super_secret_token",
      };

      const cipher = encryptCredentials(original);
      expect(cipher).not.toContain("rzp_test_secKey12345");
      expect(cipher).not.toContain("ultra_secret_passphrase_here");

      const decrypted = decryptCredentials(cipher);
      expect(decrypted.keyId).toBe(original.keyId);
      expect(decrypted.keySecret).toBe(original.keySecret);
      expect(decrypted.webhookSecret).toBe(original.webhookSecret);
    });

    it("masks credentials for client-side display", () => {
      const creds = {
        keyId: "rzp_test_1234567890",
        keySecret: "topsecretkey99999",
      };

      const masked = getMaskedCredentials(creds);
      expect(masked.keyId).toBe("rzp_test••••");
      expect(masked.keySecret).toContain("••••••••");
      expect(isMaskedPlaceholder(masked.keySecret)).toBe(true);
    });
  });

  describe("RazorpayPaymentProvider", () => {
    const provider = new RazorpayPaymentProvider({
      keyId: "rzp_test_sample",
      keySecret: "sample_secret_key_123",
      webhookSecret: "sample_wh_secret",
    });

    it("creates payment order with authoritative paise", async () => {
      const res = await provider.createPaymentOrder({
        storeId: "store-1",
        orderId: "order-1",
        orderNumber: "STF-2026-0001",
        amountPaise: 150000, // ₹1,500.00
        currency: "INR",
        customer: {
          fullName: "Priya Sharma",
          email: "priya@example.com",
          phone: "9876543210",
        },
      });

      expect(res.gateway).toBe("RAZORPAY");
      expect(res.amountPaise).toBe(150000);
      expect(res.status).toBe("PENDING");
      expect(res.clientPayload.razorpayOrderId).toBeDefined();
    });

    it("processes simulated refund cleanly", async () => {
      const res = await provider.processRefund({
        storeId: "store-1",
        orderId: "order-1",
        paymentId: "pay-1",
        amountPaise: 50000,
        currency: "INR",
        reason: "Customer requested return",
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("COMPLETED");
      expect(res.gatewayRefundId).toMatch(/^rfnd_/);
    });
  });

  describe("CashfreePaymentProvider", () => {
    const provider = new CashfreePaymentProvider({
      appId: "cf_app_test",
      secretKey: "cf_secret_key_test",
      isTestMode: true,
    });

    it("creates payment order with payment session id", async () => {
      const res = await provider.createPaymentOrder({
        storeId: "store-1",
        orderId: "order-1",
        orderNumber: "STF-2026-0002",
        amountPaise: 250000, // ₹2,500.00
        currency: "INR",
        customer: {
          fullName: "Rahul Verma",
          email: "rahul@example.com",
          phone: "9876543211",
        },
      });

      expect(res.gateway).toBe("CASHFREE");
      expect(res.amountPaise).toBe(250000);
      expect(res.clientPayload.paymentSessionId).toBeDefined();
    });
  });

  describe("CODPaymentProvider", () => {
    it("respects COD limits and returns PENDING payment status", async () => {
      const provider = new CODPaymentProvider({
        enabled: true,
        minAmountPaise: 10000, // ₹100
        maxAmountPaise: 500000, // ₹5,000
      });

      const res = await provider.createPaymentOrder({
        storeId: "store-1",
        orderId: "order-1",
        orderNumber: "STF-2026-0003",
        amountPaise: 200000, // ₹2,000.00
        currency: "INR",
        customer: {
          fullName: "Aarav Kumar",
          email: "aarav@example.com",
          phone: "9876543212",
        },
      });

      expect(res.gateway).toBe("COD");
      expect(res.status).toBe("PENDING");
    });

    it("rejects order exceeding maximum COD threshold", async () => {
      const provider = new CODPaymentProvider({
        enabled: true,
        maxAmountPaise: 100000, // ₹1,000 max
      });

      await expect(
        provider.createPaymentOrder({
          storeId: "store-1",
          orderId: "order-1",
          orderNumber: "STF-2026-0004",
          amountPaise: 500000, // ₹5,000
          currency: "INR",
          customer: {
            fullName: "Aarav Kumar",
            email: "aarav@example.com",
            phone: "9876543212",
          },
        })
      ).rejects.toThrow(/exceeds maximum COD limit/);
    });
  });
});

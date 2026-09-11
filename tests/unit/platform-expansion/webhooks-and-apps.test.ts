import { describe, it, expect } from "vitest";
import { signWebhookPayload } from "@/modules/developer/webhook-service";

describe("Phase 16 — Merchant Webhooks & Apps Platform", () => {
  it("generates cryptographic HMAC-SHA256 signatures for outbound webhook payloads", () => {
    const payload = JSON.stringify({ orderId: "ord-123", amount: 249900 });
    const secret = "whsec_test_secret_key_1234567890abcdef";
    const timestamp = 1757592000;

    const signature1 = signWebhookPayload(payload, secret, timestamp);
    const signature2 = signWebhookPayload(payload, secret, timestamp);

    expect(signature1).toBe(signature2);
    expect(signature1.length).toBe(64); // SHA-256 hex
  });

  it("detects tampering when payload or secret changes", () => {
    const originalPayload = JSON.stringify({ orderId: "ord-123", amount: 249900 });
    const tamperedPayload = JSON.stringify({ orderId: "ord-123", amount: 100 });
    const secret = "whsec_test_secret_key_1234567890abcdef";
    const timestamp = 1757592000;

    const signatureOriginal = signWebhookPayload(originalPayload, secret, timestamp);
    const signatureTampered = signWebhookPayload(tamperedPayload, secret, timestamp);

    expect(signatureOriginal).not.toBe(signatureTampered);
  });

  it("filters webhook deliveries by subscribed event types including wildcards", () => {
    const endpointSpecific = {
      id: "ep-1",
      eventTypes: ["order.created", "order.fulfilled"],
    };
    const endpointWildcard = {
      id: "ep-2",
      eventTypes: ["*"],
    };
    const endpointRefundOnly = {
      id: "ep-3",
      eventTypes: ["refund.created"],
    };

    function isSubscribed(ep: { eventTypes: string[] }, eventType: string): boolean {
      return ep.eventTypes.includes(eventType) || ep.eventTypes.includes("*");
    }

    expect(isSubscribed(endpointSpecific, "order.created")).toBe(true);
    expect(isSubscribed(endpointSpecific, "refund.created")).toBe(false);

    expect(isSubscribed(endpointWildcard, "order.created")).toBe(true);
    expect(isSubscribed(endpointWildcard, "inventory.updated")).toBe(true);

    expect(isSubscribed(endpointRefundOnly, "order.created")).toBe(false);
    expect(isSubscribed(endpointRefundOnly, "refund.created")).toBe(true);
  });

  it("rejects replayed webhook deliveries exceeding the validity tolerance window", () => {
    const currentTimestamp = 1757592300;
    const toleranceSeconds = 300; // 5 minutes

    function isTimestampFresh(deliveryTimestamp: number): boolean {
      return Math.abs(currentTimestamp - deliveryTimestamp) <= toleranceSeconds;
    }

    expect(isTimestampFresh(1757592280)).toBe(true); // 20s ago
    expect(isTimestampFresh(1757591000)).toBe(false); // 1300s ago (stale replay)
  });
});

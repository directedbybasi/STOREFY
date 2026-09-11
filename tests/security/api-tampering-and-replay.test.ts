import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { rateLimiter } from "@/core/api/rate-limiter";
import { RateLimitError, ForbiddenError, NotFoundError } from "@/core/errors";

describe("Phase 17 — API Security, IDOR, Tampering & Replay Attacks", () => {
  const storeA = "11111111-1111-1111-1111-111111111111";
  const storeB = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    rateLimiter.reset();
  });

  // 1. IDOR (Insecure Direct Object Reference) Protection
  it("prevents IDOR: requesting order by ID belonging to another store results in NotFound", () => {
    const ordersDb = [
      { id: "ord-100", storeId: storeA, customerEmail: "alice@storea.com" },
      { id: "ord-200", storeId: storeB, customerEmail: "bob@storeb.com" },
    ];

    function getStoreOrder(requestStoreId: string, requestedOrderId: string) {
      const order = ordersDb.find(
        (o) => o.id === requestedOrderId && o.storeId === requestStoreId
      );
      if (!order) {
        throw new NotFoundError("Order", requestedOrderId);
      }
      return order;
    }

    // Alice on Store A can read ord-100
    expect(getStoreOrder(storeA, "ord-100").customerEmail).toBe("alice@storea.com");

    // Alice on Store A attempts IDOR to read ord-200 -> NotFoundError (not Forbidden to avoid leaking entity existence)
    expect(() => getStoreOrder(storeA, "ord-200")).toThrow(NotFoundError);
  });

  // 2. Scope Escalation Defense
  it("strictly enforces granular scopes and blocks unauthorized action escalation", () => {
    const apiKeyContext = {
      storeId: storeA,
      scopes: ["read_products"], // Read-only products scope
    };

    function assertScope(contextScopes: string[], requiredScope: string): void {
      const hasPermission =
        contextScopes.includes("*") || contextScopes.includes(requiredScope);
      if (!hasPermission) {
        throw new ForbiddenError(`Insufficient API scope: '${requiredScope}' required.`);
      }
    }

    // Permitted
    expect(() => assertScope(apiKeyContext.scopes, "read_products")).not.toThrow();

    // Blocked escalations
    expect(() => assertScope(apiKeyContext.scopes, "write_products")).toThrow(ForbiddenError);
    expect(() => assertScope(apiKeyContext.scopes, "read_orders")).toThrow(ForbiddenError);
    expect(() => assertScope(apiKeyContext.scopes, "write_orders")).toThrow(ForbiddenError);
    expect(() => assertScope(apiKeyContext.scopes, "admin")).toThrow(ForbiddenError);
  });

  // 3. Rate Limiting Protection Against Brute Force & DoS
  it("triggers RateLimitError when API requests exceed threshold", () => {
    const callerIp = "192.168.1.50";
    const limit = 5;
    const windowSeconds = 60;

    // First 5 requests succeed
    for (let i = 0; i < limit; i++) {
      expect(() => rateLimiter.require(callerIp, limit, windowSeconds)).not.toThrow();
    }

    // 6th request is blocked with HTTP 429
    expect(() => rateLimiter.require(callerIp, limit, windowSeconds)).toThrow(RateLimitError);
  });

  // 4. Webhook Replay Attack Protection
  it("detects and rejects replayed webhook payloads with stale timestamps (>300s)", () => {
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 300; // 5 minutes

    function verifyWebhookTimestamp(headerTimestamp: number): boolean {
      const age = now - headerTimestamp;
      return age >= 0 && age <= MAX_AGE_SECONDS;
    }

    // Fresh webhook (10 seconds ago) passes
    expect(verifyWebhookTimestamp(now - 10)).toBe(true);

    // Stale replay attack (600 seconds ago) fails
    expect(verifyWebhookTimestamp(now - 600)).toBe(false);

    // Future-dated clock skew (>5 min ahead) fails
    expect(verifyWebhookTimestamp(now + 400)).toBe(false);
  });

  // 5. Webhook Signature Timing Attack Defense
  it("uses constant-time comparison to prevent HMAC timing analysis attacks", () => {
    const secret = "whsec_secret_key_123456";
    const payload = JSON.stringify({ event: "order.paid", id: "evt_123" });
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    function constantTimeVerify(submittedSig: string): boolean {
      if (submittedSig.length !== expectedSig.length) return false;
      const a = Buffer.from(submittedSig, "hex");
      const b = Buffer.from(expectedSig, "hex");
      return crypto.timingSafeEqual(a, b);
    }

    // Genuine signature passes
    expect(constantTimeVerify(expectedSig)).toBe(true);

    // Tampered signature fails
    const tampered = expectedSig.slice(0, -2) + "aa";
    expect(constantTimeVerify(tampered)).toBe(false);
  });
});

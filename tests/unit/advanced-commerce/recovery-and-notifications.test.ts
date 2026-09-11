import { describe, it, expect } from "vitest";
import { generateRecoveryToken, verifyRecoveryToken } from "@/modules/recovery/recovery-service";
import { MockNotificationProvider } from "@/modules/notifications/notification-service";

describe("Phase 15 — Abandonment Recovery & Notifications", () => {
  it("generates and verifies cryptographically signed recovery tokens", () => {
    const payload = {
      storeId: "store-uuid-001",
      checkoutSessionId: "session-uuid-123",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    const token = generateRecoveryToken(payload);
    expect(typeof token).toBe("string");
    expect(token.includes(".")).toBe(true);

    const verified = verifyRecoveryToken(token);
    expect(verified.storeId).toBe(payload.storeId);
    expect(verified.checkoutSessionId).toBe(payload.checkoutSessionId);
    expect(verified.expiresAt).toBe(payload.expiresAt);
  });

  it("rejects tampered recovery tokens with signature error", () => {
    const payload = {
      storeId: "store-uuid-001",
      checkoutSessionId: "session-uuid-123",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    const token = generateRecoveryToken(payload);
    const parts = token.split(".");
    const tamperedToken = `${parts[0]}X.${parts[1]}`;

    expect(() => verifyRecoveryToken(tamperedToken)).toThrow("Invalid recovery token signature");
  });

  it("rejects expired recovery tokens", () => {
    const payload = {
      storeId: "store-uuid-001",
      checkoutSessionId: "session-uuid-123",
      expiresAt: Date.now() - 1000, // already expired
    };

    const token = generateRecoveryToken(payload);
    expect(() => verifyRecoveryToken(token)).toThrow("Recovery token has expired");
  });

  it("dispatches notifications via MockNotificationProvider", async () => {
    const provider = new MockNotificationProvider();
    const result = await provider.send({
      storeId: "store-001",
      recipient: "customer@example.com",
      channel: "EMAIL",
      content: "Your order is confirmed!",
    });

    expect(result.status).toBe("SENT");
    expect(result.messageId.startsWith("msg_")).toBe(true);
  });
});

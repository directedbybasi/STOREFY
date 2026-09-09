import { describe, it, expect } from "vitest";
import { redactSensitiveData } from "@/core/logger";

describe("Logger Credential Redaction", () => {
  it("redacts sensitive fields like passwords, tokens, and secrets", () => {
    const sensitivePayload = {
      user: "merchant@example.com",
      password: "SuperSecretPassword123!",
      token: "jwt.header.payload",
      nested: {
        key_secret: "razorpay_secret_xyz",
        encryption_master_key: "0123456789abcdef",
        safeValue: "public_display_name",
      },
    };

    const redacted = redactSensitiveData(sensitivePayload);

    expect(redacted.user).toBe("merchant@example.com");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.nested.key_secret).toBe("[REDACTED]");
    expect(redacted.nested.encryption_master_key).toBe("[REDACTED]");
    expect(redacted.nested.safeValue).toBe("public_display_name");
  });

  it("handles arrays and null/undefined values cleanly", () => {
    const payload = [{ secret: "hidden" }, { public: "visible" }, null, undefined];

    const redacted = redactSensitiveData(payload);

    expect(redacted[0].secret).toBe("[REDACTED]");
    expect(redacted[1].public).toBe("visible");
    expect(redacted[2]).toBeNull();
    expect(redacted[3]).toBeUndefined();
  });
});

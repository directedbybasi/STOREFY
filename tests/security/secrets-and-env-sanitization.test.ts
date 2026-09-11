import { describe, it, expect } from "vitest";
import { redactSensitiveData } from "@/core/logger";

describe("Phase 17 — Secret Scanning & Environment Variable Sanitization", () => {
  it("verifies structured logger deeply redacts all confidential keys", () => {
    const payloadWithSecrets = {
      user: {
        id: "usr-1",
        email: "merchant@example.com",
        password: "SuperSecretPassword123!",
      },
      payment: {
        gateway: "RAZORPAY",
        key_secret: "rzp_secret_xyz123",
        token: "tok_bearer_abc987",
      },
      headers: {
        authorization: "Bearer eyJhbGciOi...",
        cookie: "sb-access-token=eyJ...",
      },
      safeMetadata: {
        orderId: "ord-123",
        amountPaise: 150000,
      },
    };

    const sanitized = redactSensitiveData(payloadWithSecrets) as {
      user: { email: string; password: string };
      payment: { gateway: string; key_secret: string; token: string };
      headers: { authorization: string; cookie: string };
      safeMetadata: { orderId: string; amountPaise: number };
    };

    // Sensitive keys must be redacted
    expect(sanitized.user.password).toBe("[REDACTED]");
    expect(sanitized.payment.key_secret).toBe("[REDACTED]");
    expect(sanitized.payment.token).toBe("[REDACTED]");
    expect(sanitized.headers.authorization).toBe("[REDACTED]");
    expect(sanitized.headers.cookie).toBe("[REDACTED]");

    // Safe keys must be preserved
    expect(sanitized.user.email).toBe("merchant@example.com");
    expect(sanitized.safeMetadata.orderId).toBe("ord-123");
    expect(sanitized.safeMetadata.amountPaise).toBe(150000);
  });

  it("verifies NEXT_PUBLIC_* variables in process.env never contain service secrets", () => {
    const dangerousSecretKeywords = [
      "service_role",
      "postgres://",
      "postgresql://",
      "secret_key",
      "master_key",
      "password",
    ];

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("NEXT_PUBLIC_") && typeof value === "string") {
        for (const keyword of dangerousSecretKeywords) {
          expect(
            value.toLowerCase().includes(keyword),
            `Security Failure: Environment variable '${key}' exposes secret keyword '${keyword}' to client browser!`
          ).toBe(false);
        }
      }
    }
  });

  it("verifies sensitive master secrets are kept strictly server-only", () => {
    // SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL must NOT be exposed with NEXT_PUBLIC_ prefix
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_DATABASE_URL).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_DIRECT_URL).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_ENCRYPTION_MASTER_KEY).toBeUndefined();
  });
});

import crypto from "crypto";
import { db } from "@/database/client";
import { abandonedCheckouts, checkoutSessions } from "@/database/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

const RECOVERY_SECRET = process.env.APP_SECRET || "storefy-recovery-secret-key-salt";

export interface RecoveryTokenPayload {
  storeId: string;
  checkoutSessionId: string;
  expiresAt: number; // Unix timestamp
}

/**
 * Generates an HMAC-SHA256 cryptographically signed, tamper-proof recovery token.
 */
export function generateRecoveryToken(payload: RecoveryTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", RECOVERY_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies and parses a signed recovery token.
 */
export function verifyRecoveryToken(token: string): RecoveryTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new ValidationError("Malformed recovery token format.");
  }

  const [data, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", RECOVERY_SECRET)
    .update(data)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new ValidationError("Invalid recovery token signature.");
  }

  const payload: RecoveryTokenPayload = JSON.parse(
    Buffer.from(data, "base64url").toString("utf-8")
  );

  if (Date.now() > payload.expiresAt) {
    throw new ValidationError("Recovery token has expired.");
  }

  return payload;
}

/**
 * Scans for checkout sessions inactive beyond the abandonment threshold (e.g. 30 minutes)
 * and generates durable abandonment tracking records with signed recovery tokens.
 */
export async function detectAndRecordAbandonment(
  storeId: string,
  inactivityMinutes = 30
): Promise<number> {
  const cutoff = new Date(Date.now() - inactivityMinutes * 60 * 1000);

  // Find inactive checkout sessions in RESERVED state
  const inactiveSessions = await db
    .select({
      id: checkoutSessions.id,
      storeId: checkoutSessions.storeId,
      customerId: checkoutSessions.customerId,
      email: checkoutSessions.email,
      phone: checkoutSessions.phone,
      totalAmount: checkoutSessions.totalAmount,
    })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.storeId, storeId),
        eq(checkoutSessions.status, "RESERVED"),
        lt(checkoutSessions.updatedAt, cutoff)
      )
    )
    .limit(50);

  let recordedCount = 0;

  for (const session of inactiveSessions) {
    // Check if already tracked
    const [existing] = await db
      .select()
      .from(abandonedCheckouts)
      .where(
        and(
          eq(abandonedCheckouts.storeId, storeId),
          eq(abandonedCheckouts.checkoutSessionId, session.id)
        )
      )
      .limit(1);

    if (existing) continue;

    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    const recoveryToken = generateRecoveryToken({
      storeId,
      checkoutSessionId: session.id,
      expiresAt,
    });

    await db.insert(abandonedCheckouts).values({
      storeId,
      checkoutSessionId: session.id,
      customerId: session.customerId || null,
      email: session.email || null,
      phone: session.phone || null,
      cartValuePaise: Number(session.totalAmount || 0),
      recoveryToken,
      recoveryState: "ABANDONED",
    });

    recordedCount++;
  }

  return recordedCount;
}

/**
 * Executes recovery using a valid recovery token.
 */
export async function executeRecovery(token: string) {
  const payload = verifyRecoveryToken(token);

  const [abandoned] = await db
    .select()
    .from(abandonedCheckouts)
    .where(
      and(
        eq(abandonedCheckouts.storeId, payload.storeId),
        eq(abandonedCheckouts.checkoutSessionId, payload.checkoutSessionId)
      )
    )
    .limit(1);

  if (!abandoned) {
    throw new NotFoundError("Abandoned checkout record not found.");
  }

  if (abandoned.recoveryState === "RECOVERED") {
    return { alreadyRecovered: true, checkoutSessionId: payload.checkoutSessionId };
  }

  // Mark recovered
  await db
    .update(abandonedCheckouts)
    .set({
      recoveryState: "RECOVERED",
      recoveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(abandonedCheckouts.id, abandoned.id));

  return {
    alreadyRecovered: false,
    checkoutSessionId: payload.checkoutSessionId,
    storeId: payload.storeId,
  };
}

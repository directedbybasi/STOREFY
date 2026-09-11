import { db } from "@/database/client";
import { apiKeys, type ApiKey } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateApiKeyInput, DeveloperAuthContext } from "./types";

/**
 * Computes SHA-256 hash for secure storage and comparison.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generates and stores a scoped API key.
 * Returns rawKey exactly once for merchant storage.
 */
export async function createApiKey(
  input: CreateApiKeyInput,
  actorUserId?: string
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const secretPart = randomBytes(24).toString("hex");
  const rawKey = `sfy_live_${secretPart}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      storeId: input.storeId,
      label: input.label,
      keyPrefix,
      keyHash,
      scopes: input.scopes,
      expiresAt,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "api_key:create",
      entity: "api_key",
      entityId: apiKey.id,
      after: { label: apiKey.label, prefix: keyPrefix, scopes: input.scopes },
    });
  }

  return { apiKey, rawKey };
}

/**
 * Verifies an incoming raw API key against stored cryptographic hashes.
 */
export async function verifyApiKey(
  rawKey: string
): Promise<DeveloperAuthContext | null> {
  if (!rawKey || !rawKey.startsWith("sfy_live_")) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isRevoked, false)))
    .limit(1);

  if (!apiKey) return null;

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return {
    storeId: apiKey.storeId,
    scopes: apiKey.scopes,
    keyId: apiKey.id,
    authType: "API_KEY",
  };
}

/**
 * Revokes an API key.
 */
export async function revokeApiKey(
  storeId: string,
  apiKeyId: string,
  actorUserId?: string
): Promise<ApiKey | null> {
  const [revoked] = await db
    .update(apiKeys)
    .set({
      isRevoked: true,
      updatedAt: new Date(),
    })
    .where(and(eq(apiKeys.storeId, storeId), eq(apiKeys.id, apiKeyId)))
    .returning();

  if (actorUserId && revoked) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "api_key:revoke",
      entity: "api_key",
      entityId: apiKeyId,
      after: { isRevoked: true },
    });
  }

  return revoked || null;
}

/**
 * Lists API keys for a store.
 */
export async function listApiKeys(storeId: string): Promise<ApiKey[]> {
  return await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.storeId, storeId));
}

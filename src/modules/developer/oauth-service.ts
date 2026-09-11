import { db } from "@/database/client";
import {
  developerApps,
  oauthAuthorizations,
  type DeveloperApp,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { BadRequestError, UnauthorizedError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateDeveloperAppInput, DeveloperAuthContext } from "./types";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates an OAuth application client for a developer or store integration.
 */
export async function createDeveloperApp(
  input: CreateDeveloperAppInput,
  actorUserId?: string
): Promise<{ app: DeveloperApp; rawClientSecret: string }> {
  const clientId = `app_${randomBytes(16).toString("hex")}`;
  const rawClientSecret = `sec_${randomBytes(32).toString("hex")}`;
  const clientSecretHash = hashToken(rawClientSecret);

  const [app] = await db
    .insert(developerApps)
    .values({
      storeId: input.storeId,
      name: input.name,
      description: input.description,
      clientId,
      clientSecretHash,
      redirectUris: input.redirectUris,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "oauth:create_app",
      entity: "developer_app",
      entityId: app.id,
      after: { name: app.name, clientId },
    });
  }

  return { app, rawClientSecret };
}

/**
 * Issues an authorization code following merchant consent.
 */
export async function issueAuthorizationCode(
  storeId: string,
  appId: string,
  userId: string,
  scopes: string[]
): Promise<string> {
  const rawCode = `code_${randomBytes(24).toString("hex")}`;
  const codeHash = hashToken(rawCode);
  const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(oauthAuthorizations).values({
    storeId,
    appId,
    userId,
    scopes,
    codeHash,
    codeExpiresAt,
  });

  return rawCode;
}

/**
 * Exchanges an authorization code for an OAuth access token.
 */
export async function exchangeCodeForTokens(
  clientId: string,
  rawClientSecret: string,
  rawCode: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] }> {
  const secretHash = hashToken(rawClientSecret);
  const codeHash = hashToken(rawCode);

  const [app] = await db
    .select()
    .from(developerApps)
    .where(
      and(
        eq(developerApps.clientId, clientId),
        eq(developerApps.clientSecretHash, secretHash),
        eq(developerApps.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!app) {
    throw new UnauthorizedError("Invalid OAuth client credentials");
  }

  const [auth] = await db
    .select()
    .from(oauthAuthorizations)
    .where(
      and(
        eq(oauthAuthorizations.appId, app.id),
        eq(oauthAuthorizations.codeHash, codeHash),
        eq(oauthAuthorizations.isRevoked, false)
      )
    )
    .limit(1);

  if (!auth || !auth.codeExpiresAt || auth.codeExpiresAt < new Date()) {
    throw new BadRequestError("Invalid or expired authorization code");
  }

  const rawAccessToken = `atk_${randomBytes(32).toString("hex")}`;
  const rawRefreshToken = `rtk_${randomBytes(32).toString("hex")}`;
  const accessTokenHash = hashToken(rawAccessToken);
  const refreshTokenHash = hashToken(rawRefreshToken);
  const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Invalidate code and set tokens
  await db
    .update(oauthAuthorizations)
    .set({
      codeHash: null,
      codeExpiresAt: null,
      accessTokenHash,
      accessTokenExpiresAt,
      refreshTokenHash,
      updatedAt: new Date(),
    })
    .where(eq(oauthAuthorizations.id, auth.id));

  return {
    accessToken: rawAccessToken,
    refreshToken: rawRefreshToken,
    expiresIn: 86400,
    scopes: auth.scopes,
  };
}

/**
 * Validates an incoming OAuth Bearer token.
 */
export async function verifyOAuthToken(
  rawAccessToken: string
): Promise<DeveloperAuthContext | null> {
  if (!rawAccessToken || !rawAccessToken.startsWith("atk_")) {
    return null;
  }

  const tokenHash = hashToken(rawAccessToken);

  const [auth] = await db
    .select()
    .from(oauthAuthorizations)
    .where(
      and(
        eq(oauthAuthorizations.accessTokenHash, tokenHash),
        eq(oauthAuthorizations.isRevoked, false)
      )
    )
    .limit(1);

  if (!auth) return null;

  if (auth.accessTokenExpiresAt && auth.accessTokenExpiresAt < new Date()) {
    return null;
  }

  return {
    storeId: auth.storeId,
    scopes: auth.scopes,
    appId: auth.appId,
    authType: "OAUTH_TOKEN",
  };
}

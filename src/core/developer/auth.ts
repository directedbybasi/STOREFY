import { headers } from "next/headers";
import { UnauthorizedError, ForbiddenError } from "@/core/errors";
import { verifyApiKey } from "@/modules/developer/api-key-service";
import { verifyOAuthToken } from "@/modules/developer/oauth-service";
import type { DeveloperAuthContext } from "@/modules/developer/types";

/**
 * Authenticates an incoming public API request using API Key or OAuth Bearer Token.
 * Enforces least-privilege scope checks and store boundary isolation.
 */
export async function authenticateDeveloperRequest(
  requiredScope?: string
): Promise<DeveloperAuthContext> {
  const headerList = await headers();
  const apiKeyHeader = headerList.get("x-api-key");
  const authHeader = headerList.get("authorization");

  let authContext: DeveloperAuthContext | null = null;

  if (apiKeyHeader) {
    authContext = await verifyApiKey(apiKeyHeader);
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    authContext = await verifyOAuthToken(rawToken);
  }

  if (!authContext) {
    throw new UnauthorizedError(
      "Missing or invalid developer authentication credentials (API key or Bearer token required)"
    );
  }

  if (requiredScope) {
    const hasScope =
      authContext.scopes.includes(requiredScope) ||
      authContext.scopes.includes("*") ||
      authContext.scopes.includes("all");

    if (!hasScope) {
      throw new ForbiddenError(
        `Insufficient API scope: Required '${requiredScope}' but granted [${authContext.scopes.join(
          ", "
        )}]`
      );
    }
  }

  return authContext;
}

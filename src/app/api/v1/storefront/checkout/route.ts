import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import {
  initializeCheckoutSession,
  getCheckoutSession,
} from "@/modules/checkout";
import { ValidationError, NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

async function resolveRequestContext(req: NextRequest) {
  const headerHost = req.headers.get("x-store-domain") || req.headers.get("host") || "";
  const queryDomain = req.nextUrl.searchParams.get("domain");
  const targetDomain = queryDomain || headerHost;

  const resolution = await resolveStorefrontTenant(targetDomain);
  if (resolution.status !== "ACTIVE") {
    throw new NotFoundError(`No active store resolved for domain: ${targetDomain}`);
  }

  const sessionToken =
    req.headers.get("x-cart-token") ||
    req.cookies.get("storefy_cart_token")?.value ||
    req.nextUrl.searchParams.get("cartToken");

  if (!sessionToken) {
    throw new ValidationError("Missing session token.");
  }

  return { storeId: resolution.store.id, sessionToken };
}

/**
 * GET /api/v1/storefront/checkout?checkoutId=...
 */
export async function GET(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestContext(req);
    const checkoutId = req.nextUrl.searchParams.get("checkoutId");
    if (!checkoutId) {
      throw new ValidationError("checkoutId parameter is required.");
    }

    const session = await getCheckoutSession(storeId, checkoutId, sessionToken);
    return apiSuccess(session);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/v1/storefront/checkout
 * Initializes checkout with 15-minute stock reservation.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestContext(req);
    const session = await initializeCheckoutSession(storeId, sessionToken);
    return apiSuccess(session, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

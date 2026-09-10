import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import {
  initializeCheckoutSession,
  getCheckoutSession,
  updateCheckoutContact,
  updateCheckoutAddress,
  selectCheckoutShipping,
  selectCheckoutPayment,
  confirmCheckout,
  cancelCheckout,
} from "@/modules/checkout/service";
import {
  CheckoutContactSchema,
  CheckoutAddressSchema,
  CheckoutShippingSchema,
  CheckoutPaymentSchema,
} from "@/modules/checkout/validation";
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

/**
 * PATCH /api/v1/storefront/checkout
 * Updates contact, address, shipping, or payment step.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestContext(req);
    const body = await req.json();
    const { checkoutId, action, ...data } = body;

    if (!checkoutId) {
      throw new ValidationError("checkoutId parameter is required.");
    }

    let updatedSession;
    switch (action) {
      case "contact": {
        const parsed = CheckoutContactSchema.parse(data);
        updatedSession = await updateCheckoutContact(storeId, checkoutId, sessionToken, parsed);
        break;
      }
      case "address": {
        const parsed = CheckoutAddressSchema.parse(data);
        updatedSession = await updateCheckoutAddress(storeId, checkoutId, sessionToken, parsed);
        break;
      }
      case "shipping": {
        const parsed = CheckoutShippingSchema.parse(data);
        updatedSession = await selectCheckoutShipping(storeId, checkoutId, sessionToken, parsed);
        break;
      }
      case "payment": {
        const parsed = CheckoutPaymentSchema.parse(data);
        updatedSession = await selectCheckoutPayment(storeId, checkoutId, sessionToken, parsed);
        break;
      }
      case "confirm": {
        const res = await confirmCheckout(storeId, checkoutId, sessionToken);
        return apiSuccess(res);
      }
      default:
        throw new ValidationError(`Unknown checkout action: ${action}. Expected: contact, address, shipping, payment, confirm.`);
    }

    return apiSuccess(updatedSession);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/v1/storefront/checkout?checkoutId=...
 * Cancels active checkout and releases reserved inventory.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestContext(req);
    const checkoutId = req.nextUrl.searchParams.get("checkoutId");
    if (!checkoutId) {
      throw new ValidationError("checkoutId parameter is required.");
    }

    const res = await cancelCheckout(storeId, checkoutId, sessionToken);
    return apiSuccess(res);
  } catch (err) {
    return apiError(err);
  }
}


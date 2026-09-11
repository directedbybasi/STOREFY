import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import {
  createOrderFromCheckoutSession,
  listCustomerOrders,
} from "@/modules/orders/order-service";
import { CreateOrderSchema } from "@/modules/orders/validation";
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
 * POST /api/v1/storefront/orders
 * Creates an order from a confirmed checkout session.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestContext(req);
    const body = await req.json();
    const parsed = CreateOrderSchema.parse(body);

    const order = await createOrderFromCheckoutSession(
      storeId,
      parsed.checkoutSessionId,
      sessionToken
    );

    return apiSuccess(order, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * GET /api/v1/storefront/orders?customerId=...
 * Lists orders for a customer.
 */
export async function GET(req: NextRequest) {
  try {
    const { storeId } = await resolveRequestContext(req);
    const customerId = req.nextUrl.searchParams.get("customerId");

    if (!customerId) {
      throw new ValidationError("customerId parameter is required.");
    }

    const customerOrders = await listCustomerOrders(storeId, customerId);
    return apiSuccess(customerOrders);
  } catch (err) {
    return apiError(err);
  }
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/core/api/response";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import {
  AddToCartSchema,
  UpdateCartItemQuantitySchema,
  RemoveCartItemSchema,
  resolveAuthoritativeCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "@/modules/cart";
import { ValidationError, NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

/**
 * Resolves store ID and session token from the incoming request.
 */
async function resolveRequestCartContext(req: NextRequest): Promise<{
  storeId: string;
  sessionToken: string;
}> {
  // 1. Resolve Store
  const headerHost = req.headers.get("x-store-domain") || req.headers.get("host") || "";
  const queryDomain = req.nextUrl.searchParams.get("domain");
  const targetDomain = queryDomain || headerHost;

  const resolution = await resolveStorefrontTenant(targetDomain);
  if (resolution.status !== "ACTIVE") {
    throw new NotFoundError(`No active store resolved for domain: ${targetDomain}`);
  }

  // 2. Resolve Session Token from header or cookie or query
  const sessionToken =
    req.headers.get("x-cart-token") ||
    req.cookies.get("storefy_cart_token")?.value ||
    req.nextUrl.searchParams.get("cartToken");

  if (!sessionToken) {
    throw new ValidationError("Missing cart session token (x-cart-token or storefy_cart_token cookie required).");
  }

  return {
    storeId: resolution.store.id,
    sessionToken,
  };
}

/**
 * GET /api/v1/storefront/cart
 * Resolves server-authoritative cart with database-derived pricing.
 */
export async function GET(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestCartContext(req);
    const cart = await resolveAuthoritativeCart(storeId, sessionToken);
    return apiSuccess(cart);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/v1/storefront/cart
 * Adds an item to the server-authoritative cart.
 * Client sends variantId and quantity. Price is resolved server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestCartContext(req);
    const body = await req.json();
    const parsed = AddToCartSchema.parse(body);

    const cart = await addItemToCart(storeId, sessionToken, parsed.variantId, parsed.quantity);
    return apiSuccess(cart, undefined, 201);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PATCH /api/v1/storefront/cart
 * Updates line item quantity in the cart.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestCartContext(req);
    const body = await req.json();
    const parsed = UpdateCartItemQuantitySchema.parse(body);

    const cart = await updateCartItemQuantity(storeId, sessionToken, parsed.variantId, parsed.quantity);
    return apiSuccess(cart);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/v1/storefront/cart
 * Removes a specific line item or clears the entire cart.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { storeId, sessionToken } = await resolveRequestCartContext(req);
    const variantId = req.nextUrl.searchParams.get("variantId");

    let cart;
    if (variantId) {
      const parsed = RemoveCartItemSchema.parse({ variantId });
      cart = await removeCartItem(storeId, sessionToken, parsed.variantId);
    } else {
      cart = await clearCart(storeId, sessionToken);
    }

    return apiSuccess(cart);
  } catch (err) {
    return apiError(err);
  }
}

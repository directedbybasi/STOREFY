"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { stores } from "@/database/schema";
import { eq } from "drizzle-orm";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import {
  AddToCartSchema,
  UpdateCartItemQuantitySchema,
  RemoveCartItemSchema,
  type AddToCartInput,
  type UpdateCartItemQuantityInput,
  type RemoveCartItemInput,
} from "./validation";
import {
  resolveAuthoritativeCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  type CartDTO,
} from "./service";
import { NotFoundError } from "@/core/errors";

const CART_COOKIE_NAME = "storefy_cart_token";

/**
 * Resolves or creates an opaque session token stored in an HTTP-only secure cookie.
 */
export async function getOrCreateCartSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (existing && existing.length >= 16) {
    return existing;
  }

  const newToken = crypto.randomUUID();
  cookieStore.set(CART_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return newToken;
}

/**
 * Resolves the active store context from a domain or explicit storeId.
 */
async function resolveStoreId(domainOrStoreId?: string): Promise<string> {
  if (domainOrStoreId) {
    // Check if it's a direct UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domainOrStoreId);
    if (isUuid) {
      const [found] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.id, domainOrStoreId))
        .limit(1);
      if (found) return found.id;
    }

    // Resolve via domain
    const resolution = await resolveStorefrontTenant(domainOrStoreId);
    if (resolution.status === "ACTIVE") {
      return resolution.store.id;
    }
  }

  // Fallback: extract from host header
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const resolution = await resolveStorefrontTenant(host);
  if (resolution.status === "ACTIVE") {
    return resolution.store.id;
  }

  throw new NotFoundError("Unable to resolve store context for cart operation.");
}

export async function getStorefrontCartAction(
  domainOrStoreId?: string
): Promise<{ success: true; cart: CartDTO }> {
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();
  const cart = await resolveAuthoritativeCart(storeId, sessionToken);

  return { success: true, cart };
}

export async function addToStorefrontCartAction(
  input: AddToCartInput,
  domainOrStoreId?: string
): Promise<{ success: true; cart: CartDTO }> {
  const parsed = AddToCartSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const cart = await addItemToCart(storeId, sessionToken, parsed.variantId, parsed.quantity);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/cart`);
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, cart };
}

export async function updateStorefrontCartItemQuantityAction(
  input: UpdateCartItemQuantityInput,
  domainOrStoreId?: string
): Promise<{ success: true; cart: CartDTO }> {
  const parsed = UpdateCartItemQuantitySchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const cart = await updateCartItemQuantity(storeId, sessionToken, parsed.variantId, parsed.quantity);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/cart`);
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, cart };
}

export async function removeStorefrontCartItemAction(
  input: RemoveCartItemInput,
  domainOrStoreId?: string
): Promise<{ success: true; cart: CartDTO }> {
  const parsed = RemoveCartItemSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const cart = await removeCartItem(storeId, sessionToken, parsed.variantId);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/cart`);
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, cart };
}

export async function clearStorefrontCartAction(
  domainOrStoreId?: string
): Promise<{ success: true; cart: CartDTO }> {
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const cart = await clearCart(storeId, sessionToken);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/cart`);
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, cart };
}

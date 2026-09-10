"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/database/client";
import { stores } from "@/database/schema";
import { eq } from "drizzle-orm";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { getOrCreateCartSessionToken } from "@/modules/cart";
import {
  CheckoutContactSchema,
  CheckoutAddressSchema,
  CheckoutShippingSchema,
  CheckoutPaymentSchema,
  type CheckoutContactInput,
  type CheckoutAddressInput,
  type CheckoutShippingInput,
  type CheckoutPaymentInput,
} from "./validation";
import {
  initializeCheckoutSession,
  getCheckoutSession,
  updateCheckoutContact,
  updateCheckoutAddress,
  selectCheckoutShipping,
  selectCheckoutPayment,
  confirmCheckout,
  type CheckoutSessionDTO,
} from "./service";
import { NotFoundError } from "@/core/errors";

/**
 * Resolves the active store context from a domain or explicit storeId.
 */
async function resolveStoreId(domainOrStoreId?: string): Promise<string> {
  if (domainOrStoreId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domainOrStoreId);
    if (isUuid) {
      const [found] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.id, domainOrStoreId))
        .limit(1);
      if (found) return found.id;
    }

    const resolution = await resolveStorefrontTenant(domainOrStoreId);
    if (resolution.status === "ACTIVE") {
      return resolution.store.id;
    }
  }

  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const resolution = await resolveStorefrontTenant(host);
  if (resolution.status === "ACTIVE") {
    return resolution.store.id;
  }

  throw new NotFoundError("Unable to resolve store context for checkout.");
}

export async function initializeStorefrontCheckoutAction(
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await initializeCheckoutSession(storeId, sessionToken);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, session };
}

export async function getStorefrontCheckoutSessionAction(
  checkoutSessionId: string,
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);

  return { success: true, session };
}

export async function updateStorefrontCheckoutContactAction(
  checkoutSessionId: string,
  input: CheckoutContactInput,
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const parsed = CheckoutContactSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await updateCheckoutContact(storeId, checkoutSessionId, sessionToken, parsed);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, session };
}

export async function updateStorefrontCheckoutAddressAction(
  checkoutSessionId: string,
  input: CheckoutAddressInput,
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const parsed = CheckoutAddressSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await updateCheckoutAddress(storeId, checkoutSessionId, sessionToken, parsed);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, session };
}

export async function selectStorefrontCheckoutShippingAction(
  checkoutSessionId: string,
  input: CheckoutShippingInput,
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const parsed = CheckoutShippingSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await selectCheckoutShipping(storeId, checkoutSessionId, sessionToken, parsed);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, session };
}

export async function selectStorefrontCheckoutPaymentAction(
  checkoutSessionId: string,
  input: CheckoutPaymentInput,
  domainOrStoreId?: string
): Promise<{ success: true; session: CheckoutSessionDTO }> {
  const parsed = CheckoutPaymentSchema.parse(input);
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const session = await selectCheckoutPayment(storeId, checkoutSessionId, sessionToken, parsed);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
  }

  return { success: true, session };
}

export async function confirmStorefrontCheckoutAction(
  checkoutSessionId: string,
  domainOrStoreId?: string
): Promise<{
  success: true;
  message: string;
  session: CheckoutSessionDTO;
  orderStatus: "AWAITING_ORDER_CREATION";
}> {
  const storeId = await resolveStoreId(domainOrStoreId);
  const sessionToken = await getOrCreateCartSessionToken();

  const result = await confirmCheckout(storeId, checkoutSessionId, sessionToken);

  if (domainOrStoreId) {
    revalidatePath(`/${domainOrStoreId}/checkout`);
    revalidatePath(`/${domainOrStoreId}/cart`);
  }

  return {
    success: true,
    message: result.message,
    session: result.checkoutSession,
    orderStatus: result.orderStatus,
  };
}

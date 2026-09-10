import { db } from "@/database/client";
import {
  checkoutSessions,
  checkoutSessionItems,
  storeSettings,
  cartItems,
  productVariants,
  products,
  type CheckoutSession,
  type CheckoutAddressData,
} from "@/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  reserveCheckoutItems,
  releaseCheckoutReservation,
  releaseExpiredReservations,
  RESERVATION_HOLD_MINUTES,
  type ItemToReserve,
} from "./reservation";
import { resolveAuthoritativeCart, formatPaiseToRupees } from "@/modules/cart";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";
import {
  type CheckoutContactInput,
  type CheckoutAddressInput,
  type CheckoutShippingInput,
  type CheckoutPaymentInput,
} from "./validation";

export interface CheckoutItemDTO {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  unitPricePaise: number;
  unitPriceFormatted: string;
  quantity: number;
  subtotalPaise: number;
  subtotalFormatted: string;
}

export interface ShippingMethodDTO {
  id: "standard" | "express" | "free";
  name: string;
  costPaise: number;
  costFormatted: string;
  estimatedDays: string;
  isAvailable: boolean;
}

export interface CheckoutSessionDTO {
  id: string;
  storeId: string;
  cartId: string | null;
  sessionToken: string;
  status: "RESERVED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  step: "CONTACT" | "ADDRESS" | "SHIPPING" | "PAYMENT" | "REVIEW" | "CONFIRMATION";
  email: string | null;
  phone: string | null;
  fullName: string | null;
  shippingAddress: CheckoutAddressData | null;
  billingAddress: CheckoutAddressData | null;
  shippingMethodId: string | null;
  shippingMethodName: string | null;
  shippingCostPaise: number;
  shippingCostFormatted: string;
  paymentMethod: "COD" | "ONLINE" | null;
  paymentStatus: "NOT_STARTED" | "PENDING" | "READY_FOR_PAYMENT";
  subtotalPaise: number;
  subtotalFormatted: string;
  discountPaise: number;
  discountFormatted: string;
  taxPaise: number;
  taxFormatted: string;
  totalPaise: number;
  totalFormatted: string;
  currency: string;
  expiresAt: Date;
  remainingSeconds: number;
  isExpired: boolean;
  items: CheckoutItemDTO[];
  availableShippingMethods: ShippingMethodDTO[];
  isCodAvailable: boolean;
  codUnavailableReason: string | null;
}

/**
 * Calculates eligible shipping methods based on store rules and cart subtotal.
 */
export function calculateShippingMethods(subtotalPaise: number): ShippingMethodDTO[] {
  const isFreeEligible = subtotalPaise >= 99900; // Free shipping above ₹999

  return [
    {
      id: "standard",
      name: "Standard Delivery (3-5 Business Days)",
      costPaise: isFreeEligible ? 0 : 9900,
      costFormatted: isFreeEligible ? "Free" : formatPaiseToRupees(9900),
      estimatedDays: "3-5 business days",
      isAvailable: true,
    },
    {
      id: "express",
      name: "Express Delivery (1-2 Business Days)",
      costPaise: 19900,
      costFormatted: formatPaiseToRupees(19900),
      estimatedDays: "1-2 business days",
      isAvailable: true,
    },
    {
      id: "free",
      name: "Free Shipping on Orders over ₹999",
      costPaise: 0,
      costFormatted: "Free",
      estimatedDays: "3-5 business days",
      isAvailable: isFreeEligible,
    },
  ];
}

/**
 * Validates Cash On Delivery eligibility against configured store settings.
 */
async function checkCodEligibility(
  storeId: string,
  totalAmountPaise: number
): Promise<{ isAvailable: boolean; reason: string | null }> {
  const [settings] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId))
    .limit(1);

  if (!settings) {
    return { isAvailable: true, reason: null };
  }

  if (!settings.codEnabled) {
    return {
      isAvailable: false,
      reason: "Cash on Delivery is currently disabled by this store.",
    };
  }

  const minAmount = settings.codMinAmount ?? 0;
  const maxAmount = settings.codMaxAmount ?? 5000000; // default ₹50,000 in paise

  if (totalAmountPaise < minAmount) {
    return {
      isAvailable: false,
      reason: `Cash on Delivery is only available for orders above ${formatPaiseToRupees(minAmount)}.`,
    };
  }

  if (totalAmountPaise > maxAmount) {
    return {
      isAvailable: false,
      reason: `Cash on Delivery limit exceeded (maximum ${formatPaiseToRupees(maxAmount)}). Please select Online Payment.`,
    };
  }

  return { isAvailable: true, reason: null };
}

/**
 * Assembles a sanitized CheckoutSessionDTO from database records.
 */
async function buildCheckoutSessionDTO(
  session: CheckoutSession,
  items: (typeof checkoutSessionItems.$inferSelect)[]
): Promise<CheckoutSessionDTO> {
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
  const isExpired = session.status === "EXPIRED" || (session.status === "RESERVED" && remainingSeconds <= 0);

  // Fetch product and variant titles for items
  const variantIds = items.map((i) => i.variantId);
  const variantRecords = variantIds.length > 0
    ? await db
        .select({
          variantId: productVariants.id,
          variantTitle: productVariants.title,
          sku: productVariants.sku,
          imageUrl: productVariants.imageUrl,
          productTitle: products.title,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(inArray(productVariants.id, variantIds))
    : [];

  const variantMap = new Map(variantRecords.map((v) => [v.variantId, v]));

  const itemDTOs: CheckoutItemDTO[] = items.map((i) => {
    const meta = variantMap.get(i.variantId);
    return {
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productTitle: meta?.productTitle || "Product",
      variantTitle: meta?.variantTitle || "Default",
      sku: meta?.sku || null,
      imageUrl: meta?.imageUrl || null,
      unitPricePaise: i.unitPrice,
      unitPriceFormatted: formatPaiseToRupees(i.unitPrice),
      quantity: i.quantity,
      subtotalPaise: i.subtotal,
      subtotalFormatted: formatPaiseToRupees(i.subtotal),
    };
  });

  const availableShipping = calculateShippingMethods(session.subtotalAmount);
  const codCheck = await checkCodEligibility(session.storeId, session.totalAmount);

  return {
    id: session.id,
    storeId: session.storeId,
    cartId: session.cartId,
    sessionToken: session.sessionToken,
    status:
      isExpired && session.status === "RESERVED"
        ? "EXPIRED"
        : (session.status as CheckoutSessionDTO["status"]),
    step: session.step as CheckoutSessionDTO["step"],
    email: session.email,
    phone: session.phone,
    fullName: session.fullName,
    shippingAddress: session.shippingAddress,
    billingAddress: session.billingAddress,
    shippingMethodId: session.shippingMethodId,
    shippingMethodName: session.shippingMethodName,
    shippingCostPaise: session.shippingCost,
    shippingCostFormatted: formatPaiseToRupees(session.shippingCost),
    paymentMethod: session.paymentMethod as CheckoutSessionDTO["paymentMethod"],
    paymentStatus: session.paymentStatus as CheckoutSessionDTO["paymentStatus"],
    subtotalPaise: session.subtotalAmount,
    subtotalFormatted: formatPaiseToRupees(session.subtotalAmount),
    discountPaise: session.discountAmount,
    discountFormatted: formatPaiseToRupees(session.discountAmount),
    taxPaise: session.taxAmount,
    taxFormatted: formatPaiseToRupees(session.taxAmount),
    totalPaise: session.totalAmount,
    totalFormatted: formatPaiseToRupees(session.totalAmount),
    currency: session.currency,
    expiresAt,
    remainingSeconds,
    isExpired,
    items: itemDTOs,
    availableShippingMethods: availableShipping,
    isCodAvailable: codCheck.isAvailable,
    codUnavailableReason: codCheck.reason,
  };
}

/**
 * Initializes a secure checkout session:
 * 1. Checks and releases any expired reservations on this store.
 * 2. Re-validates cart items and database-authoritative prices.
 * 3. Atomically reserves inventory with a 15-minute hold.
 * 4. Creates checkout_sessions record.
 */
export async function initializeCheckoutSession(
  storeId: string,
  sessionToken: string,
  customerId?: string | null
): Promise<CheckoutSessionDTO> {
  // 1. Clean up stale expired reservations on this store
  await releaseExpiredReservations(storeId);

  // 2. Load and validate cart
  const cart = await resolveAuthoritativeCart(storeId, sessionToken, customerId);

  if (cart.items.length === 0) {
    throw new ValidationError("Your cart is empty. Please add items before checking out.");
  }

  const availableItems = cart.items.filter((i) => i.isAvailable && i.quantity > 0);
  if (availableItems.length === 0) {
    throw new ConflictError(
      "None of the items in your cart are currently in stock. Please update your cart."
    );
  }

  // 3. Check for existing active unexpired checkout session for this cart
  const [existingActive] = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.storeId, storeId),
        eq(checkoutSessions.cartId, cart.id),
        eq(checkoutSessions.status, "RESERVED")
      )
    )
    .limit(1);

  if (existingActive) {
    const remainingMs = new Date(existingActive.expiresAt).getTime() - Date.now();
    if (remainingMs > 60 * 1000) {
      // Reuse existing active session if more than 1 minute remaining
      const items = await db
        .select()
        .from(checkoutSessionItems)
        .where(
          and(
            eq(checkoutSessionItems.checkoutSessionId, existingActive.id),
            eq(checkoutSessionItems.status, "ACTIVE")
          )
        );
      return buildCheckoutSessionDTO(existingActive, items);
    } else {
      // Close almost-expired session and re-reserve cleanly
      await releaseCheckoutReservation(existingActive.id, storeId, "CANCELLED");
    }
  }

  // 4. Calculate reservation items and authoritative subtotal
  const itemsToReserve: ItemToReserve[] = availableItems.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    quantity: i.quantity,
    unitPricePaise: i.unitPricePaise,
  }));

  const subtotalAmount = itemsToReserve.reduce(
    (acc, i) => acc + i.unitPricePaise * i.quantity,
    0
  );
  const defaultShipping = calculateShippingMethods(subtotalAmount)[0];
  const shippingCost = defaultShipping ? defaultShipping.costPaise : 0;
  const totalAmount = subtotalAmount + shippingCost;
  const expiresAt = new Date(Date.now() + RESERVATION_HOLD_MINUTES * 60 * 1000);

  // 5. Transactional reservation and session creation
  const result = await db.transaction(async (tx) => {
    const [createdSession] = await tx
      .insert(checkoutSessions)
      .values({
        storeId,
        cartId: cart.id,
        customerId: customerId || null,
        sessionToken,
        status: "RESERVED",
        step: "CONTACT",
        subtotalAmount,
        discountAmount: 0,
        taxAmount: 0,
        shippingCost,
        shippingMethodId: defaultShipping?.id || "standard",
        shippingMethodName: defaultShipping?.name || "Standard Delivery",
        totalAmount,
        currency: "INR",
        expiresAt,
      })
      .returning();

    // Reserve stock with row-level locks and ledger movements
    await reserveCheckoutItems(
      tx,
      storeId,
      createdSession.id,
      itemsToReserve,
      expiresAt
    );

    return createdSession;
  });

  const sessionItems = await db
    .select()
    .from(checkoutSessionItems)
    .where(
      and(
        eq(checkoutSessionItems.checkoutSessionId, result.id),
        eq(checkoutSessionItems.status, "ACTIVE")
      )
    );

  return buildCheckoutSessionDTO(result, sessionItems);
}

/**
 * Retrieves a checkout session strictly validating store and sessionToken ownership.
 * Triggers automatic expiration release if time elapsed.
 */
export async function getCheckoutSession(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string
): Promise<CheckoutSessionDTO> {
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId),
        eq(checkoutSessions.sessionToken, sessionToken)
      )
    )
    .limit(1);

  if (!session) {
    throw new NotFoundError("Checkout session not found or unauthorized.");
  }

  // Check if session has expired
  if (session.status === "RESERVED" && new Date(session.expiresAt).getTime() <= Date.now()) {
    await releaseCheckoutReservation(session.id, storeId, "EXPIRED");
    session.status = "EXPIRED";
  }

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, session.id));

  return buildCheckoutSessionDTO(session, items);
}

/**
 * Step 1: Update Contact Information.
 */
export async function updateCheckoutContact(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string,
  input: CheckoutContactInput
): Promise<CheckoutSessionDTO> {
  const current = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  if (current.isExpired) {
    throw new ConflictError("Your checkout session has expired. Please return to the cart.");
  }

  const nextStep = current.step === "CONTACT" ? "ADDRESS" : current.step;

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      step: nextStep,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    )
    .returning();

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId));

  return buildCheckoutSessionDTO(updated, items);
}

/**
 * Step 2: Update Shipping Address.
 */
export async function updateCheckoutAddress(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string,
  input: CheckoutAddressInput
): Promise<CheckoutSessionDTO> {
  const current = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  if (current.isExpired) {
    throw new ConflictError("Your checkout session has expired. Please return to the cart.");
  }

  const nextStep = current.step === "ADDRESS" ? "SHIPPING" : current.step;

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      shippingAddress: input,
      step: nextStep,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    )
    .returning();

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId));

  return buildCheckoutSessionDTO(updated, items);
}

/**
 * Step 3: Select Shipping Method.
 */
export async function selectCheckoutShipping(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string,
  input: CheckoutShippingInput
): Promise<CheckoutSessionDTO> {
  const current = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  if (current.isExpired) {
    throw new ConflictError("Your checkout session has expired. Please return to the cart.");
  }

  const methods = calculateShippingMethods(current.subtotalPaise);
  const selected = methods.find((m) => m.id === input.shippingMethodId);

  if (!selected || !selected.isAvailable) {
    throw new ValidationError("The selected shipping method is unavailable for this order.");
  }

  const totalAmount = current.subtotalPaise - current.discountPaise + current.taxPaise + selected.costPaise;
  const nextStep = current.step === "SHIPPING" ? "PAYMENT" : current.step;

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      shippingMethodId: selected.id,
      shippingMethodName: selected.name,
      shippingCost: selected.costPaise,
      totalAmount,
      step: nextStep,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    )
    .returning();

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId));

  return buildCheckoutSessionDTO(updated, items);
}

/**
 * Step 4: Select Payment Method (COD or ONLINE).
 */
export async function selectCheckoutPayment(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string,
  input: CheckoutPaymentInput
): Promise<CheckoutSessionDTO> {
  const current = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  if (current.isExpired) {
    throw new ConflictError("Your checkout session has expired. Please return to the cart.");
  }

  if (input.paymentMethod === "COD") {
    const codCheck = await checkCodEligibility(storeId, current.totalPaise);
    if (!codCheck.isAvailable) {
      throw new ValidationError(codCheck.reason || "Cash on Delivery is unavailable.");
    }
  }

  const paymentStatus = input.paymentMethod === "ONLINE" ? "READY_FOR_PAYMENT" : "PENDING";
  const nextStep = current.step === "PAYMENT" ? "REVIEW" : current.step;

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      paymentMethod: input.paymentMethod,
      paymentStatus,
      step: nextStep,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    )
    .returning();

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId));

  return buildCheckoutSessionDTO(updated, items);
}

/**
 * Step 5 & 6: Final Review & Confirmation.
 * Validates complete checkout pipeline and transitions session to COMPLETED/Prepared state.
 * Empties user cart so items don't duplicate.
 */
export async function confirmCheckout(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string
): Promise<{
  success: true;
  message: string;
  checkoutSession: CheckoutSessionDTO;
  orderStatus: "AWAITING_ORDER_CREATION";
}> {
  const current = await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  if (current.isExpired) {
    throw new ConflictError("Your reservation has expired. Please start checkout again.");
  }

  // Validate required completion invariants
  if (!current.email || !current.phone || !current.fullName) {
    throw new ValidationError("Contact details are incomplete.");
  }
  if (!current.shippingAddress) {
    throw new ValidationError("Shipping address is missing.");
  }
  if (!current.shippingMethodId) {
    throw new ValidationError("Shipping method is not selected.");
  }
  if (!current.paymentMethod) {
    throw new ValidationError("Payment method is not selected.");
  }

  // Update session to CONFIRMATION step
  const [confirmed] = await db
    .update(checkoutSessions)
    .set({
      step: "CONFIRMATION",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, checkoutSessionId),
        eq(checkoutSessions.storeId, storeId)
      )
    )
    .returning();

  // Clear cart items
  if (current.cartId) {
    await db.delete(cartItems).where(eq(cartItems.cartId, current.cartId));
  }

  const items = await db
    .select()
    .from(checkoutSessionItems)
    .where(eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId));

  const dto = await buildCheckoutSessionDTO(confirmed, items);

  return {
    success: true,
    message: "Checkout prepared successfully. Awaiting Phase 9 Order creation.",
    checkoutSession: dto,
    orderStatus: "AWAITING_ORDER_CREATION",
  };
}

/**
 * Cancels a checkout session and releases its active reservations.
 */
export async function cancelCheckout(
  storeId: string,
  checkoutSessionId: string,
  sessionToken: string
): Promise<{ success: true; message: string }> {
  await getCheckoutSession(storeId, checkoutSessionId, sessionToken);
  await releaseCheckoutReservation(checkoutSessionId, storeId, "CANCELLED");

  return {
    success: true,
    message: "Checkout session cancelled and reserved inventory released.",
  };
}


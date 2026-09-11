"use server";

import { db } from "@/database/client";
import { coupons, checkoutSessions, checkoutSessionItems, products, productVariants, type Coupon } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { createCouponSchema, type CreateCouponInput } from "./validation";
import { calculateCouponDiscount, normalizeCouponCode } from "./coupon-engine";
import { NotFoundError, ValidationError } from "@/core/errors";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { formatPaiseToRupees } from "@/modules/cart";

export async function getStoreCouponsAction(): Promise<Coupon[]> {
  const ctx = await requirePermission("marketing:read");
  return await db
    .select()
    .from(coupons)
    .where(eq(coupons.storeId, ctx.store.id))
    .orderBy(desc(coupons.createdAt));
}

export async function createCouponAction(input: CreateCouponInput): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
  const ctx = await requirePermission("marketing:write");
  const parsed = createCouponSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed." };
  }

  const normalizedCode = normalizeCouponCode(parsed.data.code);

  // Check unique code per store
  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.storeId, ctx.store.id), eq(coupons.code, normalizedCode)))
    .limit(1);

  if (existing) {
    return { success: false, error: `Coupon code '${normalizedCode}' already exists in your store.` };
  }

  const [newCoupon] = await db
    .insert(coupons)
    .values({
      storeId: ctx.store.id,
      code: normalizedCode,
      type: parsed.data.type,
      value: parsed.data.value,
      minSpendAmount: parsed.data.minSpendAmount,
      maxDiscountAmount: parsed.data.maxDiscountAmount || null,
      usageLimit: parsed.data.usageLimit || null,
      perCustomerLimit: parsed.data.perCustomerLimit,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      targetType: parsed.data.targetType,
      targetIds: parsed.data.targetIds,
      bogoConfig: parsed.data.bogoConfig || null,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive,
    })
    .returning();

  return { success: true, coupon: newCoupon };
}

export async function toggleCouponStatusAction(couponId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const ctx = await requirePermission("marketing:write");
  await db
    .update(coupons)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(coupons.id, couponId), eq(coupons.storeId, ctx.store.id)));

  return { success: true };
}

/**
 * Storefront Action: Apply coupon to active checkout session.
 */
export async function applyCouponToCheckoutAction(
  domain: string,
  checkoutSessionId: string,
  sessionToken: string,
  couponCode: string
): Promise<{
  success: boolean;
  error?: string;
  discountPaise?: number;
  discountFormatted?: string;
  totalPaise?: number;
  totalFormatted?: string;
}> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return { success: false, error: "Store is currently unavailable." };
    }
    const storeId = resolution.store.id;

    // 1. Fetch checkout session
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
      return { success: false, error: "Checkout session not found." };
    }

    if (session.status === "EXPIRED" || session.status === "CANCELLED") {
      return { success: false, error: "Checkout session is no longer active." };
    }

    // 2. Fetch active reserved items
    const items = await db
      .select({
        id: checkoutSessionItems.id,
        productId: checkoutSessionItems.productId,
        variantId: checkoutSessionItems.variantId,
        quantity: checkoutSessionItems.quantity,
        unitPrice: checkoutSessionItems.unitPrice,
        subtotal: checkoutSessionItems.subtotal,
        categoryId: products.categoryId,
      })
      .from(checkoutSessionItems)
      .innerJoin(products, eq(checkoutSessionItems.productId, products.id))
      .where(
        and(
          eq(checkoutSessionItems.checkoutSessionId, checkoutSessionId),
          eq(checkoutSessionItems.storeId, storeId),
          eq(checkoutSessionItems.status, "ACTIVE")
        )
      );

    if (items.length === 0) {
      return { success: false, error: "No reserved items in checkout." };
    }

    // Map items for calculation
    const cartItemsForCalc = items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      categoryId: i.categoryId,
      quantity: i.quantity,
      unitPricePaise: i.unitPrice,
      subtotalPaise: i.subtotal,
    }));

    // 3. Compute discount server-authoritatively
    const result = await calculateCouponDiscount({
      storeId,
      couponCode,
      items: cartItemsForCalc,
      subtotalPaise: session.subtotalAmount,
      shippingCostPaise: session.shippingCost,
      customerId: session.customerId,
      customerEmail: session.email,
    });

    // 4. Update checkout session with authoritative totals
    const newTotal = Math.max(
      0,
      session.subtotalAmount - result.discountAmountPaise + result.finalShippingCostPaise + session.taxAmount
    );

    await db
      .update(checkoutSessions)
      .set({
        discountAmount: result.discountAmountPaise,
        couponCode: result.code,
        couponSnapshot: result.couponSnapshot,
        shippingCost: result.finalShippingCostPaise,
        totalAmount: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, checkoutSessionId));

    return {
      success: true,
      discountPaise: result.discountAmountPaise,
      discountFormatted: formatPaiseToRupees(result.discountAmountPaise),
      totalPaise: newTotal,
      totalFormatted: formatPaiseToRupees(newTotal),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to apply coupon.";
    return { success: false, error: message };
  }
}

/**
 * Storefront Action: Remove coupon from active checkout session.
 */
export async function removeCouponFromCheckoutAction(
  domain: string,
  checkoutSessionId: string,
  sessionToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return { success: false, error: "Store is currently unavailable." };
    }

    const [session] = await db
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, checkoutSessionId),
          eq(checkoutSessions.storeId, resolution.store.id),
          eq(checkoutSessions.sessionToken, sessionToken)
        )
      )
      .limit(1);

    if (!session) {
      return { success: false, error: "Checkout session not found." };
    }

    // Restore standard shipping cost if free shipping coupon was removed
    const originalShippingCost = session.shippingMethodId === "express" ? 14900 : 9900;
    const restoredTotal = session.subtotalAmount + originalShippingCost + session.taxAmount;

    await db
      .update(checkoutSessions)
      .set({
        discountAmount: 0,
        couponCode: null,
        couponSnapshot: null,
        shippingCost: originalShippingCost,
        totalAmount: restoredTotal,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, checkoutSessionId));

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove coupon.";
    return { success: false, error: message };
  }
}

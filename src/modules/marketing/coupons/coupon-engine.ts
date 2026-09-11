import { db } from "@/database/client";
import { coupons, couponRedemptions, type Coupon } from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { ValidationError, NotFoundError, ConflictError } from "@/core/errors";
import type {
  CalculateCouponInput,
  CalculatedCouponResult,
  CartItemForCoupon,
} from "./types";

/**
 * Normalizes a coupon code for consistent comparison: trimmed, upper-cased.
 */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Evaluates whether a cart item is eligible for the given coupon targeting rules.
 */
export function isItemEligible(item: CartItemForCoupon, coupon: Coupon): boolean {
  if (coupon.targetType === "ALL") {
    return true;
  }

  const targetIds = (coupon.targetIds as string[]) || [];
  if (targetIds.length === 0) {
    return true;
  }

  if (coupon.targetType === "PRODUCTS") {
    return targetIds.includes(item.productId);
  }

  if (coupon.targetType === "CATEGORIES" && item.categoryId) {
    return targetIds.includes(item.categoryId);
  }

  if (coupon.targetType === "COLLECTIONS" && item.collectionIds) {
    return item.collectionIds.some((cId) => targetIds.includes(cId));
  }

  return false;
}

/**
 * Server-authoritative calculation of coupon discounts.
 * Zero client trust: ignores any client-sent discounts or totals.
 */
export async function calculateCouponDiscount(
  input: CalculateCouponInput
): Promise<CalculatedCouponResult> {
  const { storeId, items, subtotalPaise, shippingCostPaise, customerId, customerEmail } = input;
  const normalizedCode = normalizeCouponCode(input.couponCode);

  // 1. Fetch coupon strictly scoped to store
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.storeId, storeId), eq(coupons.code, normalizedCode)))
    .limit(1);

  if (!coupon) {
    throw new NotFoundError("Coupon code is invalid for this store.");
  }

  // 2. Active status check
  if (!coupon.isActive) {
    throw new ValidationError("This coupon is currently inactive.");
  }

  // 3. Date validity check
  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    throw new ValidationError("This coupon is not active yet.");
  }
  if (coupon.endDate && new Date(coupon.endDate) < now) {
    throw new ValidationError("This coupon has expired.");
  }

  // 4. Global usage limit check
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new ConflictError("This coupon has reached its maximum usage limit.");
  }

  // 5. Per-customer usage limit check
  if (customerId || customerEmail) {
    const previousRedemptions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          customerId
            ? eq(couponRedemptions.customerId, customerId)
            : eq(couponRedemptions.customerEmail, customerEmail!)
        )
      );

    const redemptionsCount = previousRedemptions[0]?.count ?? 0;
    if (redemptionsCount >= coupon.perCustomerLimit) {
      throw new ConflictError(
        `You have already reached the redemption limit (${coupon.perCustomerLimit}) for this coupon.`
      );
    }
  }

  // 6. Filter eligible items
  const eligibleItems = items.filter((item) => isItemEligible(item, coupon));
  const eligibleSubtotalPaise = eligibleItems.reduce((sum, item) => sum + item.subtotalPaise, 0);

  if (eligibleSubtotalPaise <= 0 && coupon.type !== "FREE_SHIPPING") {
    throw new ValidationError("No items in your cart are eligible for this coupon.");
  }

  // 7. Minimum spend check against eligible items subtotal
  if (coupon.minSpendAmount > 0 && eligibleSubtotalPaise < coupon.minSpendAmount) {
    const minRupees = (coupon.minSpendAmount / 100).toFixed(0);
    throw new ValidationError(
      `Minimum spend of ₹${minRupees} on eligible products is required for this coupon.`
    );
  }

  let discountAmountPaise = 0;
  let shippingDiscountPaise = 0;

  // 8. Calculate discount based on canonical type
  switch (coupon.type) {
    case "PERCENTAGE": {
      const rawDiscount = Math.round((eligibleSubtotalPaise * coupon.value) / 100);
      discountAmountPaise = coupon.maxDiscountAmount
        ? Math.min(rawDiscount, coupon.maxDiscountAmount)
        : rawDiscount;
      // Cannot exceed eligible subtotal
      discountAmountPaise = Math.min(discountAmountPaise, eligibleSubtotalPaise);
      break;
    }

    case "FIXED_AMOUNT": {
      // Coupon value is in Paise
      discountAmountPaise = Math.min(coupon.value, eligibleSubtotalPaise);
      break;
    }

    case "BOGO": {
      if (!coupon.bogoConfig) {
        throw new ValidationError("BOGO coupon configuration is invalid.");
      }
      const { buyQuantity, getQuantity } = coupon.bogoConfig;
      const groupSize = buyQuantity + getQuantity;

      for (const item of eligibleItems) {
        const qualifyingGroups = Math.floor(item.quantity / groupSize);
        if (qualifyingGroups > 0) {
          const freeUnits = qualifyingGroups * getQuantity;
          discountAmountPaise += freeUnits * item.unitPricePaise;
        }
      }
      discountAmountPaise = Math.min(discountAmountPaise, eligibleSubtotalPaise);
      break;
    }

    case "FREE_SHIPPING": {
      shippingDiscountPaise = shippingCostPaise;
      discountAmountPaise = 0;
      break;
    }
  }

  const finalSubtotalPaise = Math.max(0, subtotalPaise - discountAmountPaise);
  const finalShippingCostPaise = Math.max(0, shippingCostPaise - shippingDiscountPaise);

  return {
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    eligibleSubtotalPaise,
    discountAmountPaise,
    shippingDiscountPaise,
    finalSubtotalPaise,
    finalShippingCostPaise,
    couponSnapshot: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmountPaise,
      appliedAt: new Date().toISOString(),
    },
  };
}

/**
 * Atomically increments coupon usage count in a transaction with atomic usage limit guard.
 * Prevents double redemptions and race conditions (TEST 1).
 */
export async function redeemCouponAtomic(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  couponId: string,
  storeId: string,
  orderId: string,
  discountAmountPaise: number,
  customerId?: string | null,
  customerEmail?: string | null
): Promise<void> {
  // Atomic update: only increments if usage_limit is null OR usage_count < usage_limit
  const updateResult = await tx
    .update(coupons)
    .set({
      usageCount: sql`${coupons.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(coupons.id, couponId),
        eq(coupons.storeId, storeId),
        sql`(${coupons.usageLimit} IS NULL OR ${coupons.usageCount} < ${coupons.usageLimit})`
      )
    )
    .returning({ id: coupons.id, usageCount: coupons.usageCount });

  if (!updateResult || updateResult.length === 0) {
    throw new ConflictError(
      "Coupon usage limit has been reached. Could not redeem coupon."
    );
  }

  // Insert redemption record
  await tx.insert(couponRedemptions).values({
    storeId,
    couponId,
    orderId,
    customerId: customerId || null,
    customerEmail: customerEmail || null,
    discountAmount: discountAmountPaise,
  });
}

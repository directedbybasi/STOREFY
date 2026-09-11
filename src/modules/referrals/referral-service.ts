import crypto from "crypto";
import { db } from "@/database/client";
import {
  referralPrograms,
  referralCodes,
  referralAttributions,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";
import { creditStoreCreditAccount } from "@/modules/store-credit/store-credit-service";
import { earnLoyaltyPoints } from "@/modules/loyalty/loyalty-service";

/**
 * Gets or creates a unique referral code for a customer.
 */
export async function getOrCreateReferralCode(storeId: string, customerId: string) {
  const [existing] = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.storeId, storeId), eq(referralCodes.customerId, customerId)))
    .limit(1);

  if (existing) return existing;

  const code = `REF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const [created] = await db
    .insert(referralCodes)
    .values({
      storeId,
      customerId,
      code,
    })
    .returning();

  return created;
}

/**
 * Associates a referee customer with a referral code.
 * Enforces strict self-referral fraud prevention.
 */
export async function trackReferralAttribution(
  storeId: string,
  code: string,
  refereeCustomerId: string
) {
  const [refCode] = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.storeId, storeId), eq(referralCodes.code, code)))
    .limit(1);

  if (!refCode) {
    throw new NotFoundError("Referral code not found.");
  }

  // Self-referral fraud prevention (Invariant I)
  if (refCode.customerId === refereeCustomerId) {
    throw new ValidationError("Self-referrals are not permitted.");
  }

  const [attribution] = await db
    .insert(referralAttributions)
    .values({
      storeId,
      referralCodeId: refCode.id,
      referrerCustomerId: refCode.customerId,
      refereeCustomerId,
      rewardStatus: "PENDING",
    })
    .returning();

  return attribution;
}

/**
 * Qualifies a completed order for a referral reward.
 */
export async function qualifyReferralOrder(
  storeId: string,
  refereeCustomerId: string,
  orderId: string,
  orderTotalPaise: number
) {
  // Find active program
  const [program] = await db
    .select()
    .from(referralPrograms)
    .where(and(eq(referralPrograms.storeId, storeId), eq(referralPrograms.isActive, true)))
    .limit(1);

  if (!program) return null;

  if (orderTotalPaise < program.minPurchaseAmountPaise) {
    return null; // Minimum purchase threshold not reached
  }

  // Find pending attribution
  const [attribution] = await db
    .select()
    .from(referralAttributions)
    .where(
      and(
        eq(referralAttributions.storeId, storeId),
        eq(referralAttributions.refereeCustomerId, refereeCustomerId),
        eq(referralAttributions.rewardStatus, "PENDING")
      )
    )
    .limit(1);

  if (!attribution) return null;

  // Award reward to referrer
  if (program.rewardType === "STORE_CREDIT") {
    await creditStoreCreditAccount({
      storeId,
      customerId: attribution.referrerCustomerId,
      amountPaise: program.referrerRewardValue,
      reason: `Referral reward for order ${orderId}`,
      referenceId: orderId,
    });
  } else if (program.rewardType === "POINTS") {
    await earnLoyaltyPoints({
      storeId,
      customerId: attribution.referrerCustomerId,
      orderId,
      orderTotalPaise: program.referrerRewardValue * 100, // converted
    });
  }

  // Update attribution status
  await db
    .update(referralAttributions)
    .set({
      orderId,
      qualifiedAt: new Date(),
      rewardStatus: "REWARDED",
    })
    .where(eq(referralAttributions.id, attribution.id));

  return { qualified: true, referrerId: attribution.referrerCustomerId };
}

/**
 * Reverses a referral reward if the associated order is cancelled or refunded.
 */
export async function reverseReferralReward(storeId: string, orderId: string) {
  const [attribution] = await db
    .select()
    .from(referralAttributions)
    .where(and(eq(referralAttributions.storeId, storeId), eq(referralAttributions.orderId, orderId)))
    .limit(1);

  if (!attribution || attribution.rewardStatus !== "REWARDED") return null;

  await db
    .update(referralAttributions)
    .set({ rewardStatus: "REVERSED" })
    .where(eq(referralAttributions.id, attribution.id));

  return { reversed: true, attributionId: attribution.id };
}

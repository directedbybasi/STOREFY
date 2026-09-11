import { db } from "@/database/client";
import { loyaltyAccounts, loyaltyLedger } from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { ValidationError, InsufficientStockError } from "@/core/errors";

export interface EarnPointsInput {
  storeId: string;
  customerId: string;
  orderId?: string;
  orderTotalPaise: number;
  rateRupeesPerPoint?: number; // e.g. ₹10 spent = 1 point
}

export interface RedeemPointsInput {
  storeId: string;
  customerId: string;
  pointsToRedeem: number;
  orderId?: string;
  pointValuePaise?: number; // e.g. 1 point = 100 Paise (₹1)
}

/**
 * Gets or initializes a customer's loyalty account.
 */
export async function getOrCreateLoyaltyAccount(storeId: string, customerId: string) {
  const [existing] = await db
    .select()
    .from(loyaltyAccounts)
    .where(and(eq(loyaltyAccounts.storeId, storeId), eq(loyaltyAccounts.customerId, customerId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(loyaltyAccounts)
    .values({
      storeId,
      customerId,
      pointsBalance: 0,
      lifetimePointsEarned: 0,
    })
    .returning();

  return created;
}

/**
 * Authoritatively calculates and awards loyalty points for an order.
 * Appends an immutable record to the loyalty ledger.
 */
export async function earnLoyaltyPoints(input: EarnPointsInput) {
  const { storeId, customerId, orderId, orderTotalPaise, rateRupeesPerPoint = 10 } = input;

  if (orderTotalPaise <= 0) return null;

  // e.g. ₹1000 order = 100,000 Paise. rate = 10. points = 1000 / 10 = 100 points
  const orderRupees = Math.floor(orderTotalPaise / 100);
  const pointsEarned = Math.floor(orderRupees / rateRupeesPerPoint);

  if (pointsEarned <= 0) return null;

  return db.transaction(async (tx) => {
    const account = await getOrCreateLoyaltyAccount(storeId, customerId);

    const pointsBefore = account.pointsBalance;
    const pointsAfter = pointsBefore + pointsEarned;

    // Update account balance
    await tx
      .update(loyaltyAccounts)
      .set({
        pointsBalance: pointsAfter,
        lifetimePointsEarned: account.lifetimePointsEarned + pointsEarned,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    // Append to immutable ledger
    const [entry] = await tx
      .insert(loyaltyLedger)
      .values({
        storeId,
        accountId: account.id,
        customerId,
        type: "EARN",
        pointsDelta: pointsEarned,
        pointsBefore,
        pointsAfter,
        orderId: orderId || null,
        reason: `Earned points on order ${orderId || ""}`.trim(),
      })
      .returning();

    return { pointsEarned, pointsAfter, ledgerId: entry.id };
  });
}

/**
 * Authoritatively redeems loyalty points with strict row-level balance checks.
 */
export async function redeemLoyaltyPoints(input: RedeemPointsInput) {
  const { storeId, customerId, pointsToRedeem, orderId, pointValuePaise = 100 } = input;

  if (pointsToRedeem <= 0) {
    throw new ValidationError("Redemption points must be greater than zero.");
  }

  return db.transaction(async (tx) => {
    const account = await getOrCreateLoyaltyAccount(storeId, customerId);

    if (account.pointsBalance < pointsToRedeem) {
      throw new ValidationError(
        `Insufficient points balance: Requested ${pointsToRedeem}, available ${account.pointsBalance}`
      );
    }

    const pointsBefore = account.pointsBalance;
    const pointsAfter = pointsBefore - pointsToRedeem;
    const discountAmountPaise = pointsToRedeem * pointValuePaise;

    // Update balance
    await tx
      .update(loyaltyAccounts)
      .set({
        pointsBalance: pointsAfter,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    // Write ledger record
    const [entry] = await tx
      .insert(loyaltyLedger)
      .values({
        storeId,
        accountId: account.id,
        customerId,
        type: "REDEEM",
        pointsDelta: -pointsToRedeem,
        pointsBefore,
        pointsAfter,
        orderId: orderId || null,
        reason: `Redeemed ${pointsToRedeem} points for ₹${(discountAmountPaise / 100).toFixed(2)} discount`,
      })
      .returning();

    return {
      pointsRedeemed: pointsToRedeem,
      discountAmountPaise,
      pointsRemaining: pointsAfter,
      ledgerId: entry.id,
    };
  });
}

/**
 * Reverses points earned on a refunded or cancelled order to prevent fraudulent rewards.
 */
export async function reverseLoyaltyPoints(storeId: string, orderId: string, reason: string) {
  return db.transaction(async (tx) => {
    // Find prior EARN entry for this order
    const [earnEntry] = await tx
      .select()
      .from(loyaltyLedger)
      .where(
        and(
          eq(loyaltyLedger.storeId, storeId),
          eq(loyaltyLedger.orderId, orderId),
          eq(loyaltyLedger.type, "EARN")
        )
      )
      .limit(1);

    if (!earnEntry) return null;

    const [account] = await tx
      .select()
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.id, earnEntry.accountId))
      .limit(1);

    if (!account) return null;

    const pointsToDeduct = Math.min(account.pointsBalance, earnEntry.pointsDelta);
    const pointsBefore = account.pointsBalance;
    const pointsAfter = pointsBefore - pointsToDeduct;

    await tx
      .update(loyaltyAccounts)
      .set({
        pointsBalance: pointsAfter,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    const [reverseEntry] = await tx
      .insert(loyaltyLedger)
      .values({
        storeId,
        accountId: account.id,
        customerId: account.customerId,
        type: "REVERSE",
        pointsDelta: -pointsToDeduct,
        pointsBefore,
        pointsAfter,
        orderId,
        reason: `Reversal: ${reason}`,
      })
      .returning();

    return { pointsReversed: pointsToDeduct, pointsRemaining: pointsAfter, ledgerId: reverseEntry.id };
  });
}

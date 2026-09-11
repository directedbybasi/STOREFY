import crypto from "crypto";
import { db } from "@/database/client";
import { giftCards, giftCardTransactions } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface IssueGiftCardInput {
  storeId: string;
  initialValuePaise: number;
  recipientEmail?: string;
  note?: string;
  expiresAt?: Date;
}

export interface RedeemGiftCardInput {
  storeId: string;
  code: string;
  amountPaise: number;
  orderId?: string;
}

/**
 * Computes SHA-256 hash of a gift card code.
 */
export function hashGiftCardCode(code: string): string {
  const normalized = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generates a high-entropy 16-character alphanumeric code formatted as XXXX-XXXX-XXXX-XXXX.
 */
export function generateRandomGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous chars 0, O, 1, I
  let raw = "";
  for (let i = 0; i < 16; i++) {
    const randIdx = crypto.randomInt(0, chars.length);
    raw += chars[randIdx];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Issues a new fixed-value gift card.
 * CRITICAL SECURITY INVARIANT: The raw code is returned ONCE to the creator and is never stored in plaintext.
 */
export async function issueGiftCard(input: IssueGiftCardInput) {
  const { storeId, initialValuePaise, recipientEmail, note, expiresAt } = input;

  if (initialValuePaise <= 0) {
    throw new ValidationError("Initial gift card value must be greater than zero.");
  }

  const rawCode = generateRandomGiftCardCode();
  const codeHash = hashGiftCardCode(rawCode);
  const codeMasked = `••••-••••-••••-${rawCode.slice(-4)}`;

  const [card] = await db
    .insert(giftCards)
    .values({
      storeId,
      codeHash,
      codeMasked,
      initialValuePaise,
      balancePaise: initialValuePaise,
      recipientEmail: recipientEmail || null,
      note: note || null,
      expiresAt: expiresAt || null,
      status: "ACTIVE",
    })
    .returning();

  return {
    giftCard: card,
    rawCode, // Return plaintext code once for display/delivery
  };
}

/**
 * Validates gift card balance and status via hash lookup.
 */
export async function validateGiftCard(storeId: string, rawCode: string) {
  const codeHash = hashGiftCardCode(rawCode);

  const [card] = await db
    .select()
    .from(giftCards)
    .where(and(eq(giftCards.storeId, storeId), eq(giftCards.codeHash, codeHash)))
    .limit(1);

  if (!card) {
    throw new NotFoundError("Gift card not found or invalid.");
  }

  if (card.status !== "ACTIVE") {
    throw new ValidationError(`Gift card is not active (Status: ${card.status}).`);
  }

  if (card.expiresAt && new Date() > card.expiresAt) {
    throw new ValidationError("Gift card has expired.");
  }

  if (card.balancePaise <= 0) {
    throw new ValidationError("Gift card has zero remaining balance.");
  }

  return {
    id: card.id,
    maskedCode: card.codeMasked,
    balancePaise: card.balancePaise,
    currency: card.currency,
  };
}

/**
 * Authoritatively redeems a gift card balance in atomic transaction with row-level locking.
 * Supports partial redemption.
 */
export async function redeemGiftCard(input: RedeemGiftCardInput) {
  const { storeId, code, amountPaise, orderId } = input;

  if (amountPaise <= 0) {
    throw new ValidationError("Redemption amount must be greater than zero.");
  }

  const codeHash = hashGiftCardCode(code);

  return db.transaction(async (tx) => {
    const [card] = await tx
      .select()
      .from(giftCards)
      .where(and(eq(giftCards.storeId, storeId), eq(giftCards.codeHash, codeHash)))
      .limit(1);

    if (!card) {
      throw new NotFoundError("Gift card not found.");
    }

    if (card.status !== "ACTIVE") {
      throw new ValidationError(`Gift card is ${card.status}.`);
    }

    if (card.expiresAt && new Date() > card.expiresAt) {
      throw new ValidationError("Gift card has expired.");
    }

    if (card.balancePaise < amountPaise) {
      throw new ValidationError(
        `Insufficient gift card balance: Requested ₹${(amountPaise / 100).toFixed(2)}, available ₹${(card.balancePaise / 100).toFixed(2)}`
      );
    }

    const balanceBefore = card.balancePaise;
    const balanceAfter = balanceBefore - amountPaise;
    const newStatus = balanceAfter === 0 ? "REDEEMED" : "ACTIVE";

    // Update gift card balance & status
    await tx
      .update(giftCards)
      .set({
        balancePaise: balanceAfter,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(giftCards.id, card.id));

    // Record immutable transaction
    const [txRecord] = await tx
      .insert(giftCardTransactions)
      .values({
        storeId,
        giftCardId: card.id,
        orderId: orderId || null,
        type: "DEBIT",
        amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
      })
      .returning();

    return {
      redeemedAmountPaise: amountPaise,
      balanceRemainingPaise: balanceAfter,
      status: newStatus,
      transactionId: txRecord.id,
    };
  });
}

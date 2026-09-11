import { db } from "@/database/client";
import { walletAccounts, walletLedger } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface WalletOperationInput {
  storeId: string;
  customerId: string;
  amountPaise: number;
  reason: string;
  referenceId?: string;
  actorId?: string;
  isPromotional?: boolean;
}

/**
 * Gets or initializes a customer's store wallet account.
 */
export async function getOrCreateWalletAccount(storeId: string, customerId: string) {
  const [existing] = await db
    .select()
    .from(walletAccounts)
    .where(and(eq(walletAccounts.storeId, storeId), eq(walletAccounts.customerId, customerId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(walletAccounts)
    .values({
      storeId,
      customerId,
      balancePaise: 0,
      promotionalBalancePaise: 0,
    })
    .returning();

  return created;
}

/**
 * Authoritatively credits the customer wallet (standard or promotional).
 */
export async function creditWallet(input: WalletOperationInput) {
  const { storeId, customerId, amountPaise, reason, referenceId, actorId, isPromotional = false } = input;

  if (amountPaise <= 0) {
    throw new ValidationError("Credit amount must be greater than zero.");
  }

  return db.transaction(async (tx) => {
    const wallet = await getOrCreateWalletAccount(storeId, customerId);

    const balanceBefore = isPromotional ? wallet.promotionalBalancePaise : wallet.balancePaise;
    const balanceAfter = balanceBefore + amountPaise;

    await tx
      .update(walletAccounts)
      .set({
        ...(isPromotional ? { promotionalBalancePaise: balanceAfter } : { balancePaise: balanceAfter }),
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, wallet.id));

    const [entry] = await tx
      .insert(walletLedger)
      .values({
        storeId,
        walletId: wallet.id,
        customerId,
        type: isPromotional ? "PROMO_CREDIT" : "CREDIT",
        amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        reason,
        referenceId: referenceId || null,
        actorId: actorId || null,
      })
      .returning();

    return { balanceAfter, ledgerId: entry.id };
  });
}

/**
 * Authoritatively debits the customer wallet with balance checks.
 */
export async function debitWallet(input: Omit<WalletOperationInput, "isPromotional">) {
  const { storeId, customerId, amountPaise, reason, referenceId, actorId } = input;

  if (amountPaise <= 0) {
    throw new ValidationError("Debit amount must be greater than zero.");
  }

  return db.transaction(async (tx) => {
    const wallet = await getOrCreateWalletAccount(storeId, customerId);

    const totalAvailable = wallet.balancePaise + wallet.promotionalBalancePaise;
    if (totalAvailable < amountPaise) {
      throw new ValidationError(
        `Insufficient wallet balance: Requested ₹${(amountPaise / 100).toFixed(2)}, available ₹${(totalAvailable / 100).toFixed(2)}`
      );
    }

    // Deduct from standard balance first, then promo
    let remainingToDeduct = amountPaise;
    let newStandard = wallet.balancePaise;
    let newPromo = wallet.promotionalBalancePaise;

    if (newStandard >= remainingToDeduct) {
      newStandard -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= newStandard;
      newStandard = 0;
      newPromo -= remainingToDeduct;
    }

    await tx
      .update(walletAccounts)
      .set({
        balancePaise: newStandard,
        promotionalBalancePaise: newPromo,
        updatedAt: new Date(),
      })
      .where(eq(walletAccounts.id, wallet.id));

    const [entry] = await tx
      .insert(walletLedger)
      .values({
        storeId,
        walletId: wallet.id,
        customerId,
        type: "DEBIT",
        amountPaise: -amountPaise,
        balanceBeforePaise: totalAvailable,
        balanceAfterPaise: newStandard + newPromo,
        reason,
        referenceId: referenceId || null,
        actorId: actorId || null,
      })
      .returning();

    return { totalBalanceAfter: newStandard + newPromo, ledgerId: entry.id };
  });
}

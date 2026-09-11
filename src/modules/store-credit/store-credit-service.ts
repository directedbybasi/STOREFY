import { db } from "@/database/client";
import { storeCreditAccounts, storeCreditLedger } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface CreditAccountInput {
  storeId: string;
  customerId: string;
  amountPaise: number;
  reason: string;
  referenceId?: string;
  orderId?: string;
  actorId?: string;
}

export interface DebitAccountInput {
  storeId: string;
  customerId: string;
  amountPaise: number;
  reason: string;
  orderId?: string;
  actorId?: string;
}

/**
 * Gets or initializes a customer's store credit account.
 */
export async function getOrCreateStoreCreditAccount(storeId: string, customerId: string) {
  const [existing] = await db
    .select()
    .from(storeCreditAccounts)
    .where(
      and(
        eq(storeCreditAccounts.storeId, storeId),
        eq(storeCreditAccounts.customerId, customerId)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(storeCreditAccounts)
    .values({
      storeId,
      customerId,
      balancePaise: 0,
    })
    .returning();

  return created;
}

/**
 * Authoritatively credits a customer's store credit account.
 * Appends an immutable record to the store credit ledger.
 */
export async function creditStoreCreditAccount(input: CreditAccountInput) {
  const { storeId, customerId, amountPaise, reason, referenceId, orderId, actorId } = input;

  if (amountPaise <= 0) {
    throw new ValidationError("Credit amount must be greater than zero.");
  }

  return db.transaction(async (tx) => {
    const account = await getOrCreateStoreCreditAccount(storeId, customerId);

    const balanceBefore = account.balancePaise;
    const balanceAfter = balanceBefore + amountPaise;

    await tx
      .update(storeCreditAccounts)
      .set({
        balancePaise: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(storeCreditAccounts.id, account.id));

    const [entry] = await tx
      .insert(storeCreditLedger)
      .values({
        storeId,
        accountId: account.id,
        customerId,
        type: "CREDIT",
        amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        reason,
        referenceId: referenceId || null,
        orderId: orderId || null,
        actorId: actorId || null,
      })
      .returning();

    return { balanceAfter, ledgerId: entry.id };
  });
}

/**
 * Authoritatively debits a customer's store credit account with strict balance validation.
 */
export async function debitStoreCreditAccount(input: DebitAccountInput) {
  const { storeId, customerId, amountPaise, reason, orderId, actorId } = input;

  if (amountPaise <= 0) {
    throw new ValidationError("Debit amount must be greater than zero.");
  }

  return db.transaction(async (tx) => {
    const account = await getOrCreateStoreCreditAccount(storeId, customerId);

    if (account.balancePaise < amountPaise) {
      throw new ValidationError(
        `Insufficient store credit balance: Requested ₹${(amountPaise / 100).toFixed(2)}, available ₹${(account.balancePaise / 100).toFixed(2)}`
      );
    }

    const balanceBefore = account.balancePaise;
    const balanceAfter = balanceBefore - amountPaise;

    await tx
      .update(storeCreditAccounts)
      .set({
        balancePaise: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(storeCreditAccounts.id, account.id));

    const [entry] = await tx
      .insert(storeCreditLedger)
      .values({
        storeId,
        accountId: account.id,
        customerId,
        type: "DEBIT",
        amountPaise: -amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        reason,
        orderId: orderId || null,
        actorId: actorId || null,
      })
      .returning();

    return { balanceAfter, ledgerId: entry.id };
  });
}

/**
 * Converts an approved refund directly into customer store credit.
 */
export async function convertRefundToStoreCredit(
  storeId: string,
  refundId: string,
  customerId: string,
  amountPaise: number,
  actorId?: string
) {
  return creditStoreCreditAccount({
    storeId,
    customerId,
    amountPaise,
    reason: `Refund converted to store credit (Refund ID: ${refundId})`,
    referenceId: refundId,
    actorId,
  });
}

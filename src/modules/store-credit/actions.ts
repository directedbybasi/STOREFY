"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { storeCreditAccounts, storeCreditLedger, walletAccounts, walletLedger } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import {
  getOrCreateStoreCreditAccount,
  creditStoreCreditAccount,
  debitStoreCreditAccount,
} from "./store-credit-service";
import { getOrCreateWalletAccount, creditWallet, debitWallet } from "./wallet-service";

export async function getCustomerStoreCreditAction(customerId: string) {
  const ctx = await requirePermission("customers:view");
  return getOrCreateStoreCreditAccount(ctx.store.id, customerId);
}

export async function adjustCustomerStoreCreditAction(
  customerId: string,
  amountPaise: number,
  reason: string
) {
  const ctx = await requirePermission("customers:manage");
  if (amountPaise > 0) {
    return creditStoreCreditAccount({
      storeId: ctx.store.id,
      customerId,
      amountPaise,
      reason,
      actorId: ctx.user.id,
    });
  } else {
    return debitStoreCreditAccount({
      storeId: ctx.store.id,
      customerId,
      amountPaise: Math.abs(amountPaise),
      reason,
      actorId: ctx.user.id,
    });
  }
}

export async function listStoreCreditLedgerAction(customerId?: string, limit = 20) {
  const ctx = await requirePermission("customers:view");
  if (customerId) {
    return db
      .select()
      .from(storeCreditLedger)
      .where(eq(storeCreditLedger.customerId, customerId))
      .orderBy(desc(storeCreditLedger.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(storeCreditLedger)
    .where(eq(storeCreditLedger.storeId, ctx.store.id))
    .orderBy(desc(storeCreditLedger.createdAt))
    .limit(limit);
}

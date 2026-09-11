"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { loyaltyAccounts, loyaltyLedger } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { getOrCreateLoyaltyAccount, earnLoyaltyPoints, redeemLoyaltyPoints } from "./loyalty-service";

export async function getCustomerLoyaltyAction(customerId: string) {
  const ctx = await requirePermission("customers:view");
  return getOrCreateLoyaltyAccount(ctx.store.id, customerId);
}

export async function listLoyaltyLedgerAction(customerId?: string, limit = 20) {
  const ctx = await requirePermission("customers:view");
  if (customerId) {
    return db
      .select()
      .from(loyaltyLedger)
      .where(eq(loyaltyLedger.customerId, customerId))
      .orderBy(desc(loyaltyLedger.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(loyaltyLedger)
    .where(eq(loyaltyLedger.storeId, ctx.store.id))
    .orderBy(desc(loyaltyLedger.createdAt))
    .limit(limit);
}

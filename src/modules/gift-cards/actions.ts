"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { giftCards, giftCardTransactions } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { issueGiftCard, validateGiftCard, redeemGiftCard } from "./gift-card-service";
import type { IssueGiftCardInput, RedeemGiftCardInput } from "./gift-card-service";

export async function issueGiftCardAction(input: Omit<IssueGiftCardInput, "storeId">) {
  const ctx = await requirePermission("marketing:manage");
  return issueGiftCard({ ...input, storeId: ctx.store.id });
}

export async function listGiftCardsAction(limit = 20) {
  const ctx = await requirePermission("marketing:view");
  return db
    .select({
      id: giftCards.id,
      codeMasked: giftCards.codeMasked,
      initialValuePaise: giftCards.initialValuePaise,
      balancePaise: giftCards.balancePaise,
      status: giftCards.status,
      recipientEmail: giftCards.recipientEmail,
      expiresAt: giftCards.expiresAt,
      createdAt: giftCards.createdAt,
    })
    .from(giftCards)
    .where(eq(giftCards.storeId, ctx.store.id))
    .orderBy(desc(giftCards.createdAt))
    .limit(limit);
}

export async function validateGiftCardAction(code: string) {
  // Allow storefront customer checkout or dashboard
  const { getTenantContext } = await import("@/core/tenant/context");
  const ctx = await getTenantContext();
  return validateGiftCard(ctx.store.id, code);
}

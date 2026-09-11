"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { referralPrograms, referralCodes, referralAttributions } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { getOrCreateReferralCode, trackReferralAttribution } from "./referral-service";

export async function getCustomerReferralCodeAction(customerId: string) {
  const ctx = await requirePermission("customers:view");
  return getOrCreateReferralCode(ctx.store.id, customerId);
}

export async function listReferralAttributionsAction(limit = 20) {
  const ctx = await requirePermission("marketing:view");
  return db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.storeId, ctx.store.id))
    .orderBy(desc(referralAttributions.createdAt))
    .limit(limit);
}

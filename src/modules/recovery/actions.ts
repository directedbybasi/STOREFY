"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { abandonedCheckouts } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { detectAndRecordAbandonment, executeRecovery } from "./recovery-service";

export async function listAbandonedCheckoutsAction(limit = 20) {
  const ctx = await requirePermission("marketing:view");
  return db
    .select()
    .from(abandonedCheckouts)
    .where(eq(abandonedCheckouts.storeId, ctx.store.id))
    .orderBy(desc(abandonedCheckouts.createdAt))
    .limit(limit);
}

export async function triggerAbandonmentScanAction(inactivityMinutes = 30) {
  const ctx = await requirePermission("marketing:manage");
  const count = await detectAndRecordAbandonment(ctx.store.id, inactivityMinutes);
  return { scanned: true, newlyRecorded: count };
}

export async function recoverCheckoutAction(token: string) {
  return executeRecovery(token);
}

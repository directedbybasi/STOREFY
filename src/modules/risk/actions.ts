"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { riskAssessments } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { assessOrderRisk } from "./risk-service";
import type { AssessRiskInput } from "./risk-service";

export async function evaluateOrderRiskAction(input: Omit<AssessRiskInput, "storeId">) {
  const ctx = await requirePermission("orders:view");
  return assessOrderRisk({ ...input, storeId: ctx.store.id });
}

export async function listRiskAssessmentsAction(limit = 20) {
  const ctx = await requirePermission("orders:view");
  return db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.storeId, ctx.store.id))
    .orderBy(desc(riskAssessments.evaluatedAt))
    .limit(limit);
}

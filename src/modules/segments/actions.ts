"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { customerSegments } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { evaluateSegmentMembers } from "./segment-service";
import type { SegmentCondition } from "@/database/schema";

export async function listSegmentsAction() {
  const ctx = await requirePermission("customers:view");
  return db
    .select()
    .from(customerSegments)
    .where(eq(customerSegments.storeId, ctx.store.id))
    .orderBy(desc(customerSegments.createdAt));
}

export async function createSegmentAction(name: string, conditions: SegmentCondition[], description?: string) {
  const ctx = await requirePermission("customers:manage");
  const [segment] = await db
    .insert(customerSegments)
    .values({
      storeId: ctx.store.id,
      name,
      description: description || null,
      conditions,
      memberCount: 0,
    })
    .returning();

  // Evaluate initial membership
  await evaluateSegmentMembers(ctx.store.id, segment.id);

  return segment;
}

export async function refreshSegmentAction(segmentId: string) {
  const ctx = await requirePermission("customers:manage");
  return evaluateSegmentMembers(ctx.store.id, segmentId);
}

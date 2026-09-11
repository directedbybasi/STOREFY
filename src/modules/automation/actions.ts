"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { automations, automationRuns } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import type { CreateAutomationInput } from "./types";

export async function listAutomationsAction() {
  const ctx = await requirePermission("marketing:view");
  return db
    .select()
    .from(automations)
    .where(eq(automations.storeId, ctx.store.id))
    .orderBy(desc(automations.createdAt));
}

export async function createAutomationAction(input: CreateAutomationInput) {
  const ctx = await requirePermission("marketing:manage");
  const [created] = await db
    .insert(automations)
    .values({
      storeId: ctx.store.id,
      name: input.name,
      description: input.description || null,
      triggerEvent: input.triggerEvent,
      conditions: input.conditions,
      actions: input.actions,
      isActive: true,
    })
    .returning();
  return created;
}

export async function toggleAutomationAction(id: string, isActive: boolean) {
  const ctx = await requirePermission("marketing:manage");
  const [updated] = await db
    .update(automations)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(automations.id, id))
    .returning();
  return updated;
}

export async function listAutomationRunsAction(automationId?: string, limit = 20) {
  const ctx = await requirePermission("marketing:view");
  let query = db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.storeId, ctx.store.id))
    .orderBy(desc(automationRuns.startedAt))
    .limit(limit);

  if (automationId) {
    query = db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automationId))
      .orderBy(desc(automationRuns.startedAt))
      .limit(limit);
  }

  return query;
}

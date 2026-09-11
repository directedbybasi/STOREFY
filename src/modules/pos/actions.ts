"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as posService from "./pos-service";
import {
  OpenPosSessionSchema,
  ClosePosSessionSchema,
  CreatePosSaleSchema,
} from "./types";

export async function openPosSessionAction(formData: unknown) {
  const parsed = OpenPosSessionSchema.parse(formData);
  const ctx = await requirePermission("pos:write", parsed.storeId);
  return await posService.openPosSession(parsed, ctx.user.id);
}

export async function closePosSessionAction(formData: unknown) {
  const parsed = ClosePosSessionSchema.parse(formData);
  const ctx = await requirePermission("pos:write", parsed.storeId);
  return await posService.closePosSession(parsed, ctx.user.id);
}

export async function createPosSaleAction(formData: unknown) {
  const parsed = CreatePosSaleSchema.parse(formData);
  const ctx = await requirePermission("pos:write", parsed.storeId);
  return await posService.createPosSale(parsed, ctx.user.id);
}

export async function listPosSessionsAction(storeId: string) {
  await requirePermission("pos:read", storeId);
  return await posService.listPosSessions(storeId);
}

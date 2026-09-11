"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { queryAuditLogs } from "./audit-service";

export async function listAuditLogsAction(filters?: {
  entityType?: string;
  event?: string;
  limit?: number;
  offset?: number;
}) {
  const ctx = await requirePermission("settings:manage");
  return queryAuditLogs({
    storeId: ctx.store.id,
    entityType: filters?.entityType,
    event: filters?.event,
    limit: filters?.limit || 50,
    offset: filters?.offset || 0,
  });
}

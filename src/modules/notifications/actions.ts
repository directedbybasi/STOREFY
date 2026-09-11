"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  listInAppNotifications,
  getUnreadInAppCount,
  markNotificationAsRead,
  sendNotification,
} from "./notification-service";
import type { SendNotificationInput } from "./types";

export async function listInAppNotificationsAction(limit = 20) {
  const ctx = await requirePermission("dashboard:view");
  return listInAppNotifications(ctx.store.id, limit);
}

export async function getUnreadInAppCountAction() {
  const ctx = await requirePermission("dashboard:view");
  return getUnreadInAppCount(ctx.store.id);
}

export async function markNotificationAsReadAction(notificationId: string) {
  const ctx = await requirePermission("dashboard:view");
  return markNotificationAsRead(ctx.store.id, notificationId);
}

export async function sendNotificationAction(input: Omit<SendNotificationInput, "storeId">) {
  const ctx = await requirePermission("marketing:manage");
  return sendNotification({ ...input, storeId: ctx.store.id });
}

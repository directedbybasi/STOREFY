import { db } from "@/database/client";
import {
  notificationDeliveries,
  notificationPreferences,
  inAppNotifications,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { SendNotificationInput, NotificationDeliveryResult, NotificationProvider } from "./types";

/**
 * Mock Notification Provider for deterministic testing and development.
 */
export class MockNotificationProvider implements NotificationProvider {
  async send(input: SendNotificationInput) {
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "SENT" as const,
    };
  }
}

let activeProvider: NotificationProvider = new MockNotificationProvider();

export function setNotificationProviderForTests(provider: NotificationProvider) {
  activeProvider = provider;
}

/**
 * Checks if a customer allows communication on a specific channel.
 */
export async function isNotificationPermitted(
  storeId: string,
  customerId: string | undefined,
  channel: string,
  isMarketing: boolean
): Promise<boolean> {
  if (!customerId) return true; // Default allow for guests / transactional

  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.storeId, storeId),
        eq(notificationPreferences.customerId, customerId)
      )
    )
    .limit(1);

  if (!prefs) return true; // Default opt-in if not configured

  if (isMarketing && !prefs.marketingOptIn) {
    return false;
  }

  if (channel === "EMAIL" && !prefs.emailOptIn) return false;
  if (channel === "SMS" && !prefs.smsOptIn) return false;
  if (channel === "PUSH" && !prefs.pushOptIn) return false;

  return true;
}

/**
 * Dispatches a notification across email, SMS, push, or in-app channels.
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<NotificationDeliveryResult> {
  const { storeId, customerId, recipient, channel, templateCode, subject, content, isMarketing = false } = input;

  // 1. Enforce customer preferences
  const permitted = await isNotificationPermitted(storeId, customerId, channel, isMarketing);
  if (!permitted) {
    const [record] = await db
      .insert(notificationDeliveries)
      .values({
        storeId,
        customerId: customerId || null,
        recipient,
        channel,
        templateCode: templateCode || null,
        subject: subject || null,
        content,
        status: "CANCELLED",
        error: "Customer opted out of this channel or marketing notifications.",
      })
      .returning();

    return {
      deliveryId: record.id,
      status: "CANCELLED",
      error: "Recipient opted out.",
    };
  }

  // 2. In-App shortcut
  if (channel === "IN_APP") {
    await db.insert(inAppNotifications).values({
      storeId,
      userId: recipient, // In-app uses userId as recipient
      title: subject || "Notification",
      message: content,
    });

    const [record] = await db
      .insert(notificationDeliveries)
      .values({
        storeId,
        customerId: customerId || null,
        recipient,
        channel: "IN_APP",
        templateCode: templateCode || null,
        subject: subject || null,
        content,
        status: "DELIVERED",
        sentAt: new Date(),
      })
      .returning();

    return {
      deliveryId: record.id,
      status: "DELIVERED",
    };
  }

  // 3. Provider Dispatch
  try {
    const result = await activeProvider.send(input);

    const [record] = await db
      .insert(notificationDeliveries)
      .values({
        storeId,
        customerId: customerId || null,
        recipient,
        channel,
        templateCode: templateCode || null,
        subject: subject || null,
        content,
        status: result.status,
        providerMessageId: result.messageId,
        sentAt: new Date(),
      })
      .returning();

    return {
      deliveryId: record.id,
      status: result.status,
      providerMessageId: result.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Notification dispatch failed";

    const [record] = await db
      .insert(notificationDeliveries)
      .values({
        storeId,
        customerId: customerId || null,
        recipient,
        channel,
        templateCode: templateCode || null,
        subject: subject || null,
        content,
        status: "FAILED",
        error: errorMsg,
      })
      .returning();

    return {
      deliveryId: record.id,
      status: "FAILED",
      error: errorMsg,
    };
  }
}

/**
 * Lists in-app notifications for the merchant / staff dashboard.
 */
export async function listInAppNotifications(storeId: string, limit = 20) {
  return db
    .select()
    .from(inAppNotifications)
    .where(eq(inAppNotifications.storeId, storeId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(limit);
}

/**
 * Gets unread count of in-app notifications.
 */
export async function getUnreadInAppCount(storeId: string): Promise<number> {
  const [res] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inAppNotifications)
    .where(and(eq(inAppNotifications.storeId, storeId), eq(inAppNotifications.isRead, false)));
  return Number(res?.count || 0);
}

/**
 * Marks an in-app notification as read.
 */
export async function markNotificationAsRead(storeId: string, notificationId: string) {
  return db
    .update(inAppNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(inAppNotifications.storeId, storeId), eq(inAppNotifications.id, notificationId)));
}

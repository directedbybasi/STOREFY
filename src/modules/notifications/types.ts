import type { NotificationChannel, NotificationDeliveryStatus } from "@/database/schema";

export interface SendNotificationInput {
  storeId: string;
  customerId?: string;
  recipient: string; // Email address, Phone number, Device token, or UserId
  channel: NotificationChannel;
  templateCode?: string;
  subject?: string;
  content: string;
  isMarketing?: boolean;
}

export interface NotificationDeliveryResult {
  deliveryId: string;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationProvider {
  send(input: SendNotificationInput): Promise<{ messageId: string; status: NotificationDeliveryStatus }>;
}

import { db } from "@/database/client";
import { salesChannels, type SalesChannel } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateSalesChannelInput } from "./types";

/**
 * Registers a new sales channel for the store.
 */
export async function createSalesChannel(
  input: CreateSalesChannelInput,
  actorUserId?: string
): Promise<SalesChannel> {
  const [channel] = await db
    .insert(salesChannels)
    .values({
      storeId: input.storeId,
      name: input.name,
      type: input.type,
      config: input.config,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "channel:create",
      entity: "sales_channel",
      entityId: channel.id,
      after: { name: channel.name, type: channel.type },
    });
  }

  return channel;
}

/**
 * Lists sales channels for a store.
 */
export async function listSalesChannels(storeId: string): Promise<SalesChannel[]> {
  return await db
    .select()
    .from(salesChannels)
    .where(eq(salesChannels.storeId, storeId));
}

/**
 * Toggles a sales channel active/inactive status.
 */
export async function updateSalesChannelStatus(
  storeId: string,
  channelId: string,
  status: "ACTIVE" | "INACTIVE",
  actorUserId?: string
) {
  const [updated] = await db
    .update(salesChannels)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesChannels.storeId, storeId),
        eq(salesChannels.id, channelId)
      )
    )
    .returning();

  if (actorUserId && updated) {
    await recordAuditLog({
      storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "channel:update_status",
      entity: "sales_channel",
      entityId: updated.id,
      after: { status },
    });
  }

  return updated;
}

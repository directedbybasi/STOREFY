"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as channelService from "./channel-service";
import { CreateSalesChannelSchema } from "./types";

export async function createSalesChannelAction(formData: unknown) {
  const parsed = CreateSalesChannelSchema.parse(formData);
  const ctx = await requirePermission("settings:manage", parsed.storeId);
  return await channelService.createSalesChannel(parsed, ctx.user.id);
}

export async function listSalesChannelsAction(storeId: string) {
  await requirePermission("settings:read", storeId);
  return await channelService.listSalesChannels(storeId);
}

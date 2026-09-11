"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as apiKeyService from "./api-key-service";
import * as oauthService from "./oauth-service";
import * as webhookService from "./webhook-service";
import * as appService from "./app-service";
import {
  CreateApiKeySchema,
  CreateDeveloperAppSchema,
  RegisterWebhookEndpointSchema,
} from "./types";

export async function createApiKeyAction(formData: unknown) {
  const parsed = CreateApiKeySchema.parse(formData);
  const ctx = await requirePermission("api_keys:write", parsed.storeId);
  return await apiKeyService.createApiKey(parsed, ctx.user.id);
}

export async function revokeApiKeyAction(storeId: string, apiKeyId: string) {
  const ctx = await requirePermission("api_keys:write", storeId);
  return await apiKeyService.revokeApiKey(storeId, apiKeyId, ctx.user.id);
}

export async function createDeveloperAppAction(formData: unknown) {
  const parsed = CreateDeveloperAppSchema.parse(formData);
  const ctx = await requirePermission("developer:write", parsed.storeId);
  return await oauthService.createDeveloperApp(parsed, ctx.user.id);
}

export async function registerWebhookEndpointAction(formData: unknown) {
  const parsed = RegisterWebhookEndpointSchema.parse(formData);
  const ctx = await requirePermission("webhooks:write", parsed.storeId);
  return await webhookService.registerWebhookEndpoint(parsed, ctx.user.id);
}

export async function listApiKeysAction(storeId: string) {
  await requirePermission("developer:read", storeId);
  return await apiKeyService.listApiKeys(storeId);
}

export async function listWebhookEndpointsAction(storeId: string) {
  await requirePermission("developer:read", storeId);
  return await webhookService.listWebhookEndpoints(storeId);
}

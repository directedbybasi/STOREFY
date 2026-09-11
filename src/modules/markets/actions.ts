"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as marketService from "./market-service";
import * as currencyService from "./currency-service";
import * as localizationService from "./localization-service";
import * as taxDutiesService from "./tax-duties-service";
import {
  CreateMarketSchema,
  SetExchangeRateSchema,
  SetLocalizedContentSchema,
  CreateTaxConfigSchema,
  CreateDutyConfigSchema,
} from "./types";

export async function createMarketAction(formData: unknown) {
  const parsed = CreateMarketSchema.parse(formData);
  const ctx = await requirePermission("markets:write", parsed.storeId);
  return await marketService.createMarket(parsed, ctx.user.id);
}

export async function setExchangeRateAction(formData: unknown) {
  const parsed = SetExchangeRateSchema.parse(formData);
  const ctx = await requirePermission("markets:write", parsed.storeId);
  return await currencyService.setExchangeRate(parsed, ctx.user.id);
}

export async function setLocalizedContentAction(formData: unknown) {
  const parsed = SetLocalizedContentSchema.parse(formData);
  await requirePermission("content:write", parsed.storeId);
  return await localizationService.setLocalizedContent(parsed);
}

export async function createTaxConfigAction(formData: unknown) {
  const parsed = CreateTaxConfigSchema.parse(formData);
  await requirePermission("settings:manage", parsed.storeId);
  return await taxDutiesService.createTaxConfig(parsed);
}

export async function createDutyConfigAction(formData: unknown) {
  const parsed = CreateDutyConfigSchema.parse(formData);
  await requirePermission("settings:manage", parsed.storeId);
  return await taxDutiesService.createDutyConfig(parsed);
}

export async function listMarketsAction(storeId: string) {
  await requirePermission("markets:read", storeId);
  return await marketService.listMarkets(storeId);
}

"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  generateProductToolSuggestion,
  applyProductToolSuggestion,
  type GenerateAiSuggestionParams,
  type ApplyAiSuggestionParams,
} from "./ai-service";
import { getStoreAiUsageMetrics } from "./usage/quota-service";
import type { ProductToolContext } from "./core/types";

/**
 * Server Action to generate a suggestion from one of the 7 approved AI product tools.
 * Requires `catalog:read` permission.
 */
export async function generateAiSuggestionAction(params: {
  productId?: string;
  tool: string;
  context: Partial<ProductToolContext>;
}) {
  const ctx = await requirePermission("catalog:read");

  return generateProductToolSuggestion({
    storeId: ctx.store.id,
    userId: ctx.user.id,
    productId: params.productId,
    tool: params.tool,
    context: params.context,
  });
}

/**
 * Server Action to explicitly apply an AI suggestion to a product.
 * Requires `catalog:write` permission.
 */
export async function applyAiSuggestionAction(params: {
  productId: string;
  requestId: string;
  tool: string;
  suggestion: unknown;
  expectedUpdatedAt?: string;
}) {
  const ctx = await requirePermission("catalog:write");

  return applyProductToolSuggestion({
    storeId: ctx.store.id,
    userId: ctx.user.id,
    productId: params.productId,
    requestId: params.requestId,
    tool: params.tool,
    suggestion: params.suggestion,
    expectedUpdatedAt: params.expectedUpdatedAt,
  });
}

/**
 * Server Action to fetch AI usage and quota metrics for the current store.
 */
export async function getAiUsageSummaryAction() {
  const ctx = await requirePermission("catalog:read");
  return getStoreAiUsageMetrics(ctx.store.id);
}

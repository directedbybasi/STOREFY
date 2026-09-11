"use server";

import { requirePermission } from "@/core/tenant/rbac";
import { recordAnalyticsEvent, getDashboardAnalyticsOverview } from "./analytics-service";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import type { AnalyticsEventName, DashboardAnalyticsOverview } from "./types";

export interface StorefrontAnalyticsEventPayload {
  eventName: AnalyticsEventName;
  sessionId: string;
  resourceType?: "product" | "collection" | "page" | "order" | "coupon";
  resourceId?: string;
  metadata?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
}

/**
 * Storefront Action: Safely ingests client analytics event strictly scoped to the tenant domain.
 * Cross-store tampering is prevented because storeId is resolved from domain (TEST 12).
 */
export async function recordStorefrontAnalyticsEventAction(
  domain: string,
  payload: StorefrontAnalyticsEventPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return { success: false, error: "Store inactive" };
    }

    await recordAnalyticsEvent({
      storeId: resolution.store.id,
      sessionId: payload.sessionId,
      eventName: payload.eventName,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      metadata: payload.metadata,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmContent: payload.utmContent,
      utmTerm: payload.utmTerm,
      referrer: payload.referrer,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record event";
    return { success: false, error: message };
  }
}

/**
 * Merchant Action: Fetch analytics dashboard data.
 */
export async function getDashboardAnalyticsAction(
  timeRange: "today" | "7d" | "30d" = "7d"
): Promise<DashboardAnalyticsOverview> {
  const ctx = await requirePermission("analytics:view");
  return await getDashboardAnalyticsOverview(ctx.store.id, timeRange);
}

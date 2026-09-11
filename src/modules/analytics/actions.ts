"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  getComprehensiveAnalytics,
  getSalesReport,
  getProductPerformanceReport,
  getCustomerReport,
  getCohortRetention,
  resolveDateRange,
} from "./reporting-service";
import type { AnalyticsTimeRange } from "./types";

/**
 * Server Action: Fetches unified analytics dashboard data.
 */
export async function getComprehensiveAnalyticsAction(
  timeRange: AnalyticsTimeRange = "7d",
  customStartStr?: string,
  customEndStr?: string
) {
  const ctx = await requirePermission("analytics:view");
  const customStart = customStartStr ? new Date(customStartStr) : undefined;
  const customEnd = customEndStr ? new Date(customEndStr) : undefined;

  return getComprehensiveAnalytics(ctx.store.id, timeRange, customStart, customEnd);
}

/**
 * Server Action: Fetches authoritative sales report.
 */
export async function getSalesReportAction(timeRange: AnalyticsTimeRange = "7d") {
  const ctx = await requirePermission("analytics:view");
  const { currentStart, currentEnd } = resolveDateRange(timeRange);
  return getSalesReport(ctx.store.id, currentStart, currentEnd);
}

/**
 * Server Action: Fetches top product performance metrics.
 */
export async function getProductPerformanceAction(timeRange: AnalyticsTimeRange = "7d", limit = 10) {
  const ctx = await requirePermission("analytics:view");
  const { currentStart, currentEnd } = resolveDateRange(timeRange);
  return getProductPerformanceReport(ctx.store.id, currentStart, currentEnd, limit);
}

/**
 * Server Action: Fetches customer CRM retention and LTV metrics.
 */
export async function getCustomerAnalyticsAction(timeRange: AnalyticsTimeRange = "7d") {
  const ctx = await requirePermission("analytics:view");
  const { currentStart, currentEnd } = resolveDateRange(timeRange);
  return getCustomerReport(ctx.store.id, currentStart, currentEnd);
}

/**
 * Server Action: Fetches cohort retention matrix.
 */
export async function getCohortsAction() {
  const ctx = await requirePermission("analytics:view");
  return getCohortRetention(ctx.store.id);
}

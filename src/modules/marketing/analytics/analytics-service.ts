import { db } from "@/database/client";
import {
  analyticsEvents,
  orders,
  orderItems,
  refunds,
  customers,
  type AnalyticsEvent,
} from "@/database/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { formatPaiseToRupees } from "@/modules/cart";
import { ValidationError } from "@/core/errors";
import type {
  RecordAnalyticsEventInput,
  FinancialMetrics,
  ConversionFunnelMetrics,
  TopProductMetric,
  CampaignAttributionMetric,
  DashboardAnalyticsOverview,
} from "./types";

/**
 * Sanitizes metadata to purge any sensitive PII (passwords, card details, auth tokens) (Requirement 51).
 */
export function sanitizeAnalyticsMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const forbiddenKeys = [
    "password",
    "card",
    "cardNumber",
    "cvv",
    "secret",
    "token",
    "authorization",
    "pin",
    "upiPin",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (!forbiddenKeys.some((f) => lower.includes(f))) {
      // Avoid circular or excessive objects
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

/**
 * Records a store-scoped analytics event with sanitization and validation (TEST 12).
 */
export async function recordAnalyticsEvent(
  input: RecordAnalyticsEventInput
): Promise<AnalyticsEvent> {
  const {
    storeId,
    sessionId,
    customerId,
    eventName,
    resourceType,
    resourceId,
    metadata,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referrer,
  } = input;

  if (!storeId || !sessionId || !eventName) {
    throw new ValidationError("Missing required analytics parameters.");
  }

  const cleanMetadata = sanitizeAnalyticsMetadata(metadata);

  const [event] = await db
    .insert(analyticsEvents)
    .values({
      storeId,
      sessionId,
      customerId: customerId || null,
      eventName,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      metadata: cleanMetadata,
      utmSource: utmSource ? utmSource.substring(0, 100) : null,
      utmMedium: utmMedium ? utmMedium.substring(0, 100) : null,
      utmCampaign: utmCampaign ? utmCampaign.substring(0, 100) : null,
      utmContent: utmContent ? utmContent.substring(0, 100) : null,
      utmTerm: utmTerm ? utmTerm.substring(0, 100) : null,
      referrer: referrer ? referrer.substring(0, 500) : null,
    })
    .returning();

  return event;
}

/**
 * Computes start date based on time-range selection ("today", "7d", "30d").
 */
function getStartDateForRange(range: "today" | "7d" | "30d"): Date {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Server-authoritative financial metrics derived EXCLUSIVELY from orders and refunds tables.
 * Client-submitted revenue is NEVER used (TEST 13).
 */
export async function getAuthoritativeFinancialMetrics(
  storeId: string,
  timeRange: "today" | "7d" | "30d" = "7d"
): Promise<FinancialMetrics> {
  const startDate = getStartDateForRange(timeRange);

  // 1. Order aggregation
  const [orderStats] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      grossSalesPaise: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, startDate),
        sql`${orders.status} != 'CANCELLED'`
      )
    );

  // 2. Refund aggregation
  const [refundStats] = await db
    .select({
      totalRefundsPaise: sql<number>`coalesce(sum(${refunds.amount}), 0)::bigint`,
    })
    .from(refunds)
    .where(
      and(
        eq(refunds.storeId, storeId),
        gte(refunds.createdAt, startDate),
        eq(refunds.status, "COMPLETED")
      )
    );

  // 3. Customer count
  const [customerStats] = await db
    .select({
      totalCustomers: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(eq(customers.storeId, storeId));

  const totalOrders = orderStats?.totalOrders || 0;
  const grossSalesPaise = Number(orderStats?.grossSalesPaise || 0);
  const totalRefundsPaise = Number(refundStats?.totalRefundsPaise || 0);
  const netSalesPaise = Math.max(0, grossSalesPaise - totalRefundsPaise);
  const averageOrderValuePaise = totalOrders > 0 ? Math.round(grossSalesPaise / totalOrders) : 0;
  const totalCustomers = customerStats?.totalCustomers || 0;

  return {
    grossSalesPaise,
    grossSalesFormatted: formatPaiseToRupees(grossSalesPaise),
    netSalesPaise,
    netSalesFormatted: formatPaiseToRupees(netSalesPaise),
    totalRefundsPaise,
    totalRefundsFormatted: formatPaiseToRupees(totalRefundsPaise),
    totalOrders,
    averageOrderValuePaise,
    averageOrderValueFormatted: formatPaiseToRupees(averageOrderValuePaise),
    totalCustomers,
  };
}

/**
 * Computes conversion funnel metrics: Product Views -> Add to Cart -> Checkout -> Orders.
 */
export async function getConversionFunnelMetrics(
  storeId: string,
  timeRange: "today" | "7d" | "30d" = "7d"
): Promise<ConversionFunnelMetrics> {
  const startDate = getStartDateForRange(timeRange);

  // Aggregate event counts from analytics_events
  const eventRows = await db
    .select({
      eventName: analyticsEvents.eventName,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.storeId, storeId),
        gte(analyticsEvents.createdAt, startDate)
      )
    )
    .groupBy(analyticsEvents.eventName);

  const eventCounts: Record<string, number> = {};
  for (const r of eventRows) {
    eventCounts[r.eventName] = r.count;
  }

  // Authoritative confirmed orders from orders table
  const [orderCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, startDate),
        sql`${orders.status} != 'CANCELLED'`
      )
    );

  const productViews = eventCounts["product_view"] || 0;
  const addToCart = eventCounts["add_to_cart"] || 0;
  const checkoutStarted = eventCounts["checkout_started"] || 0;
  const paymentStarted = eventCounts["payment_started"] || 0;
  const ordersPlaced = orderCountResult?.count || 0;

  const viewToCart = productViews > 0 ? Number(((addToCart / productViews) * 100).toFixed(1)) : 0;
  const cartToCheckout = addToCart > 0 ? Number(((checkoutStarted / addToCart) * 100).toFixed(1)) : 0;
  const checkoutToPayment = checkoutStarted > 0 ? Number(((paymentStarted / checkoutStarted) * 100).toFixed(1)) : 0;
  const paymentToOrder = paymentStarted > 0 ? Number(((ordersPlaced / paymentStarted) * 100).toFixed(1)) : 0;
  const overallConversion = productViews > 0 ? Number(((ordersPlaced / productViews) * 100).toFixed(1)) : 0;

  return {
    productViews,
    addToCart,
    checkoutStarted,
    paymentStarted,
    ordersPlaced,
    funnelPercentages: {
      viewToCart,
      cartToCheckout,
      checkoutToPayment,
      paymentToOrder,
      overallConversion,
    },
  };
}

/**
 * Top products by quantity sold and revenue from authoritative order line items.
 */
export async function getTopProductsMetrics(
  storeId: string,
  timeRange: "today" | "7d" | "30d" = "7d",
  limit = 5
): Promise<TopProductMetric[]> {
  const startDate = getStartDateForRange(timeRange);

  const rows = await db
    .select({
      productId: orderItems.productId,
      title: orderItems.title,
      totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
      totalRevenuePaise: sql<number>`sum(${orderItems.total})::bigint`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.storeId, storeId),
        gte(orders.createdAt, startDate),
        sql`${orders.status} != 'CANCELLED'`
      )
    )
    .groupBy(orderItems.productId, orderItems.title)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    title: r.title,
    totalQuantity: r.totalQuantity || 0,
    totalRevenuePaise: Number(r.totalRevenuePaise || 0),
    totalRevenueFormatted: formatPaiseToRupees(Number(r.totalRevenuePaise || 0)),
  }));
}

/**
 * Campaign attribution aggregated by utm_source and utm_campaign.
 */
export async function getCampaignAttributionMetrics(
  storeId: string,
  timeRange: "today" | "7d" | "30d" = "7d",
  limit = 10
): Promise<CampaignAttributionMetric[]> {
  const startDate = getStartDateForRange(timeRange);

  const rows = await db
    .select({
      utmSource: analyticsEvents.utmSource,
      utmCampaign: analyticsEvents.utmCampaign,
      sessionsCount: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      eventsCount: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.storeId, storeId),
        gte(analyticsEvents.createdAt, startDate),
        sql`${analyticsEvents.utmSource} IS NOT NULL`
      )
    )
    .groupBy(analyticsEvents.utmSource, analyticsEvents.utmCampaign)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    utmSource: r.utmSource || "Direct",
    utmCampaign: r.utmCampaign || "None",
    sessionsCount: r.sessionsCount || 0,
    eventsCount: r.eventsCount || 0,
  }));
}

/**
 * Complete consolidated analytics overview for merchant dashboard.
 */
export async function getDashboardAnalyticsOverview(
  storeId: string,
  timeRange: "today" | "7d" | "30d" = "7d"
): Promise<DashboardAnalyticsOverview> {
  const [financials, funnel, topProducts, campaigns] = await Promise.all([
    getAuthoritativeFinancialMetrics(storeId, timeRange),
    getConversionFunnelMetrics(storeId, timeRange),
    getTopProductsMetrics(storeId, timeRange, 5),
    getCampaignAttributionMetrics(storeId, timeRange, 10),
  ]);

  return {
    financials,
    funnel,
    topProducts,
    campaigns,
    timeRange,
  };
}

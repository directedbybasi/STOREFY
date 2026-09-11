import type { AnalyticsEvent, AnalyticsEventName } from "@/database/schema";

export type { AnalyticsEvent, AnalyticsEventName };

export interface RecordAnalyticsEventInput {
  storeId: string;
  sessionId: string;
  customerId?: string | null;
  eventName: AnalyticsEventName;
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

export interface FinancialMetrics {
  grossSalesPaise: number;
  grossSalesFormatted: string;
  netSalesPaise: number;
  netSalesFormatted: string;
  totalRefundsPaise: number;
  totalRefundsFormatted: string;
  totalOrders: number;
  averageOrderValuePaise: number;
  averageOrderValueFormatted: string;
  totalCustomers: number;
}

export interface ConversionFunnelMetrics {
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  paymentStarted: number;
  ordersPlaced: number;
  funnelPercentages: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToPayment: number;
    paymentToOrder: number;
    overallConversion: number;
  };
}

export interface TopProductMetric {
  productId: string;
  title: string;
  totalQuantity: number;
  totalRevenuePaise: number;
  totalRevenueFormatted: string;
}

export interface CampaignAttributionMetric {
  utmSource: string;
  utmCampaign: string;
  sessionsCount: number;
  eventsCount: number;
}

export interface DashboardAnalyticsOverview {
  financials: FinancialMetrics;
  funnel: ConversionFunnelMetrics;
  topProducts: TopProductMetric[];
  campaigns: CampaignAttributionMetric[];
  timeRange: "today" | "7d" | "30d";
}

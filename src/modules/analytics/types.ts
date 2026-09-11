export type AnalyticsTimeRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export interface SalesReport {
  grossSalesPaise: number;
  netSalesPaise: number;
  discountAmountPaise: number;
  returnsAmountPaise: number;
  refundsAmountPaise: number;
  shippingAmountPaise: number;
  taxAmountPaise: number;
  ordersCount: number;
  unitsSold: number;
  averageOrderValuePaise: number;
  conversionRate: number; // e.g. 0.032 = 3.2%
}

export interface ProductPerformanceReport {
  productId: string;
  title: string;
  unitsSold: number;
  revenuePaise: number;
  returnRate: number;
  cancellationRate: number;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  averageOrderValuePaise: number;
  observedLtvPaise: number;
  purchaseFrequency: number;
}

export interface CohortRetentionItem {
  cohortMonth: string; // e.g. "2026-01"
  initialCustomerCount: number;
  retentionByMonth: {
    monthIndex: number; // 0, 1, 2, ...
    retainedCount: number;
    retentionRate: number; // 0 to 1
  }[];
}

export interface ComprehensiveAnalyticsDashboard {
  timeRange: AnalyticsTimeRange;
  currentPeriod: SalesReport;
  previousPeriod?: SalesReport;
  topProducts: ProductPerformanceReport[];
  customerMetrics: CustomerReport;
  cohorts: CohortRetentionItem[];
}

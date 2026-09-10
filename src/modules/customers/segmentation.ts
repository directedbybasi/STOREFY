import { CustomerSegment } from "./validation";

// Threshold constants (Paise: 1 INR = 100 Paise)
export const HIGH_VALUE_SPEND_THRESHOLD_PAISE = 1_000_000n; // ₹10,000.00
export const HIGH_VALUE_ORDERS_THRESHOLD = 5;
export const INACTIVE_DAYS_THRESHOLD = 90;
export const NEW_CUSTOMER_DAYS_THRESHOLD = 30;

export interface CustomerMetricsData {
  ordersCount: number;
  totalSpent: number | bigint;
  createdAt: Date;
  lastOrderAt?: Date | null;
}

/**
 * Pure function to derive canonical customer segment:
 * - HIGH_VALUE: totalSpent >= ₹10,000 (1,000,000 Paise) OR ordersCount >= 5
 * - INACTIVE: last order > 90 days ago, OR no orders and customer account created > 30 days ago
 * - RETURNING: ordersCount > 1
 * - NEW: ordersCount <= 1 and created within the last 30 days (default starting state)
 */
export function determineCustomerSegment(customer: CustomerMetricsData): CustomerSegment {
  const now = Date.now();
  const totalSpentBigInt = BigInt(customer.totalSpent ?? 0);
  const ordersCount = customer.ordersCount ?? 0;

  // 1. High Value check
  if (
    totalSpentBigInt >= HIGH_VALUE_SPEND_THRESHOLD_PAISE ||
    ordersCount >= HIGH_VALUE_ORDERS_THRESHOLD
  ) {
    return "HIGH_VALUE";
  }

  // 2. Inactivity check
  if (customer.lastOrderAt) {
    const lastOrderTime = new Date(customer.lastOrderAt).getTime();
    const daysSinceLastOrder = (now - lastOrderTime) / (1000 * 60 * 60 * 24);
    if (daysSinceLastOrder > INACTIVE_DAYS_THRESHOLD) {
      return "INACTIVE";
    }
  } else {
    const createdTime = new Date(customer.createdAt).getTime();
    const daysSinceCreated = (now - createdTime) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > NEW_CUSTOMER_DAYS_THRESHOLD && ordersCount === 0) {
      return "INACTIVE";
    }
  }

  // 3. Returning customer check
  if (ordersCount > 1) {
    return "RETURNING";
  }

  // 4. Default: New customer
  return "NEW";
}

/**
 * Format Paise into Indian Rupee display string
 */
export function formatPaiseToRupees(paise: number | bigint): string {
  const amountNumber = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amountNumber);
}

/**
 * Calculate customer summary metrics from database values
 */
export function calculateCustomerMetrics(customer: {
  ordersCount: number;
  totalSpent: number | bigint;
  lastOrderAt?: Date | null;
}) {
  const ordersCount = customer.ordersCount || 0;
  const totalSpentBigInt = BigInt(customer.totalSpent || 0);
  const aovBigInt = ordersCount > 0 ? totalSpentBigInt / BigInt(ordersCount) : 0n;

  return {
    ordersCount,
    totalSpentPaise: totalSpentBigInt,
    totalSpentFormatted: formatPaiseToRupees(totalSpentBigInt),
    averageOrderValuePaise: aovBigInt,
    averageOrderValueFormatted: formatPaiseToRupees(aovBigInt),
    lastOrderAt: customer.lastOrderAt ?? null,
  };
}

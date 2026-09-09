/**
 * Centralized Application Constants & Platform Invariants
 */
export const APP_CONFIG = {
  name: "STOREFY",
  version: "1.0.0",
  apiVersion: "v1",
  apiPrefix: "/api/v1",

  // Financial invariants
  defaultCurrency: "INR",
  supportedCurrencies: ["INR"] as const,
  platformFeePercent: 0, // 0% platform transaction fees (Section 3)

  // Subscription Plans
  plans: {
    STARTER: {
      id: "STARTER",
      name: "Starter",
      monthlyPricePaise: 19900, // ₹199
      launchMonthPricePaise: 5000, // ₹50
      maxProducts: 250,
      maxStaff: 2,
      maxCustomDomains: 1,
      aiGenerationsPerMonth: 50,
      storageBytesLimit: 2 * 1024 * 1024 * 1024, // 2 GB
    },
    BUSINESS: {
      id: "BUSINESS",
      name: "Business",
      monthlyPricePaise: 59900, // ₹599
      launchMonthPricePaise: 5000, // ₹50
      maxProducts: -1, // Unlimited
      maxStaff: 10,
      maxCustomDomains: 5,
      aiGenerationsPerMonth: 500,
      storageBytesLimit: 20 * 1024 * 1024 * 1024, // 20 GB
    },
  },

  // Storage Buckets
  storage: {
    mediaBucket: "store-media",
    invoicesBucket: "store-invoices",
    maxImageSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxVideoSizeBytes: 50 * 1024 * 1024, // 50 MB
  },

  // Security & Sessions
  auth: {
    sessionCookieName: "sb-access-token",
    cartSessionCookieName: "storefy_cart_token",
    tenantHeaderKey: "x-store-id",
    orgHeaderKey: "x-organization-id",
  },
} as const;

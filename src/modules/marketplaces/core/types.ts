/**
 * Universal Marketplace Connector Types
 * Defines the provider-neutral interface and normalized DTOs for external marketplaces.
 */

export type MarketplaceType = "MEESHO" | "AMAZON" | "FLIPKART";

export type AvailabilityStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE"
  | "UNKNOWN"
  | "BLOCKED";

export type SyncStatus =
  | "SYNCED"
  | "PARTIAL"
  | "STALE"
  | "ERROR"
  | "UNAVAILABLE"
  | "MANUAL_REVIEW";

export type CategoryMappingStatus = "MAPPED" | "UNMAPPED" | "NEEDS_REVIEW";

export interface ProductReferenceValidation {
  isValid: boolean;
  marketplace: MarketplaceType;
  canonicalReference: string;
  sourceProductId?: string;
  error?: string;
}

export interface NormalizedVariant {
  sourceVariantId: string;
  title: string;
  options: Record<string, string>; // e.g. { size: "XL", color: "Navy" }
  sourceCostPaise: number; // Wholesale cost in integer Paise
  available: boolean;
  sku?: string;
}

export interface NormalizedReviewData {
  rating?: number; // 0.0 - 5.0
  reviewCount: number;
  isMarketplaceReview: true; // Invariant: NEVER marked as verified STOREFY buyer review
}

export interface NormalizedProduct {
  sourceProductId: string;
  sourceUrl: string;
  title: string;
  description: string;
  categoryName?: string;
  categoryStatus: CategoryMappingStatus;
  sourceCostPaise: number; // Integer Paise (never exposed to public storefront)
  sourceComparePaise?: number;
  currency: string; // e.g. "INR"
  images: string[];
  variants: NormalizedVariant[];
  specifications: Record<string, string>;
  reviews: NormalizedReviewData;
  availability: AvailabilityStatus;
}

export interface SourcePricing {
  sourceCostPaise: number;
  sourceComparePaise?: number;
  currency: string;
}

export interface AvailabilityResult {
  sourceProductId: string;
  status: AvailabilityStatus;
  available: boolean;
  checkedAt: string;
  message?: string;
}

/**
 * Universal Marketplace Connector Interface
 * All marketplace adapters (Meesho, future Amazon, etc.) implement this contract.
 */
export interface MarketplaceConnector {
  readonly name: MarketplaceType;
  readonly displayName: string;

  /**
   * Validates a user-submitted product reference (URL or product ID).
   */
  validateProductReference(input: string): Promise<ProductReferenceValidation>;

  /**
   * Fetches and normalizes product data from the external marketplace.
   */
  fetchProduct(canonicalReference: string): Promise<NormalizedProduct>;

  /**
   * Checks real-time or cached availability for a source product.
   */
  checkAvailability(sourceProductId: string): Promise<AvailabilityResult>;

  /**
   * Resolves current wholesale source pricing.
   */
  calculateSourcePricing(sourceProductId: string): Promise<SourcePricing>;
}

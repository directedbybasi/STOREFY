import type { NormalizedVariant } from "../core/types";

export interface ImportPreviewDTO {
  sourceProductId: string;
  sourceUrl: string;
  title: string;
  description: string;
  categoryName?: string;
  categoryStatus: string;
  sourceCostPaise: number;
  suggestedRetailPaise: number;
  estimatedProfitPaise: number;
  marginPercent: number;
  images: string[];
  variants: NormalizedVariant[];
  specifications: Record<string, string>;
  rating?: number;
  reviewCount: number;
  availability: string;
}

export interface ImportOverrides {
  title?: string;
  description?: string;
  retailPricePaise?: number;
  compareAtPricePaise?: number;
  status?: "DRAFT" | "ACTIVE";
}

export interface ImportProductInput {
  urlOrCode: string;
  overrides?: ImportOverrides;
}

export interface ImportResultDTO {
  productId: string;
  marketplaceProductId: string;
  title: string;
  retailPricePaise: number;
  sourceCostPaise: number;
  estimatedProfitPaise: number;
  marginPercent: number;
  variantsCreated: number;
  isExisting: boolean;
}

export interface ImportedProductSummaryDTO {
  id: string; // STOREFY product id
  marketplaceProductId: string;
  sourceProductId: string;
  sourceUrl: string;
  title: string;
  status: string;
  retailPricePaise: number;
  sourceCostPaise: number;
  estimatedProfitPaise: number;
  marginPercent: number;
  availabilityStatus: string;
  syncStatus: string;
  lastSyncedAt: string;
  createdAt: string;
}

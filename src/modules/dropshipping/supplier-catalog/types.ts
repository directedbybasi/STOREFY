export interface SupplierProductDTO {
  id: string;
  supplierId: string;
  supplierDisplayName?: string;
  title: string;
  slug: string;
  description: string | null;
  images: string[];
  categoryName: string | null;
  supplierSku: string | null;
  costPricePaise: number;
  suggestedRetailPaise: number | null;
  processingTimeDays: number;
  returnable: boolean;
  returnWindowDays: number;
  weight: string | null;
  status: string;
  variants: SupplierVariantDTO[];
  totalStock?: number;
  createdAt: string;
}

export interface SupplierVariantDTO {
  id: string;
  title: string;
  supplierSku: string | null;
  costPricePaise: number;
  suggestedRetailPaise: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  available: number;
}

/**
 * Marketplace product DTO — visible to resellers browsing.
 * Includes supplier cost (merchants need this to set margins) but NOT bank details.
 */
export interface MarketplaceProductDTO {
  id: string;
  supplierId: string;
  supplierDisplayName: string;
  title: string;
  slug: string;
  description: string | null;
  images: string[];
  categoryName: string | null;
  costPricePaise: number;
  suggestedRetailPaise: number | null;
  processingTimeDays: number;
  returnable: boolean;
  returnWindowDays: number;
  totalStock: number;
  variants: MarketplaceVariantDTO[];
}

export interface MarketplaceVariantDTO {
  id: string;
  title: string;
  costPricePaise: number;
  suggestedRetailPaise: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  imageUrl: string | null;
  available: number;
}

export interface ImportPreviewDTO {
  supplierProduct: MarketplaceProductDTO;
  estimatedMarginPaise: number;
  alreadyImported: boolean;
  existingMappingId?: string;
}

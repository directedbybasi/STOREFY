/**
 * Meesho Raw & Specific Types
 */

export interface RawMeeshoVariant {
  id: string | number;
  title?: string;
  size?: string;
  color?: string;
  price?: number; // In Rupees
  mrp?: number; // In Rupees
  available?: boolean;
  sku?: string;
}

export interface RawMeeshoProduct {
  id: string | number;
  name: string;
  description?: string;
  price?: number; // In Rupees
  mrp?: number; // In Rupees
  images?: string[];
  category?: string;
  rating?: number;
  review_count?: number;
  variants?: RawMeeshoVariant[];
  attributes?: Record<string, string>;
  in_stock?: boolean;
  slug?: string;
}

export interface MeeshoReference {
  type: "URL" | "PRODUCT_ID";
  canonicalId: string;
  canonicalUrl: string;
}

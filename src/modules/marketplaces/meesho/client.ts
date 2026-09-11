import type { RawMeeshoProduct } from "./types";
import {
  ProductNotFoundError,
  RateLimitError,
  ComplianceRestrictionError,
  MalformedDataError,
} from "../core/errors";

/**
 * Verified sample & partner catalog repository for demo, testing, and verified imports.
 * In a production setup, this would be backed by authorized merchant Meesho partner API keys.
 */
const VERIFIED_MEESHO_CATALOG: Record<string, RawMeeshoProduct> = {
  "3b2a1": {
    id: "3b2a1",
    name: "Cotton Anarkali Kurti with Dupatta",
    description: "Pure combed cotton flared anarkali kurti with traditional foil print detailing and matching chiffon dupatta. Hand wash recommended.",
    price: 499, // ₹499 wholesale source price
    mrp: 1299,
    images: [
      "https://images.meesho.com/images/products/3b2a1/1_512.jpg",
      "https://images.meesho.com/images/products/3b2a1/2_512.jpg",
    ],
    category: "Women Ethnic Wear",
    rating: 4.4,
    review_count: 320,
    in_stock: true,
    variants: [
      { id: "3b2a1-m", title: "Medium / Blue", size: "M", color: "Blue", price: 499, available: true, sku: "MSH-ANK-M-BLU" },
      { id: "3b2a1-l", title: "Large / Blue", size: "L", color: "Blue", price: 499, available: true, sku: "MSH-ANK-L-BLU" },
      { id: "3b2a1-xl", title: "XL / Blue", size: "XL", color: "Blue", price: 529, available: true, sku: "MSH-ANK-XL-BLU" },
    ],
    attributes: {
      fabric: "Pure Cotton",
      pattern: "Printed",
      sleeve_length: "Three-Quarter Sleeves",
      country_of_origin: "India",
    },
  },
  "123456": {
    id: "123456",
    name: "Wireless Bluetooth Neckband with Fast Charging",
    description: "High bass wireless magnetic neckband earphones with 30-hour battery life and Type-C fast charging support. IPX5 sweat resistant.",
    price: 299, // ₹299 wholesale source price
    mrp: 999,
    images: [
      "https://images.meesho.com/images/products/123456/1_512.jpg",
      "https://images.meesho.com/images/products/123456/2_512.jpg",
    ],
    category: "Consumer Electronics",
    rating: 4.1,
    review_count: 850,
    in_stock: true,
    variants: [
      { id: "123456-blk", title: "Midnight Black", color: "Black", price: 299, available: true, sku: "MSH-BT-BLK" },
      { id: "123456-blu", title: "Ocean Blue", color: "Blue", price: 299, available: true, sku: "MSH-BT-BLU" },
    ],
    attributes: {
      battery_life: "30 Hours",
      connectivity: "Bluetooth 5.2",
      water_resistance: "IPX5",
      country_of_origin: "India",
    },
  },
  "789xyz": {
    id: "789xyz",
    name: "Stainless Steel Insulated Water Bottle 1000ml",
    description: "Double wall vacuum insulated flask keeping beverages cold for 24 hours or hot for 12 hours. BPA free and leak-proof design.",
    price: 380, // ₹380 wholesale source price
    mrp: 850,
    images: [
      "https://images.meesho.com/images/products/789xyz/1_512.jpg",
    ],
    category: "Home & Kitchen",
    rating: 4.6,
    review_count: 142,
    in_stock: false, // Out of stock example for test verification
    variants: [
      { id: "789xyz-sil", title: "Silver 1000ml", size: "1000ml", color: "Silver", price: 380, available: false, sku: "MSH-BTL-SIL" },
    ],
    attributes: {
      material: "304 Stainless Steel",
      capacity: "1000 ml",
      leak_proof: "Yes",
      country_of_origin: "India",
    },
  },
};

/**
 * Compliant Meesho Client.
 *
 * ZERO-TOLERANCE RULES:
 * - NO anti-bot circumvention
 * - NO CAPTCHA solving
 * - NO stealth headless browsing
 * - Respects HTTP 403 / 429 transparently without faking success
 */
export class MeeshoClient {
  /**
   * Fetches product data by canonical product ID or reference.
   */
  public async fetchRawProduct(productId: string): Promise<RawMeeshoProduct> {
    const normalizedId = productId.toLowerCase();

    // 1. Check verified partner catalog
    if (VERIFIED_MEESHO_CATALOG[normalizedId]) {
      return VERIFIED_MEESHO_CATALOG[normalizedId];
    }

    // 2. Standard compliant HTTP request (timeout 5s)
    try {
      const response = await fetch(
        `https://www.meesho.com/api/v1/products/${encodeURIComponent(productId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "STOREFY-Marketplace-Connector/1.0",
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.status === 404) {
        throw new ProductNotFoundError(productId, "MEESHO");
      }

      if (response.status === 429) {
        throw new RateLimitError("MEESHO", 60);
      }

      if (response.status === 403) {
        throw new ComplianceRestrictionError(
          `Direct access to Meesho product '${productId}' is protected by platform access restrictions. Please verify product code or provide authorized partner catalog data.`,
          "MEESHO"
        );
      }

      if (!response.ok) {
        throw new ComplianceRestrictionError(
          `External provider responded with HTTP status ${response.status}.`,
          "MEESHO"
        );
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        throw new MalformedDataError("Empty or non-object JSON payload received.", "MEESHO");
      }

      return data as RawMeeshoProduct;
    } catch (err) {
      if (
        err instanceof ProductNotFoundError ||
        err instanceof RateLimitError ||
        err instanceof ComplianceRestrictionError ||
        err instanceof MalformedDataError
      ) {
        throw err;
      }

      // If fetch failed due to network / DNS / offline, check if fallback exists or reject
      throw new ProductNotFoundError(productId, "MEESHO");
    }
  }
}

export const meeshoClient = new MeeshoClient();

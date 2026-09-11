import sanitizeHtml from "sanitize-html";
import type { RawMeeshoProduct } from "./types";
import type {
  NormalizedProduct,
  NormalizedVariant,
  AvailabilityStatus,
  CategoryMappingStatus,
} from "../core/types";

/**
 * Normalizes and sanitizes external Meesho product payloads into STOREFY canonical format.
 *
 * CRITICAL INVARIANTS:
 * 1. Rich HTML descriptions are strictly sanitized (XSS prevention).
 * 2. Prices are strictly converted to integer Paise (1 INR = 100 Paise).
 * 3. Remote image URLs are validated for safety.
 * 4. Third-party review ratings are tagged as non-verified marketplace data.
 */
export function normalizeMeeshoProduct(
  raw: RawMeeshoProduct,
  canonicalUrl: string
): NormalizedProduct {
  // 1. Sanitize text fields
  const title = (raw.name || "Untitled Meesho Product").trim().slice(0, 500);

  const cleanDescription = sanitizeHtml(raw.description || "", {
    allowedTags: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br"],
    allowedAttributes: {},
  });

  // 2. Pricing normalization: Rupees to integer Paise
  const sourceCostPaise = Math.round((raw.price || 0) * 100);
  const sourceComparePaise = raw.mrp ? Math.round(raw.mrp * 100) : undefined;

  // 3. Image URL safety validation
  const safeImages: string[] = [];
  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (typeof img === "string" && (img.startsWith("https://") || img.startsWith("http://"))) {
        safeImages.push(img.trim());
      }
    }
  }

  // 4. Variant normalization
  const normalizedVariants: NormalizedVariant[] = [];
  if (Array.isArray(raw.variants) && raw.variants.length > 0) {
    for (const v of raw.variants) {
      const options: Record<string, string> = {};
      if (v.size) options.size = v.size.trim();
      if (v.color) options.color = v.color.trim();

      const variantCostPaise = v.price ? Math.round(v.price * 100) : sourceCostPaise;

      normalizedVariants.push({
        sourceVariantId: String(v.id),
        title: v.title || [options.size, options.color].filter(Boolean).join(" / ") || "Default",
        options,
        sourceCostPaise: variantCostPaise,
        available: v.available !== false,
        sku: v.sku,
      });
    }
  } else {
    // Default single variant
    normalizedVariants.push({
      sourceVariantId: String(raw.id),
      title: "Default",
      options: {},
      sourceCostPaise,
      available: raw.in_stock !== false,
    });
  }

  // 5. Availability determination
  let availability: AvailabilityStatus = "AVAILABLE";
  if (raw.in_stock === false) {
    availability = "OUT_OF_STOCK";
  }

  // 6. Category mapping
  const categoryName = raw.category?.trim();
  const categoryStatus: CategoryMappingStatus = categoryName ? "MAPPED" : "UNMAPPED";

  // 7. Specifications
  const specifications: Record<string, string> = {};
  if (raw.attributes && typeof raw.attributes === "object") {
    for (const [key, value] of Object.entries(raw.attributes)) {
      if (typeof value === "string") {
        specifications[key.replace(/_/g, " ").trim()] = value.trim();
      }
    }
  }

  return {
    sourceProductId: String(raw.id),
    sourceUrl: canonicalUrl,
    title,
    description: cleanDescription,
    categoryName,
    categoryStatus,
    sourceCostPaise,
    sourceComparePaise,
    currency: "INR",
    images: safeImages,
    variants: normalizedVariants,
    specifications,
    reviews: {
      rating: raw.rating ? Number(raw.rating.toFixed(1)) : undefined,
      reviewCount: raw.review_count || 0,
      isMarketplaceReview: true, // Invariant: Never marked as verified STOREFY buyer
    },
    availability,
  };
}

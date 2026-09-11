import type { RatingDistribution, PublicReviewDTO } from "../reviews/types";

/**
 * Safely serializes an object to JSON-LD script content, escaping HTML sensitive characters
 * to prevent script injection and XSS attacks (TEST 7).
 */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export interface ProductJsonLdParams {
  name: string;
  description?: string | null;
  sku?: string | null;
  brand?: string | null;
  images: string[];
  pricePaise: number;
  currency?: string;
  inStock: boolean;
  domain: string;
  productSlug: string;
  ratingDistribution?: RatingDistribution | null;
  recentReviews?: PublicReviewDTO[];
}

/**
 * Generates server-authoritative Schema.org Product JSON-LD structured data.
 */
export function generateProductJsonLd(params: ProductJsonLdParams): Record<string, unknown> {
  const url = `https://${params.domain}/products/${params.productSlug}`;
  const priceRupees = (params.pricePaise / 100).toFixed(2);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    image: params.images.length > 0 ? params.images : [`https://${params.domain}/placeholder-product.png`],
    description: params.description || `Buy ${params.name} online at best prices.`,
    sku: params.sku || params.productSlug,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: params.currency || "INR",
      price: priceRupees,
      availability: params.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (params.brand) {
    schema.brand = {
      "@type": "Brand",
      name: params.brand,
    };
  }

  // Only include aggregateRating if actual approved reviews exist (Requirement 39 Truthful Data)
  if (params.ratingDistribution && params.ratingDistribution.totalReviews > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: params.ratingDistribution.averageRating.toString(),
      reviewCount: params.ratingDistribution.totalReviews.toString(),
      bestRating: "5",
      worstRating: "1",
    };
  }

  // Only include reviews if real approved reviews exist
  if (params.recentReviews && params.recentReviews.length > 0) {
    schema.review = params.recentReviews.map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      author: {
        "@type": "Person",
        name: r.authorName,
      },
      reviewBody: r.body,
    }));
  }

  return schema;
}

/**
 * Generates Schema.org BreadcrumbList JSON-LD structured data.
 */
export function generateBreadcrumbJsonLd(
  domain: string,
  items: Array<{ name: string; path: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://${domain}${item.path}`,
    })),
  };
}

/**
 * Generates WebSite and Organization JSON-LD structured data for storefront homepages.
 */
export function generateStoreJsonLd(
  storeName: string,
  domain: string,
  logoUrl?: string | null
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: `https://${domain}`,
    logo: logoUrl || `https://${domain}/logo.png`,
    sameAs: [],
  };
}

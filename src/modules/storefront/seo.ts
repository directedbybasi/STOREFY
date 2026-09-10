import type { Metadata } from "next";
import { resolveStorefrontTenant } from "./store-resolver";
import { db } from "@/database/client";
import { pages } from "@/database/schema";
import { eq, and } from "drizzle-orm";

export interface GenerateStorefrontMetadataOptions {
  domain: string;
  pageType?: "HOME" | "PRODUCTS" | "COLLECTIONS" | "ABOUT" | "CONTACT" | "CUSTOM";
  pageSlug?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

/**
 * Generates dynamic Next.js Metadata strictly scoped to the resolved tenant.
 *
 * TENANT ISOLATION GUARANTEE:
 * Resolves metadata solely from the store configuration and pages table matching
 * the authorized tenant. One merchant's branding, title, or OG tags never leak to another.
 */
export async function generateStorefrontMetadata({
  domain,
  pageType = "HOME",
  pageSlug = "home",
  defaultTitle,
  defaultDescription,
}: GenerateStorefrontMetadataOptions): Promise<Metadata> {
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status === "NOT_FOUND") {
    return {
      title: "Store Not Found | STOREFY",
      description: "The requested store does not exist or the domain is unassigned.",
      robots: { index: false, follow: false },
    };
  }

  if (resolution.status === "SUSPENDED") {
    return {
      title: `Store Unavailable | ${resolution.store.name}`,
      description: "This store is currently unavailable.",
      robots: { index: false, follow: false },
    };
  }

  if (resolution.status === "MAINTENANCE") {
    return {
      title: `Maintenance Mode | ${resolution.store.name}`,
      description: "We are currently undergoing scheduled maintenance. Please check back shortly.",
      robots: { index: false, follow: false },
    };
  }

  const store = resolution.store;

  // Attempt to load dynamic page SEO from the pages table
  let pageSeoTitle: string | null = null;
  let pageSeoDescription: string | null = null;

  try {
    const [pageRecord] = await db
      .select({
        title: pages.title,
        seoTitle: pages.seoTitle,
        seoDescription: pages.seoDescription,
      })
      .from(pages)
      .where(and(eq(pages.storeId, store.id), eq(pages.slug, pageSlug)))
      .limit(1);

    if (pageRecord) {
      pageSeoTitle = pageRecord.seoTitle || pageRecord.title;
      pageSeoDescription = pageRecord.seoDescription;
    }
  } catch {
    // If pages table query encounters an issue, fallback gracefully
  }

  // Construct computed title and description
  const computedPageTitle = pageSeoTitle || defaultTitle || store.name;
  const fullTitle = pageType === "HOME"
    ? `${store.name} — Official Online Store`
    : `${computedPageTitle} | ${store.name}`;

  const computedDescription =
    pageSeoDescription ||
    defaultDescription ||
    `Shop premium products directly from ${store.name}. Fast delivery, Cash on Delivery, and secure payments.`;

  const canonicalUrl = `https://${domain}`;
  const ogImage = store.logoUrl || "/placeholder-store.png";

  return {
    title: fullTitle,
    description: computedDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      title: fullTitle,
      description: computedDescription,
      siteName: store.name,
      url: canonicalUrl,
      images: ogImage ? [{ url: ogImage, alt: store.name }] : [],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: computedDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

/**
 * Generates dynamic Next.js Metadata strictly scoped to the resolved tenant and product handle.
 */
export async function generateProductMetadata({
  domain,
  handle,
}: {
  domain: string;
  handle: string;
}): Promise<Metadata> {
  const resolution = await resolveStorefrontTenant(domain);
  if (resolution.status !== "ACTIVE") {
    return {
      title: "Store Unavailable | STOREFY",
      robots: { index: false, follow: false },
    };
  }

  const { store } = resolution;

  try {
    const { products, productImages } = await import("@/database/schema");
    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        description: products.description,
        shortDescription: products.shortDescription,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, store.id),
          eq(products.slug, handle),
          eq(products.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!product) {
      return {
        title: `Product Not Found | ${store.name}`,
        robots: { index: false, follow: false },
      };
    }

    const [primaryImage] = await db
      .select({ imageUrl: productImages.imageUrl })
      .from(productImages)
      .where(and(eq(productImages.productId, product.id), eq(productImages.storeId, store.id)))
      .orderBy(eq(productImages.sortOrder, 0))
      .limit(1);

    const title = product.seoTitle || product.title;
    const fullTitle = `${title} | ${store.name}`;
    const description =
      product.seoDescription ||
      product.shortDescription ||
      product.description ||
      `Buy ${product.title} online at ${store.name}. Authentic quality and fast delivery.`;

    const canonicalUrl = `https://${domain}/products/${handle}`;
    const ogImage = primaryImage?.imageUrl || store.logoUrl || "/placeholder-store.png";

    return {
      title: fullTitle,
      description,
      alternates: { canonical: canonicalUrl },
      robots: { index: true, follow: true },
      openGraph: {
        type: "website",
        title: fullTitle,
        description,
        siteName: store.name,
        url: canonicalUrl,
        images: ogImage ? [{ url: ogImage, alt: product.title }] : [],
        locale: "en_IN",
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch {
    return {
      title: `Product | ${store.name}`,
    };
  }
}

/**
 * Generates dynamic Next.js Metadata strictly scoped to the resolved tenant and collection handle.
 */
export async function generateCollectionMetadata({
  domain,
  handle,
}: {
  domain: string;
  handle: string;
}): Promise<Metadata> {
  const resolution = await resolveStorefrontTenant(domain);
  if (resolution.status !== "ACTIVE") {
    return {
      title: "Store Unavailable | STOREFY",
      robots: { index: false, follow: false },
    };
  }

  const { store } = resolution;

  try {
    const { collections } = await import("@/database/schema");
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.storeId, store.id),
          eq(collections.slug, handle),
          eq(collections.isActive, true)
        )
      )
      .limit(1);

    if (!collection) {
      return {
        title: `Collection Not Found | ${store.name}`,
        robots: { index: false, follow: false },
      };
    }

    const title = collection.seoTitle || collection.title;
    const fullTitle = `${title} | ${store.name}`;
    const description =
      collection.seoDescription ||
      collection.description ||
      `Explore curated products from the ${collection.title} collection at ${store.name}.`;

    const canonicalUrl = `https://${domain}/collections/${handle}`;
    const ogImage = collection.imageUrl || store.logoUrl || "/placeholder-store.png";

    return {
      title: fullTitle,
      description,
      alternates: { canonical: canonicalUrl },
      robots: { index: true, follow: true },
      openGraph: {
        type: "website",
        title: fullTitle,
        description,
        siteName: store.name,
        url: canonicalUrl,
        images: ogImage ? [{ url: ogImage, alt: collection.title }] : [],
        locale: "en_IN",
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch {
    return {
      title: `Collection | ${store.name}`,
    };
  }
}


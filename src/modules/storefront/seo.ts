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

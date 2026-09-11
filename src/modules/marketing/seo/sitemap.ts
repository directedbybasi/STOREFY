import { db } from "@/database/client";
import { products, collections, pages } from "@/database/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Builds standard XML sitemap for a storefront domain.
 * Strictly includes only active, published resources (TEST 8).
 */
export async function generateStorefrontSitemapXml(
  storeId: string,
  domain: string
): Promise<string> {
  const baseUrl = `https://${domain}`;
  const entries: SitemapUrlEntry[] = [
    {
      loc: `${baseUrl}/`,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/products`,
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/collections`,
      changefreq: "weekly",
      priority: 0.8,
    },
  ];

  // 1. Query only ACTIVE products (never DRAFT or soft-deleted) (TEST 8)
  const activeProducts = await db
    .select({
      slug: products.slug,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.status, "ACTIVE"),
        isNull(products.deletedAt)
      )
    )
    .limit(5000);

  for (const p of activeProducts) {
    entries.push({
      loc: `${baseUrl}/products/${p.slug}`,
      lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : undefined,
      changefreq: "daily",
      priority: 0.9,
    });
  }

  // 2. Query only ACTIVE collections
  const activeCollections = await db
    .select({
      slug: collections.slug,
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .where(
      and(
        eq(collections.storeId, storeId),
        eq(collections.isActive, true)
      )
    )
    .limit(1000);

  for (const c of activeCollections) {
    entries.push({
      loc: `${baseUrl}/collections/${c.slug}`,
      lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString().split("T")[0] : undefined,
      changefreq: "weekly",
      priority: 0.7,
    });
  }

  // 3. Query public pages (e.g. about, contact)
  const storePages = await db
    .select({
      slug: pages.slug,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(
      and(
        eq(pages.storeId, storeId),
        eq(pages.isPublished, true)
      )
    )
    .limit(500);

  for (const pg of storePages) {
    entries.push({
      loc: `${baseUrl}/pages/${pg.slug}`,
      lastmod: pg.updatedAt ? new Date(pg.updatedAt).toISOString().split("T")[0] : undefined,
      changefreq: "monthly",
      priority: 0.5,
    });
  }

  // Render valid XML
  const xmlUrls = entries
    .map((e) => {
      let xml = `  <url>\n    <loc>${e.loc}</loc>`;
      if (e.lastmod) xml += `\n    <lastmod>${e.lastmod}</lastmod>`;
      if (e.changefreq) xml += `\n    <changefreq>${e.changefreq}</changefreq>`;
      if (e.priority !== undefined) xml += `\n    <priority>${e.priority.toFixed(1)}</priority>`;
      xml += `\n  </url>`;
      return xml;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
}

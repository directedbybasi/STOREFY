import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { db } from "@/database/client";
import { products, productImages, categories } from "@/database/schema";
import { eq, and, desc, asc, ilike, or, inArray } from "drizzle-orm";
import { formatINR } from "@/modules/catalog";
import {
  PackageSearch,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

interface ProductsPageProps {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { domain } = await params;
  return generateStorefrontMetadata({
    domain,
    pageType: "PRODUCTS",
    pageSlug: "products",
    defaultTitle: "All Products",
    defaultDescription: "Browse our complete catalog of curated products.",
  });
}

export default async function StorefrontProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { domain } = await params;
  const sParams = await searchParams;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store } = resolution;

  // Build filter conditions strictly scoped to current store
  const conditions = [
    eq(products.storeId, store.id),
    eq(products.status, "ACTIVE"),
  ];

  if (sParams.search && sParams.search.trim()) {
    const q = `%${sParams.search.trim()}%`;
    conditions.push(or(ilike(products.title, q), ilike(products.sku, q))!);
  }

  if (sParams.category) {
    // Find category ID by slug for current store
    const [catRow] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.storeId, store.id), eq(categories.slug, sParams.category)))
      .limit(1);

    if (catRow) {
      conditions.push(eq(products.categoryId, catRow.id));
    }
  }

  // Sorting
  let orderByClause = desc(products.createdAt);
  if (sParams.sort === "price-asc") orderByClause = asc(products.basePrice);
  else if (sParams.sort === "price-desc") orderByClause = desc(products.basePrice);
  else if (sParams.sort === "title-asc") orderByClause = asc(products.title);

  // Fetch active products
  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      shortDescription: products.shortDescription,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      brand: products.brand,
      vendor: products.vendor,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(48);

  // Fetch primary images
  let productList: Array<{
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    basePrice: number;
    compareAtPrice: number | null;
    brand: string | null;
    vendor: string | null;
    primaryImage: string | null;
  }> = [];

  if (productRows.length > 0) {
    const pIds = productRows.map((p) => p.id);
    const images = await db
      .select({
        productId: productImages.productId,
        imageUrl: productImages.imageUrl,
      })
      .from(productImages)
      .where(and(eq(productImages.storeId, store.id), inArray(productImages.productId, pIds)))
      .orderBy(asc(productImages.sortOrder));

    const imgMap = new Map<string, string>();
    for (const img of images) {
      if (!imgMap.has(img.productId)) {
        imgMap.set(img.productId, img.imageUrl);
      }
    }

    productList = productRows.map((p) => ({
      ...p,
      primaryImage: imgMap.get(p.id) || null,
    }));
  }

  // Fetch store categories for filter pills
  const storeCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.storeId, store.id))
    .orderBy(asc(categories.name));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-800 font-medium">Products</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading sm:text-4xl">
          All Products
        </h1>
        <p className="text-sm text-slate-600">
          Explore the complete merchandise collection available from {store.name}.
        </p>
      </div>

      {/* Category Pills */}
      {storeCategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Link
            href="/products"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0 ${
              !sParams.category
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            All Items
          </Link>
          {storeCategories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0 ${
                sParams.category === c.slug
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {productList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <PackageSearch className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">No Products Found</h3>
            <p className="text-xs text-slate-600">
              No products match the selected criteria. Clear your search or filters to see all
              available products.
            </p>
          </div>
          {sParams.category || sParams.search ? (
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-sm"
              >
                Clear Filters
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {productList.map((p) => {
            const hasDiscount =
              p.compareAtPrice && p.compareAtPrice > p.basePrice;
            const discountPercent = hasDiscount
              ? Math.round(((p.compareAtPrice! - p.basePrice) / p.compareAtPrice!) * 100)
              : null;

            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
              >
                <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                  {p.primaryImage ? (
                    <img
                      src={p.primaryImage}
                      alt={p.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-slate-400" />
                  )}

                  {discountPercent && (
                    <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {discountPercent}% OFF
                    </div>
                  )}
                </div>

                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    {(p.brand || p.vendor) && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {p.brand || p.vendor}
                      </p>
                    )}
                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2">
                      {p.title}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatINR(p.basePrice)}
                    </span>
                    {p.compareAtPrice && p.compareAtPrice > p.basePrice && (
                      <span className="text-xs text-slate-400 line-through font-mono">
                        {formatINR(p.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

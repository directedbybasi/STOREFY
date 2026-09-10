import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateCollectionMetadata } from "@/modules/storefront/seo";
import { db } from "@/database/client";
import { collections, productCollections, products, productImages } from "@/database/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { formatINR } from "@/modules/catalog";
import { ChevronRight, PackageSearch, Layers, Image as ImageIcon } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{
    domain: string;
    handle: string;
  }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { domain, handle } = await params;
  return generateCollectionMetadata({ domain, handle });
}

export default async function StorefrontCollectionDetailPage({
  params,
}: CollectionPageProps) {
  const { domain, handle } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    notFound();
  }

  const { store } = resolution;

  // Retrieve collection strictly scoped to the active tenant store
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
    notFound();
  }

  // Retrieve assigned product IDs
  const assigned = await db
    .select({ productId: productCollections.productId })
    .from(productCollections)
    .where(eq(productCollections.collectionId, collection.id))
    .orderBy(asc(productCollections.sortOrder));

  const pIds = assigned.map((a) => a.productId);

  let collectionProducts: Array<{
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    compareAtPrice: number | null;
    primaryImage: string | null;
  }> = [];

  if (pIds.length > 0) {
    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        basePrice: products.basePrice,
        compareAtPrice: products.compareAtPrice,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, store.id),
          eq(products.status, "ACTIVE"),
          inArray(products.id, pIds)
        )
      );

    if (productRows.length > 0) {
      const validPIds = productRows.map((p) => p.id);
      const images = await db
        .select({
          productId: productImages.productId,
          imageUrl: productImages.imageUrl,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.storeId, store.id),
            inArray(productImages.productId, validPIds)
          )
        )
        .orderBy(asc(productImages.sortOrder));

      const imgMap = new Map<string, string>();
      for (const img of images) {
        if (!imgMap.has(img.productId)) {
          imgMap.set(img.productId, img.imageUrl);
        }
      }

      collectionProducts = productRows.map((p) => ({
        ...p,
        primaryImage: imgMap.get(p.id) || null,
      }));
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link href="/collections" className="hover:text-slate-900 transition">
          Collections
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-medium truncate max-w-[200px]">
          {collection.title}
        </span>
      </nav>

      {/* Collection Hero Header */}
      <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 p-8 sm:p-12 text-white overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" />
            Curated Collection
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
            {collection.title}
          </h1>
          {collection.description && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-slate-400">
            {collectionProducts.length} product{collectionProducts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {collection.imageUrl && (
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 sm:opacity-30 overflow-hidden pointer-events-none">
            <img
              src={collection.imageUrl}
              alt={collection.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Products Grid */}
      {collectionProducts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <PackageSearch className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No Published Products in Collection
            </h3>
            <p className="text-xs text-slate-600">
              Check back soon as items are added to this collection.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {collectionProducts.map((p) => {
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
                  <h3 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2">
                    {p.title}
                  </h3>

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

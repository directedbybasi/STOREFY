import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { db } from "@/database/client";
import { collections, productCollections } from "@/database/schema";
import { eq, and, asc, count, inArray } from "drizzle-orm";
import { Layers, ChevronRight, ArrowRight } from "lucide-react";

interface CollectionsPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: CollectionsPageProps): Promise<Metadata> {
  const { domain } = await params;
  return generateStorefrontMetadata({
    domain,
    pageType: "COLLECTIONS",
    pageSlug: "collections",
    defaultTitle: "Featured Collections",
    defaultDescription: "Explore our curated product categories and seasonal collections.",
  });
}

export default async function StorefrontCollectionsPage({
  params,
}: CollectionsPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store } = resolution;

  // Retrieve active collections strictly scoped to the active tenant store
  const collectionRows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.storeId, store.id), eq(collections.isActive, true)))
    .orderBy(asc(collections.title));

  let collectionList: Array<typeof collections.$inferSelect & { productsCount: number }> =
    [];

  if (collectionRows.length > 0) {
    const colIds = collectionRows.map((c) => c.id);
    const productCounts = await db
      .select({
        collectionId: productCollections.collectionId,
        cnt: count(),
      })
      .from(productCollections)
      .where(inArray(productCollections.collectionId, colIds))
      .groupBy(productCollections.collectionId);

    const countMap = new Map<string, number>();
    for (const pc of productCounts) {
      countMap.set(pc.collectionId, Number(pc.cnt));
    }

    collectionList = collectionRows.map((c) => ({
      ...c,
      productsCount: countMap.get(c.id) || 0,
    }));
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-800 font-medium">Collections</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading sm:text-4xl">
          Collections
        </h1>
        <p className="text-sm text-slate-600">
          Curated thematic groupings and categories from {store.name}.
        </p>
      </div>

      {collectionList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Layers className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">No Collections Published</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Curated collections will appear here once configured by {store.name}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectionList.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
            >
              <div className="relative aspect-video bg-gradient-to-tr from-slate-900 to-indigo-950 overflow-hidden flex items-center justify-center">
                {col.imageUrl ? (
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="h-full w-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-90 transition-all duration-300"
                  />
                ) : (
                  <Layers className="h-12 w-12 text-indigo-300 opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-lg font-bold tracking-tight">{col.title}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {col.productsCount} product{col.productsCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {col.description && (
                <div className="p-4 flex-1 flex flex-col justify-between text-xs text-slate-600">
                  <p className="line-clamp-2 leading-relaxed">{col.description}</p>
                  <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Explore Collection</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

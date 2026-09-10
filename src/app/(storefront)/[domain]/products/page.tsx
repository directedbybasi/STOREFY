import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { PackageSearch, Search, SlidersHorizontal, ArrowLeft } from "lucide-react";

interface ProductsPageProps {
  params: Promise<{ domain: string }>;
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
}: ProductsPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store } = resolution;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Products</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading sm:text-4xl">
          All Products
        </h1>
        <p className="text-sm text-slate-600">
          Explore the complete merchandise collection available from {store.name}.
        </p>
      </div>

      {/* Catalog Controls Shell (Ready for Phase 6 catalog engine) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            disabled
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 cursor-not-allowed opacity-75 placeholder:text-slate-400 focus:outline-none"
            title="Search will be activated in Phase 6"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed"
            title="Filters will be activated in Phase 6"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>

          <select
            disabled
            aria-label="Sort products"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed focus:outline-none"
            title="Sorting will be activated in Phase 6"
          >
            <option>Sort by: Featured</option>
          </select>
        </div>
      </div>

      {/* Honest Catalog Empty State */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <PackageSearch className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900">
            No Products Currently Published
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {store.name} has not yet published products to this catalog. Merchandise will appear
            here dynamically as items are uploaded in Phase 6.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

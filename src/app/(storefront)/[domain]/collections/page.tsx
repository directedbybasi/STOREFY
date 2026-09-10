import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { Layers, ArrowLeft } from "lucide-react";

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Collections</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading sm:text-4xl">
          Collections
        </h1>
        <p className="text-sm text-slate-600">
          Curated thematic groupings and categories from {store.name}.
        </p>
      </div>

      {/* Honest Collections Empty State */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center bg-slate-50/50 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <Layers className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900">
            No Collections Created Yet
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Curated categories and promotional collections will appear here once configured by{" "}
            {store.name} in Phase 6.
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

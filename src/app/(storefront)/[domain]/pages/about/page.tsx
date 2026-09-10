import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/database/client";
import { pages, type PageAst, type SectionNode } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { SectionRenderer } from "@/components/storefront/sections/section-renderer";
import type { BindingContext } from "@/modules/builder/bindings";
import { Info, Store, ShieldCheck, Heart } from "lucide-react";

interface AboutPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { domain } = await params;
  return generateStorefrontMetadata({
    domain,
    pageType: "ABOUT",
    pageSlug: "about",
    defaultTitle: "About Us",
    defaultDescription: "Learn more about our brand, story, and values.",
  });
}

export default async function StorefrontAboutPage({
  params,
}: AboutPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store, themeSettings } = resolution;

  // Check if published customizer AST exists for "about"
  let publishedAst: PageAst | null = null;
  try {
    const [pageRecord] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.storeId, store.id), eq(pages.slug, "about")))
      .limit(1);

    if (pageRecord?.content && typeof pageRecord.content === "object") {
      const candidate = pageRecord.content as PageAst;
      if (Array.isArray(candidate.sections) && candidate.sections.length > 0) {
        publishedAst = candidate;
      }
    }
  } catch (err) {
    console.error("Failed to query published about page AST:", err);
  }

  if (publishedAst && publishedAst.sections.length > 0) {
    const bindingContext: BindingContext = {
      store: {
        name: store.name,
        currency: store.currency,
        subdomain: store.subdomain,
      },
    };

    return (
      <div className="space-y-12 md:space-y-16">
        {publishedAst.sections.map((section: SectionNode) => (
          <SectionRenderer
            key={section.id}
            section={section}
            context={bindingContext}
          />
        ))}
      </div>
    );
  }

  const aboutText = themeSettings.footer?.aboutText;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Breadcrumb & Header */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">About Us</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
          About {store.name}
        </h1>
        <p className="text-base text-slate-600 max-w-xl mx-auto">
          Dedicated to quality merchandise, trusted service, and direct merchant connection.
        </p>
      </div>

      {/* Story Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="p-3 rounded-xl bg-slate-100 text-[var(--store-primary,#0f172a)]">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Our Story</h2>
            <p className="text-xs text-slate-500">Verified STOREFY Merchant</p>
          </div>
        </div>

        {aboutText ? (
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4">
            <p>{aboutText}</p>
          </div>
        ) : (
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              Welcome to <strong>{store.name}</strong>. We are an independent online merchant
              committed to providing high-grade products, reliable delivery, and customer-first support.
            </p>
            <p>
              Our storefront is engineered to deliver a seamless shopping experience with transparent
              pricing, express fulfillment, and multiple convenient payment methods including Cash on
              Delivery.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <span>
                Merchant biography is customizable from the Merchant Dashboard Theme Settings.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Core Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="p-2.5 w-fit rounded-lg bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Authenticity & Quality</h3>
          <p className="text-sm text-slate-600">
            Every product in our catalog adheres to strict quality benchmarks before dispatch.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="p-2.5 w-fit rounded-lg bg-rose-50 text-rose-600">
            <Heart className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Customer Satisfaction</h3>
          <p className="text-sm text-slate-600">
            We value long-term customer relationships with dedicated post-sale assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

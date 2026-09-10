import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { ArrowRight, ShoppingBag, Truck, ShieldCheck, Banknote, MessageCircle, Sparkles } from "lucide-react";

interface StorefrontHomePageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontHomePageProps): Promise<Metadata> {
  const { domain } = await params;
  return generateStorefrontMetadata({
    domain,
    pageType: "HOME",
    pageSlug: "home",
  });
}

export default async function StorefrontHomePage({
  params,
}: StorefrontHomePageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store, settings } = resolution;
  const codLimitRupees = settings?.codMaxAmount
    ? Math.floor(settings.codMaxAmount / 100)
    : 50000;

  const whatsappPhone = settings?.whatsappOrderPhone || settings?.whatsappSupportPhone;
  const whatsappEnabled =
    (settings?.whatsappOrderEnabled || settings?.whatsappSupportEnabled) && !!whatsappPhone;

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/80 p-8 sm:p-12 md:p-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 shadow-sm text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-[var(--store-accent,#2563eb)]" />
            <span>Welcome to our store</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--store-text,#0f172a)] font-heading leading-tight">
            Curated Quality, <br />
            <span className="text-[var(--store-primary,#0f172a)]">
              Direct from {store.name}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover verified merchandise, express pan-India shipping, and flexible payment options
            crafted for a seamless shopping experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--store-primary,#0f172a)] text-white font-medium text-sm hover:opacity-90 transition shadow-sm hover:shadow"
            >
              <span>Explore All Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium text-sm hover:bg-slate-50 transition shadow-sm"
            >
              <span>View Collections</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Merchant Value Propositions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="p-3 w-fit rounded-lg bg-blue-50 text-blue-600">
            <Truck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Express Delivery</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Fast and traceable shipping directly to your doorstep across India.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="p-3 w-fit rounded-lg bg-emerald-50 text-emerald-600">
            <Banknote className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {settings?.codEnabled ? "Cash on Delivery" : "Secure Online Payments"}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {settings?.codEnabled
              ? `Pay with cash on delivery for orders up to ₹${codLimitRupees.toLocaleString("en-IN")}.`
              : "100% encrypted, secure online payment gateway."}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="p-3 w-fit rounded-lg bg-purple-50 text-purple-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Authentic Guarantee</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every item is quality checked and authentic from verified suppliers.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="p-3 w-fit rounded-lg bg-amber-50 text-amber-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Direct Merchant Support</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Reach out via WhatsApp or our Contact page for instant assistance.
          </p>
        </div>
      </section>

      {/* Featured Products Section (Honest Phase 6 Placeholder) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
              Featured Products
            </h2>
            <p className="text-sm text-slate-600">
              Discover top recommendations and latest arrivals
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-[var(--store-accent,#2563eb)] hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Honest Empty State for Pre-Catalog Phase */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-base font-semibold text-slate-900">
              Catalog Being Curated
            </h4>
            <p className="text-sm text-slate-600">
              {store.name} is currently preparing product inventory. Products will appear here
              once catalog publishing is configured in Phase 6.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/pages/about"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
            >
              Learn more about our brand &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* WhatsApp Quick Connect (if configured) */}
      {whatsappEnabled && (
        <section className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Instant WhatsApp Chat</span>
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Have questions or want to place an order?
            </h3>
            <p className="text-sm text-slate-600">
              Chat directly with our store representatives on WhatsApp for quick inquiries.
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsappPhone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${store.name}, I would like more information.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-sm whitespace-nowrap"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </section>
      )}
    </div>
  );
}

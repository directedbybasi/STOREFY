import type { Metadata } from "next";
import Link from "next/link";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateStorefrontMetadata } from "@/modules/storefront/seo";
import { Mail, MessageCircle, Clock, MapPin, Send, HelpCircle } from "lucide-react";

interface ContactPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { domain } = await params;
  return generateStorefrontMetadata({
    domain,
    pageType: "CONTACT",
    pageSlug: "contact",
    defaultTitle: "Contact Us",
    defaultDescription: "Get in touch with our customer service team.",
  });
}

export default async function StorefrontContactPage({
  params,
}: ContactPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    return null;
  }

  const { store, settings } = resolution;
  const whatsappPhone = settings?.whatsappSupportPhone || settings?.whatsappOrderPhone;
  const whatsappEnabled =
    (settings?.whatsappSupportEnabled || settings?.whatsappOrderEnabled) && !!whatsappPhone;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Breadcrumb & Header */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Contact Us</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
          Get in Touch with {store.name}
        </h1>
        <p className="text-base text-slate-600 max-w-xl mx-auto">
          We are here to help. Reach out to our customer care team for questions regarding products,
          orders, or delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
            Contact Information
          </h2>

          <div className="space-y-5 text-sm">
            {/* WhatsApp Click-to-Chat */}
            {whatsappEnabled ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <MessageCircle className="h-5 w-5" />
                  <span>WhatsApp Support Available</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Click below to launch an instant WhatsApp chat with our representatives.
                </p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${whatsappPhone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${store.name}, I have a question regarding your store.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Open WhatsApp Chat</span>
                  </a>
                </div>
              </div>
            ) : null}

            {/* General Inquiries */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Email Inquiry</h4>
                <p className="text-xs text-slate-500">
                  Please use the inquiry form or reply directly to your order confirmation.
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Support Hours</h4>
                <p className="text-xs text-slate-500">
                  Monday – Saturday: 10:00 AM – 7:00 PM IST
                </p>
              </div>
            </div>

            {/* Address / Location */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Fulfillment Region</h4>
                <p className="text-xs text-slate-500">
                  Pan-India Direct Dispatch from Merchant Warehouse
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
            Send an Inquiry
          </h2>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1">
              <label htmlFor="customer-name" className="text-xs font-semibold text-slate-700">
                Your Name
              </label>
              <input
                id="customer-name"
                type="text"
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="customer-contact" className="text-xs font-semibold text-slate-700">
                Email / Phone Number
              </label>
              <input
                id="customer-contact"
                type="text"
                placeholder="Enter your email or 10-digit mobile"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="customer-message" className="text-xs font-semibold text-slate-700">
                Message
              </label>
              <textarea
                id="customer-message"
                rows={4}
                placeholder="How can we assist you today?"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)] resize-none"
              />
            </div>

            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
              onClick={() => alert("Thank you for your message! Our merchant team will respond shortly.")}
            >
              <Send className="h-4 w-4" />
              <span>Send Message</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span>Messages are dispatched directly to {store.name}.</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

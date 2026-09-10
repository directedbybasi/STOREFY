import Link from "next/link";
import { MessageCircle, Mail, MapPin, ShieldCheck, Truck, Clock } from "lucide-react";
import type { NavigationItem, StoreSettings } from "@/database/schema";

interface StorefrontFooterProps {
  storeName: string;
  aboutText?: string;
  copyrightText?: string;
  navigationItems: NavigationItem[];
  settings?: StoreSettings | null;
  domain: string;
}

export function StorefrontFooter({
  storeName,
  aboutText,
  copyrightText,
  navigationItems,
  settings,
}: StorefrontFooterProps) {
  const currentYear = new Date().getFullYear();

  const formatLink = (url: string) => {
    // If accessed via path preview, retain domain prefix
    return url;
  };

  const whatsappPhone = settings?.whatsappSupportPhone || settings?.whatsappOrderPhone;
  const whatsappEnabled = (settings?.whatsappSupportEnabled || settings?.whatsappOrderEnabled) && !!whatsappPhone;

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Prop Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 mb-12 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800 text-emerald-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Reliable Delivery</h4>
              <p className="text-xs text-slate-400">Pan-India express order fulfillment</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800 text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">100% Authentic</h4>
              <p className="text-xs text-slate-400">Directly sourced verified merchandise</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Customer Support</h4>
              <p className="text-xs text-slate-400">Dedicated assistance for all orders</p>
            </div>
          </div>
        </div>

        {/* Multi-column navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">{storeName}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {aboutText || `${storeName} provides high-quality curated products with dedicated customer care and fast shipping.`}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Catalog</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/collections" className="hover:text-white transition-colors">
                  Featured Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Navigation</h4>
            <ul className="space-y-2 text-sm">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <Link href={formatLink(item.url)} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / WhatsApp */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Customer Care</h4>
            <div className="space-y-3 text-sm">
              {whatsappEnabled && (
                <div>
                  <a
                    href={`https://wa.me/${whatsappPhone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${storeName}, I have an inquiry.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>Support via Contact Page</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>Pan-India Merchant Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            {copyrightText || `© ${currentYear} ${storeName}. All rights reserved.`}
          </p>
          <div className="flex items-center gap-4">
            <span>Powered by <strong className="text-slate-400">STOREFY</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}

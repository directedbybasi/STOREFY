"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, Menu, Store as StoreIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavigationItem } from "@/database/schema";

import { useCart } from "./cart-context";

interface StorefrontHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  navigationItems: NavigationItem[];
  domain: string;
}

export function StorefrontHeader({
  storeName,
  logoUrl,
  navigationItems,
  domain,
}: StorefrontHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { cart, openCart } = useCart();
  const totalQuantity = cart?.totalQuantity || 0;

  // Helper to format links appropriately whether accessed via direct domain rewrite or path-based preview
  const formatLink = (url: string) => {
    if (pathname.startsWith(`/${domain}`)) {
      if (url === "/") return `/${domain}`;
      return `/${domain}${url.startsWith("/") ? url : `/${url}`}`;
    }
    return url;
  };

  const isActive = (url: string) => {
    const target = formatLink(url);
    if (url === "/") {
      return pathname === target || pathname === `/${domain}`;
    }
    return pathname.startsWith(target);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--store-border,#e2e8f0)] bg-[var(--store-surface,#ffffff)]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-2 -ml-2 rounded-md text-[var(--store-text,#0f172a)] hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)]"
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-6 bg-white">
              <SheetHeader className="text-left pb-4 border-b">
                <SheetTitle className="text-lg font-bold flex items-center gap-2 text-[var(--store-text,#0f172a)]">
                  <StoreIcon className="h-5 w-5 text-[var(--store-primary,#0f172a)]" />
                  <span>{storeName}</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col space-y-3">
                {navigationItems.map((item) => (
                  <Link
                    key={item.id}
                    href={formatLink(item.url)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-base font-medium transition ${
                      isActive(item.url)
                        ? "bg-slate-100 text-[var(--store-primary,#0f172a)] font-semibold"
                        : "text-slate-600 hover:text-[var(--store-text,#0f172a)] hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-slate-200 text-xs text-slate-500">
                <p>Powered by STOREFY</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Store Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={formatLink("/")}
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--store-text,#0f172a)] hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)] rounded"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={storeName}
                className="h-8 max-w-[140px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[var(--store-primary,#0f172a)] text-white">
                  <StoreIcon className="h-4 w-4" />
                </span>
                <span className="font-heading">{storeName}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navigationItems.map((item) => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.id}
                href={formatLink(item.url)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "text-[var(--store-primary,#0f172a)] font-semibold border-b-2 border-[var(--store-primary,#0f172a)] rounded-b-none"
                    : "text-slate-600 hover:text-[var(--store-text,#0f172a)] hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Header Action Placeholders (Search & Cart) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Search Button (Accessible placeholder with honest tooltip) */}
          <button
            type="button"
            className="p-2 rounded-full text-slate-600 hover:text-[var(--store-text,#0f172a)] hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)]"
            title="Product Search"
            aria-label="Search products"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Cart Button (Live interactive badge) */}
          <button
            type="button"
            onClick={openCart}
            className="p-2 rounded-full text-slate-600 hover:text-[var(--store-text,#0f172a)] hover:bg-slate-100 transition relative focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#0f172a)]"
            title="Shopping Cart"
            aria-label={`Shopping Cart (${totalQuantity} items)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalQuantity > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--store-primary,#0f172a)] text-[10px] font-bold text-white shadow-xs">
                {totalQuantity > 99 ? "99+" : totalQuantity}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}


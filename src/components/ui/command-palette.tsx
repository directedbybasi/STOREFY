"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Boxes,
  BarChart3,
  Settings,
  Sparkles,
  CreditCard,
  Truck,
  Building2,
  Store,
  Tag,
  ArrowRight,
  Shield,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Commerce" | "Settings" | "Quick Actions";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "nav-overview",
    title: "Overview Dashboard",
    subtitle: "Store metrics and recent activity",
    category: "Navigation",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "main", "analytics", "sales"],
  },
  {
    id: "nav-products",
    title: "Products & Catalog",
    subtitle: "Manage catalog, SKUs and pricing",
    category: "Commerce",
    href: "/dashboard/products",
    icon: Package,
    keywords: ["items", "inventory", "variants", "add product"],
  },
  {
    id: "nav-new-product",
    title: "Add New Product",
    subtitle: "Create a new catalog item",
    category: "Quick Actions",
    href: "/dashboard/products/new",
    icon: Package,
    keywords: ["create", "upload", "item"],
  },
  {
    id: "nav-orders",
    title: "Orders & Fulfillment",
    subtitle: "Review, pack and dispatch orders",
    category: "Commerce",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    keywords: ["shipments", "fulfill", "sales", "returns"],
  },
  {
    id: "nav-inventory",
    title: "Inventory & Ledger",
    subtitle: "Track on-hand, reserved and available stock",
    category: "Commerce",
    href: "/dashboard/inventory",
    icon: Boxes,
    keywords: ["stock", "warehouse", "units"],
  },
  {
    id: "nav-customers",
    title: "Customers Directory",
    subtitle: "Buyer profiles, spend and lifetime value",
    category: "Commerce",
    href: "/dashboard/customers",
    icon: Users,
    keywords: ["users", "buyers", "profiles", "crm"],
  },
  {
    id: "nav-analytics",
    title: "Financial Analytics",
    subtitle: "Revenue, AOV, conversion rate and sales",
    category: "Commerce",
    href: "/dashboard/analytics",
    icon: BarChart3,
    keywords: ["reports", "revenue", "charts", "metrics"],
  },
  {
    id: "nav-marketing",
    title: "Discounts & Coupons",
    subtitle: "Promotions, promo codes and discounts",
    category: "Commerce",
    href: "/dashboard/marketing/coupons",
    icon: Tag,
    keywords: ["coupons", "offers", "sale"],
  },
  {
    id: "nav-pos",
    title: "Point of Sale (POS)",
    subtitle: "Retail barcode and checkout register",
    category: "Commerce",
    href: "/dashboard/pos",
    icon: Store,
    keywords: ["retail", "cashier", "barcode"],
  },
  {
    id: "nav-b2b",
    title: "B2B Wholesale Portal",
    subtitle: "Corporate accounts, price lists and net terms",
    category: "Commerce",
    href: "/dashboard/b2b",
    icon: Building2,
    keywords: ["wholesale", "quotes", "companies"],
  },
  {
    id: "nav-ai",
    title: "AI Commerce Intelligence",
    subtitle: "AI description generation and SEO optimizer",
    category: "Quick Actions",
    href: "/dashboard/ai",
    icon: Sparkles,
    keywords: ["copywriting", "seo", "generate"],
  },
  {
    id: "nav-settings",
    title: "Store Settings",
    subtitle: "General policies, domains and store profile",
    category: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    keywords: ["general", "profile", "store name"],
  },
  {
    id: "nav-payments",
    title: "Payment Gateways",
    subtitle: "Razorpay, Cashfree and COD configuration",
    category: "Settings",
    href: "/dashboard/settings/payments",
    icon: CreditCard,
    keywords: ["gateway", "upi", "cards", "payouts"],
  },
  {
    id: "nav-shipping",
    title: "Shipping & Logistics",
    subtitle: "Shiprocket, Delhivery and carrier rates",
    category: "Settings",
    href: "/dashboard/settings/shipping",
    icon: Truck,
    keywords: ["courier", "logistics", "delhivery", "rates"],
  },
  {
    id: "nav-developer",
    title: "Developer API & Webhooks",
    subtitle: "API keys, webhooks and developer logs",
    category: "Settings",
    href: "/dashboard/settings/developer",
    icon: FileText,
    keywords: ["api", "keys", "tokens", "integration"],
  },
  {
    id: "nav-admin",
    title: "Platform Admin Console",
    subtitle: "Internal Storefy oversight and governance",
    category: "Quick Actions",
    href: "/admin",
    icon: Shield,
    keywords: ["platform", "superadmin", "audit", "merchants"],
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS;
    const q = query.toLowerCase().trim();
    return COMMAND_ITEMS.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle?.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query]);

  // Group filtered items
  const groupedItems = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredItems.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return Array.from(map.entries());
  }, [filteredItems]);

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  let currentCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
          <Search className="h-4 w-4 text-muted-foreground/80 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (e.g. Products, Orders, Payments)..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groupedItems.map(([category, items]) => (
              <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const itemIndex = currentCounter++;
                    const isSelected = itemIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          router.push(item.href);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md border text-muted-foreground shrink-0",
                              isSelected
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted/40"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <ArrowRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform",
                            isSelected && "text-primary translate-x-0.5"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3.5 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.2 font-mono text-[9px]">
                ↑
              </kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.2 font-mono text-[9px]">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.2 font-mono text-[9px]">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span>STOREFY OS</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
  Zap,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { formatINR } from "@/modules/catalog";

interface SerializedVariant {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number; // in Paise
  compareAtPrice: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

interface SerializedImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
}

interface ProductDetailViewProps {
  product: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    brand: string | null;
    vendor: string | null;
    basePrice: number; // in Paise
    compareAtPrice: number | null;
    sku: string | null;
    barcode: string | null;
  };
  variants: SerializedVariant[];
  images: SerializedImage[];
  categoryName?: string | null;
  storeName: string;
}

export function ProductDetailView({
  product,
  variants,
  images,
  categoryName,
  storeName,
}: ProductDetailViewProps) {
  // Gallery active image
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variant options detection
  const hasOptions = variants.length > 0 && variants.some((v) => v.option1);

  // Extract unique values for each option dimension
  const option1Values = Array.from(
    new Set(variants.map((v) => v.option1).filter(Boolean) as string[])
  );
  const option2Values = Array.from(
    new Set(variants.map((v) => v.option2).filter(Boolean) as string[])
  );
  const option3Values = Array.from(
    new Set(variants.map((v) => v.option3).filter(Boolean) as string[])
  );

  const [selectedOpt1, setSelectedOpt1] = useState<string>(option1Values[0] || "");
  const [selectedOpt2, setSelectedOpt2] = useState<string>(option2Values[0] || "");
  const [selectedOpt3, setSelectedOpt3] = useState<string>(option3Values[0] || "");

  const [quantity, setQuantity] = useState(1);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Determine current active variant based on option selections
  let currentVariant: SerializedVariant | undefined = undefined;
  if (hasOptions) {
    currentVariant = variants.find(
      (v) =>
        (!selectedOpt1 || v.option1 === selectedOpt1) &&
        (!selectedOpt2 || v.option2 === selectedOpt2) &&
        (!selectedOpt3 || v.option3 === selectedOpt3)
    );
  }
  if (!currentVariant && variants.length > 0) {
    currentVariant = variants[0];
  }

  // Active price and compare price
  const activePricePaise = currentVariant ? currentVariant.price : product.basePrice;
  const activeComparePricePaise = currentVariant
    ? currentVariant.compareAtPrice
    : product.compareAtPrice;

  // Discount percentage
  const discountPercent =
    activeComparePricePaise && activeComparePricePaise > activePricePaise
      ? Math.round(
          ((activeComparePricePaise - activePricePaise) / activeComparePricePaise) * 100
        )
      : null;

  // Handle Cart & Buy Now hooks (truthful feedback without fake checkout)
  const handleAddToCart = () => {
    setActionFeedback("Product added to cart! (Cart & Checkout will activate in Phase 7)");
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleBuyNow = () => {
    setActionFeedback("Direct checkout flow will be enabled in Phase 7.");
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const currentImageUrl =
    images.length > 0 ? images[activeImageIndex]?.imageUrl : null;

  return (
    <div className="space-y-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link href="/products" className="hover:text-slate-900 transition">
          Products
        </Link>
        {categoryName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-700">{categoryName}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-medium truncate max-w-[200px]">
          {product.title}
        </span>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Image Gallery (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex items-center justify-center">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt={images[activeImageIndex]?.altText || product.title}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <ImageIcon className="h-16 w-16 mb-2" />
                <span className="text-xs">No image available</span>
              </div>
            )}

            {discountPercent && (
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                {discountPercent}% OFF
              </div>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-20 w-20 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                    activeImageIndex === idx
                      ? "border-slate-900 shadow-sm"
                      : "border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.altText || `Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Variant Selectors (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            {(product.brand || product.vendor) && (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {product.brand || product.vendor}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              {product.title}
            </h1>
            {product.shortDescription && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* Pricing Display */}
          <div className="flex items-baseline gap-3 pb-4 border-b border-slate-200">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {formatINR(activePricePaise)}
            </span>
            {activeComparePricePaise && activeComparePricePaise > activePricePaise && (
              <span className="text-lg text-slate-400 line-through font-mono">
                {formatINR(activeComparePricePaise)}
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">Inclusive of all taxes</span>
          </div>

          {/* Variant Selectors */}
          {hasOptions && (
            <div className="space-y-4">
              {/* Option 1 */}
              {option1Values.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                    Option: {selectedOpt1}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {option1Values.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedOpt1(val)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${
                          selectedOpt1 === val
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 2 */}
              {option2Values.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                    Option: {selectedOpt2}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {option2Values.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedOpt2(val)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${
                          selectedOpt2 === val
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 3 */}
              {option3Values.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                    Option: {selectedOpt3}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {option3Values.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedOpt3(val)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${
                          selectedOpt3 === val
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity and Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="px-4 py-2 text-xs font-semibold text-slate-900 font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-sm font-semibold hover:opacity-90 transition shadow-sm"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </button>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-sm"
            >
              <Zap className="h-4 w-4" />
              Buy Now with Cash on Delivery
            </button>
          </div>

          {/* Feedback Toast */}
          {actionFeedback && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-600">
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center">
              <Truck className="h-4 w-4 text-slate-700 mb-1" />
              <span>Free Delivery</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center">
              <ShieldCheck className="h-4 w-4 text-slate-700 mb-1" />
              <span>100% Authentic</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center">
              <RotateCcw className="h-4 w-4 text-slate-700 mb-1" />
              <span>7-Day Return</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-2 text-[11px] text-slate-500 space-y-1">
            {(currentVariant?.sku || product.sku) && (
              <p>
                SKU:{" "}
                <span className="font-mono text-slate-700">
                  {currentVariant?.sku || product.sku}
                </span>
              </p>
            )}
            <p>
              Sold by: <span className="font-medium text-slate-700">{storeName}</span>
            </p>
          </div>

          {/* Detailed Description */}
          {product.description && (
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Product Details</h3>
              <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

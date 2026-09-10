"use client";

import React, { use } from "react";
import Link from "next/link";
import { useCart } from "@/components/storefront/cart-context";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  Tag,
} from "lucide-react";

interface CartPageProps {
  params: Promise<{ domain: string }>;
}

export default function StorefrontCartPage({ params }: CartPageProps) {
  const { domain } = use(params);
  const { cart, updateQuantity, removeItem, clearCart, isLoading, error } = useCart();

  const items = cart?.items || [];
  const checkoutLink = `/${domain}/checkout`;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href={`/${domain}`} className="hover:text-slate-900 transition">
          Home
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-900 font-medium">Cart</span>
      </nav>

      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-slate-900" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Shopping Cart
          </h1>
          {cart && cart.totalQuantity > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
              {cart.totalQuantity} {cart.totalQuantity === 1 ? "Item" : "Items"}
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clearCart()}
            disabled={isLoading}
            className="text-xs text-slate-500 hover:text-rose-600 transition flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Cart</span>
          </button>
        )}
      </div>

      {/* Warnings & Errors */}
      {cart?.warnings && cart.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-1">
          {cart.warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-20 text-center space-y-5 bg-slate-50/60 rounded-2xl border border-slate-200/80">
          <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">Your shopping cart is empty</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Looks like you haven&apos;t added anything to your cart yet. Discover trending products in our catalog.
            </p>
          </div>
          <Link
            href={`/${domain}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-sm"
          >
            <span>Explore Products</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 justify-between hover:bg-slate-50/50 transition"
                >
                  {/* Image & Title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                        {item.productTitle}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Variant: <span className="font-medium text-slate-700">{item.variantTitle}</span>
                        {item.sku ? ` • SKU: ${item.sku}` : ""}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 sm:hidden">
                        {item.unitPriceFormatted} each
                      </p>
                    </div>
                  </div>

                  {/* Price, Stepper, Subtotal */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-slate-400">Unit Price</p>
                      <p className="text-sm font-medium text-slate-700">{item.unitPriceFormatted}</p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.variantId, item.quantity - 1);
                          } else {
                            removeItem(item.variantId);
                          }
                        }}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 py-1 text-xs font-bold text-slate-900 min-w-[32px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        disabled={isLoading || item.quantity >= item.availableStock}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-slate-400 sm:block hidden">Total</p>
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {item.lineSubtotalFormatted}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
              <Link
                href={`/${domain}/products`}
                className="hover:text-slate-900 transition flex items-center gap-1 font-medium"
              >
                <span>← Continue Shopping</span>
              </Link>
              <span>Prices include all applicable taxes</span>
            </div>
          </div>

          {/* Order Summary Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {cart?.subtotalFormatted || "₹0.00"}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-emerald-600">
                    {cart?.subtotalPaise && cart.subtotalPaise >= 99900 ? "FREE" : "₹99.00"}
                  </span>
                </div>

                {cart?.discountPaise && cart.discountPaise > 0 ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{cart.discountFormatted}</span>
                  </div>
                ) : null}

                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="text-base font-bold text-slate-900">Grand Total</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {cart?.totalFormatted || cart?.subtotalFormatted || "₹0.00"}
                  </span>
                </div>
              </div>

              {/* Promo code hook */}
              <div className="pt-2">
                <label htmlFor="coupon" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Coupon or Promo Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="coupon"
                      type="text"
                      placeholder="Enter promo code"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Checkout Primary Action */}
              <Link
                href={checkoutLink}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md flex items-center justify-center gap-2 text-center"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>100% Secure Checkout with 256-bit encryption</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Free standard delivery on orders above ₹999</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <RotateCcw className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <span>7-day easy return policy on eligible products</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

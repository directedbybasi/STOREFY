"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";

interface CartDrawerProps {
  domain: string;
}

export function CartDrawer({ domain }: CartDrawerProps) {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, isLoading, error } = useCart();
  const pathname = usePathname();

  if (!isOpen) return null;

  const checkoutLink = pathname.startsWith(`/${domain}`)
    ? `/${domain}/checkout`
    : "/checkout";

  const cartPageLink = pathname.startsWith(`/${domain}`)
    ? `/${domain}/cart`
    : "/cart";

  const items = cart?.items || [];
  const totalQuantity = cart?.totalQuantity || 0;
  const subtotalFormatted = cart?.subtotalFormatted || "₹0.00";
  const warnings = cart?.warnings || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          aria-label="Shopping Cart Drawer"
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-slate-800" />
              <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
              {totalQuantity > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
                  {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-slate-900"
              aria-label="Close cart drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warnings Banner */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {warnings.map((w, idx) => (
                  <p key={idx}>{w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-800">Your cart is empty</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Explore our collection and add your favorite items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition shadow-sm"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
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

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {item.productTitle}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          disabled={isLoading}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Remove item"
                          aria-label={`Remove ${item.productTitle}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {item.variantTitle} {item.sku ? `• ${item.sku}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      {/* Price */}
                      <span className="text-sm font-bold text-slate-900">
                        {item.lineSubtotalFormatted}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
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
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 py-1 text-xs font-semibold text-slate-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          disabled={isLoading || item.quantity >= item.availableStock}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Authoritative Server Pricing */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/80 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{subtotalFormatted}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Shipping</span>
                  <span className="font-medium text-emerald-600">
                    {cart?.subtotalPaise && cart.subtotalPaise >= 99900 ? "FREE" : "Calculated at checkout"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-base pt-2 border-t border-slate-200">
                  <span>Estimated Total</span>
                  <span>{cart?.totalFormatted || subtotalFormatted}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href={checkoutLink}
                  onClick={closeCart}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-md flex items-center justify-center gap-2 text-center"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href={cartPageLink}
                  onClick={closeCart}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition text-center"
                >
                  View Full Cart Page
                </Link>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Secure Checkout
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                  Free delivery over ₹999
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

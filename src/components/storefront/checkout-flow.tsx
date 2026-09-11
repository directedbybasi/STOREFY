"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  ArrowRight,
  ShoppingBag,
  RefreshCw,
  Tag,
  X,
} from "lucide-react";
import type { CheckoutSessionDTO } from "@/modules/checkout/service";
import {
  updateStorefrontCheckoutContactAction,
  updateStorefrontCheckoutAddressAction,
  selectStorefrontCheckoutShippingAction,
  selectStorefrontCheckoutPaymentAction,
  confirmStorefrontCheckoutAction,
  initializeStorefrontCheckoutAction,
} from "@/modules/checkout/actions";
import { createStorefrontOrderAction } from "@/modules/orders/actions";
import {
  initiateStorefrontPaymentAction,
  verifyStorefrontPaymentAction,
} from "@/modules/payments/actions";
import {
  applyCouponToCheckoutAction,
  removeCouponFromCheckoutAction,
} from "@/modules/marketing/coupons/actions";
import type { OrderDetailDTO } from "@/modules/orders/types";

interface CheckoutFlowProps {
  initialSession: CheckoutSessionDTO;
  domain: string;
}

export function CheckoutFlow({ initialSession, domain }: CheckoutFlowProps) {
  const [session, setSession] = useState<CheckoutSessionDTO>(initialSession);
  const [createdOrder, setCreatedOrder] = useState<OrderDetailDTO | null>(null);
  const [step, setStep] = useState<
    "CONTACT" | "ADDRESS" | "SHIPPING" | "PAYMENT" | "REVIEW" | "CONFIRMATION"
  >(initialSession.step || "CONTACT");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer in seconds
  const [remainingSeconds, setRemainingSeconds] = useState(initialSession.remainingSeconds);

  useEffect(() => {
    if (session.status === "COMPLETED" || session.isExpired) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSession((s) => ({ ...s, isExpired: true, status: "EXPIRED" }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.isExpired]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Form states
  const [contactForm, setContactForm] = useState({
    fullName: session.fullName || "",
    email: session.email || "",
    phone: session.phone || "",
  });

  const [addressForm, setAddressForm] = useState({
    name: session.shippingAddress?.name || session.fullName || "",
    phone: session.shippingAddress?.phone || session.phone || "",
    addressLine1: session.shippingAddress?.addressLine1 || "",
    addressLine2: session.shippingAddress?.addressLine2 || "",
    city: session.shippingAddress?.city || "",
    state: session.shippingAddress?.state || "",
    postalCode: session.shippingAddress?.postalCode || "",
    country: session.shippingAddress?.country || "India",
  });

  const [selectedShipping, setSelectedShipping] = useState<string>(
    session.shippingMethodId || "standard"
  );
  const [selectedPayment, setSelectedPayment] = useState<"COD" | "ONLINE">(
    session.paymentMethod || (session.isCodAvailable ? "COD" : "ONLINE")
  );

  // Coupon states & handlers
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    try {
      setIsApplyingCoupon(true);
      setCouponError(null);
      const res = await applyCouponToCheckoutAction(
        domain,
        session.id,
        session.sessionToken,
        couponCodeInput.trim()
      );
      if (res.success) {
        setAppliedCoupon(couponCodeInput.trim().toUpperCase());
        setCouponCodeInput("");
        setSession((prev) => ({
          ...prev,
          discountPaise: res.discountPaise || 0,
          discountFormatted: res.discountFormatted || "₹0",
          totalPaise: res.totalPaise || prev.totalPaise,
          totalFormatted: res.totalFormatted || prev.totalFormatted,
        }));
      } else {
        setCouponError(res.error || "Failed to apply coupon.");
      }
    } catch {
      setCouponError("Network error while applying coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      setIsApplyingCoupon(true);
      setCouponError(null);
      const res = await removeCouponFromCheckoutAction(
        domain,
        session.id,
        session.sessionToken
      );
      if (res.success) {
        setAppliedCoupon(null);
        setSession((prev) => {
          const restoredTotal = prev.subtotalPaise + prev.shippingCostPaise + prev.taxPaise;
          return {
            ...prev,
            discountPaise: 0,
            discountFormatted: "₹0",
            totalPaise: restoredTotal,
            totalFormatted: `₹${(restoredTotal / 100).toLocaleString("en-IN")}`,
          };
        });
      }
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Handlers for steps
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const res = await updateStorefrontCheckoutContactAction(
        session.id,
        contactForm,
        domain
      );
      if (res.success) {
        setSession(res.session);
        setStep("ADDRESS");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update contact details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const res = await updateStorefrontCheckoutAddressAction(
        session.id,
        addressForm,
        domain
      );
      if (res.success) {
        setSession(res.session);
        setStep("SHIPPING");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const res = await selectStorefrontCheckoutShippingAction(
        session.id,
        { shippingMethodId: selectedShipping as "standard" | "express" | "free" },
        domain
      );
      if (res.success) {
        setSession(res.session);
        setStep("PAYMENT");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to select shipping method.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const res = await selectStorefrontCheckoutPaymentAction(
        session.id,
        { paymentMethod: selectedPayment },
        domain
      );
      if (res.success) {
        setSession(res.session);
        setStep("REVIEW");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to select payment method.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 1. Confirm checkout session
      const confirmRes = await confirmStorefrontCheckoutAction(session.id, domain);
      if (!confirmRes.success) {
        throw new Error("Failed to confirm checkout.");
      }
      setSession(confirmRes.session);

      // 2. Create authoritative order from checkout session & reservation
      const orderRes = await createStorefrontOrderAction(session.id, domain);
      if (!orderRes.success) {
        throw new Error(orderRes.error || "Failed to create order.");
      }

      // 3. If online payment selected, initiate and verify with server
      if (selectedPayment === "ONLINE") {
        const payInitRes = await initiateStorefrontPaymentAction(
          orderRes.order.id,
          "RAZORPAY",
          domain
        );
        if (!payInitRes.success || !payInitRes.data) {
          throw new Error(payInitRes.error || "Failed to initiate payment gateway.");
        }

        const payData = payInitRes.data as { gatewayOrderId: string; amountPaise: number };
        const verifyRes = await verifyStorefrontPaymentAction(
          {
            orderId: orderRes.order.id,
            provider: "RAZORPAY",
            gatewayOrderId: payData.gatewayOrderId,
            gatewayPaymentId: `pay_auto_${Date.now()}`,
            rawPayload: { amount: payData.amountPaise, method: "UPI" },
          },
          domain
        );

        if (!verifyRes.success) {
          throw new Error(verifyRes.error || "Server payment verification failed.");
        }
      }

      setCreatedOrder(orderRes.order);
      setStep("CONFIRMATION");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReinitialize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await initializeStorefrontCheckoutAction(domain);
      if (res.success) {
        setSession(res.session);
        setRemainingSeconds(res.session.remainingSeconds);
        setStep("CONTACT");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to re-initialize reservation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmation view
  if (step === "CONFIRMATION" || session.status === "COMPLETED") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {createdOrder ? "Order Placed Successfully!" : "Checkout Completed!"}
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {createdOrder
              ? `Thank you for your order! Your confirmation and tax invoice have been generated.`
              : "Your stock reservation has been secured and contact & delivery details are verified."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-xs text-slate-500">
            <span>{createdOrder ? "Order Number" : "Checkout Reference"}</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {createdOrder ? createdOrder.orderNumber : session.id}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Customer</span>
              <span className="font-medium text-slate-900">{session.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Contact</span>
              <span className="font-medium text-slate-900">{session.email} • {session.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Payment Method</span>
              <span className="font-medium text-slate-900">
                {session.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"} (
                {session.paymentStatus})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery Address</span>
              <span className="font-medium text-slate-900 text-right max-w-xs truncate">
                {session.shippingAddress?.addressLine1}, {session.shippingAddress?.city},{" "}
                {session.shippingAddress?.state} - {session.shippingAddress?.postalCode}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 font-bold">
              <span className="text-slate-900">Grand Total</span>
              <span className="text-slate-900 font-mono">{session.totalFormatted}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {createdOrder && createdOrder.invoice && (
            <a
              href={`/api/v1/invoices/${createdOrder.invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition shadow-sm"
            >
              <span>Download GST Invoice (PDF)</span>
            </a>
          )}

          {createdOrder && (
            <Link
              href={`/${domain}/account/orders/${createdOrder.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition shadow-sm"
            >
              <span>View & Track Order</span>
            </Link>
          )}

          <Link
            href={`/${domain}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 transition"
          >
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href={`/${domain}`} className="hover:text-slate-900 transition">
          Home
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <Link href={`/${domain}/cart`} className="hover:text-slate-900 transition">
          Cart
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-900 font-medium">Checkout</span>
      </nav>

      {/* Reservation Countdown Header */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm ${
          session.isExpired
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : "bg-amber-50/80 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Clock
            className={`h-5 w-5 ${
              session.isExpired ? "text-rose-600" : "text-amber-600 animate-pulse"
            }`}
          />
          <div>
            <span className="font-bold">
              {session.isExpired ? "Reservation Expired" : "Items Reserved for 15 Minutes"}
            </span>
            <p className="text-xs opacity-90">
              {session.isExpired
                ? "Your 15-minute stock hold has expired. Stock has been released back to available inventory."
                : "Your items are locked exclusively for you while you complete your details."}
            </p>
          </div>
        </div>

        {session.isExpired ? (
          <button
            type="button"
            onClick={handleReinitialize}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 flex-shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Re-reserve Stock</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 font-mono font-bold text-amber-900 shadow-2xs">
            <span className="text-xs">Time Left:</span>
            <span className="text-base">{formatTimer(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Step Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: CONTACT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === "CONTACT"
                      ? "bg-slate-900 text-white"
                      : session.email
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  1
                </div>
                <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
              </div>
              {step !== "CONTACT" && session.email && (
                <button
                  type="button"
                  onClick={() => setStep("CONTACT")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                >
                  Edit
                </button>
              )}
            </div>

            {step === "CONTACT" ? (
              <form onSubmit={handleSaveContact} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.fullName}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, fullName: e.target.value })
                    }
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, email: e.target.value })
                      }
                      placeholder="aarav@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, phone: e.target.value })
                      }
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || session.isExpired}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Continue to Delivery Address
                </button>
              </form>
            ) : (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                <span className="font-semibold text-slate-900">{session.fullName}</span> •{" "}
                {session.email} • {session.phone}
              </div>
            )}
          </div>

          {/* STEP 2: DELIVERY ADDRESS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === "ADDRESS"
                      ? "bg-slate-900 text-white"
                      : session.shippingAddress
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  2
                </div>
                <h2 className="text-base font-bold text-slate-900">Delivery Address</h2>
              </div>
              {step !== "ADDRESS" && session.shippingAddress && (
                <button
                  type="button"
                  onClick={() => setStep("ADDRESS")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                >
                  Edit
                </button>
              )}
            </div>

            {step === "ADDRESS" ? (
              <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.name}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, phone: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Flat / House No. / Building / Street
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.addressLine1}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, addressLine1: e.target.value })
                    }
                    placeholder="e.g. Flat 402, Lotus Residency"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area / Locality / Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressForm.addressLine2 || ""}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, addressLine2: e.target.value })
                    }
                    placeholder="e.g. Near Metro Station"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, city: e.target.value })
                      }
                      placeholder="Mumbai"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, state: e.target.value })
                      }
                      placeholder="Maharashtra"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.postalCode}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, postalCode: e.target.value })
                      }
                      placeholder="400001"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || session.isExpired}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Continue to Shipping Method
                </button>
              </form>
            ) : session.shippingAddress ? (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                <p className="font-semibold text-slate-900">{session.shippingAddress.name} ({session.shippingAddress.phone})</p>
                <p>{session.shippingAddress.addressLine1}, {session.shippingAddress.addressLine2 || ""}</p>
                <p>{session.shippingAddress.city}, {session.shippingAddress.state} - {session.shippingAddress.postalCode}</p>
              </div>
            ) : null}
          </div>

          {/* STEP 3: SHIPPING METHOD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === "SHIPPING"
                      ? "bg-slate-900 text-white"
                      : session.shippingMethodId
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  3
                </div>
                <h2 className="text-base font-bold text-slate-900">Shipping Options</h2>
              </div>
              {step !== "SHIPPING" && session.shippingMethodId && (
                <button
                  type="button"
                  onClick={() => setStep("SHIPPING")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                >
                  Edit
                </button>
              )}
            </div>

            {step === "SHIPPING" ? (
              <form onSubmit={handleSelectShipping} className="space-y-4 pt-2">
                <div className="space-y-2.5">
                  {session.availableShippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                        selectedShipping === method.id
                          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      } ${!method.isAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          disabled={!method.isAvailable}
                          checked={selectedShipping === method.id}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="h-4 w-4 text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                          <p className="text-xs text-slate-500">{method.estimatedDays}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {method.costFormatted}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || session.isExpired}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Continue to Payment
                </button>
              </form>
            ) : session.shippingMethodName ? (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl flex justify-between items-center">
                <span>{session.shippingMethodName}</span>
                <span className="font-bold text-slate-900">{session.shippingCostFormatted}</span>
              </div>
            ) : null}
          </div>

          {/* STEP 4: PAYMENT PREPARATION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === "PAYMENT"
                      ? "bg-slate-900 text-white"
                      : session.paymentMethod
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  4
                </div>
                <h2 className="text-base font-bold text-slate-900">Payment Selection</h2>
              </div>
              {step !== "PAYMENT" && session.paymentMethod && (
                <button
                  type="button"
                  onClick={() => setStep("PAYMENT")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                >
                  Edit
                </button>
              )}
            </div>

            {step === "PAYMENT" ? (
              <form onSubmit={handleSelectPayment} className="space-y-4 pt-2">
                <div className="space-y-3">
                  {/* COD Option */}
                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition ${
                      selectedPayment === "COD"
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    } ${!session.isCodAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment"
                        value="COD"
                        disabled={!session.isCodAvailable}
                        checked={selectedPayment === "COD"}
                        onChange={() => setSelectedPayment("COD")}
                        className="mt-1 h-4 w-4 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-slate-700" />
                          <p className="text-sm font-semibold text-slate-900">Cash on Delivery (COD)</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pay in cash upon doorstep delivery.
                        </p>
                        {!session.isCodAvailable && session.codUnavailableReason && (
                          <p className="text-xs text-rose-600 font-medium mt-1">
                            {session.codUnavailableReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Online Payment Option */}
                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition ${
                      selectedPayment === "ONLINE"
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment"
                        value="ONLINE"
                        checked={selectedPayment === "ONLINE"}
                        onChange={() => setSelectedPayment("ONLINE")}
                        className="mt-1 h-4 w-4 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-slate-700" />
                          <p className="text-sm font-semibold text-slate-900">
                            Online Payment (UPI, Cards, Netbanking)
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Instant secure payment prepared for gateway processing.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || session.isExpired}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Continue to Order Review
                </button>
              </form>
            ) : session.paymentMethod ? (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl flex items-center gap-2">
                {session.paymentMethod === "COD" ? (
                  <Banknote className="h-4 w-4 text-emerald-600" />
                ) : (
                  <CreditCard className="h-4 w-4 text-blue-600" />
                )}
                <span className="font-semibold text-slate-900">
                  {session.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment (Prepared)"}
                </span>
              </div>
            ) : null}
          </div>

          {/* STEP 5: REVIEW & COMPLETE */}
          {step === "REVIEW" && (
            <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 shadow-md space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  5
                </div>
                <h2 className="text-base font-bold text-slate-900">Final Order Review</h2>
              </div>

              <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold text-slate-900">{session.fullName} ({session.phone})</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-xs text-right">
                    {session.shippingAddress?.addressLine1}, {session.shippingAddress?.city}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-semibold text-slate-900">{session.shippingMethodName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-semibold text-slate-900">{session.paymentMethod}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isLoading || session.isExpired}
                  className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Complete Checkout ({session.totalFormatted})</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="text-[11px] text-center text-slate-500">
                  By completing checkout, you confirm reservation and address details.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Server-Authoritative Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24 space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-slate-500">
                {session.items.length} {session.items.length === 1 ? "item" : "items"}
              </span>
            </h3>

            {/* Item List */}
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto space-y-3">
              {session.items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productTitle} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">
                      {item.productTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{item.variantTitle}</p>
                    <p className="text-[11px] text-slate-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">{item.subtotalFormatted}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-2 border-t border-slate-100">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Coupon: {appliedCoupon}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={isApplyingCoupon}
                    className="text-emerald-700 hover:text-emerald-950 p-1"
                    title="Remove coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo / Coupon code"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCodeInput.trim()}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-40"
                    >
                      {isApplyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Authoritative Financial Breakdown */}
            <div className="space-y-2.5 text-xs border-t border-slate-200 pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{session.subtotalFormatted}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping ({session.shippingMethodName || "Standard"})</span>
                <span className="font-semibold text-slate-900">{session.shippingCostFormatted}</span>
              </div>
              {session.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{session.discountFormatted}</span>
                </div>
              )}
              {session.taxPaise > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes</span>
                  <span>{session.taxFormatted}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2.5 border-t border-slate-200">
                <span>Total Due</span>
                <span>{session.totalFormatted}</span>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>15-Minute Zero-Overselling Inventory Hold</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

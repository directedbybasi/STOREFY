import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/tenant/rbac";
import { getOrderById } from "@/modules/orders/order-service";
import { OrderDetailActions } from "@/components/dashboard/order-detail-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  CreditCard,
  FileText,
  RotateCcw,
} from "lucide-react";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { orderId } = await params;
  return {
    title: `Order Details — STOREFY`,
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const ctx = await requirePermission("orders:read");
  const { orderId } = await params;

  let order;
  try {
    order = await getOrderById(ctx.store.id, orderId, { isStaff: true });
  } catch (err) {
    notFound();
  }

  const steps = ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];
  const currentStepIndex = steps.indexOf(order.status);

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header & Breadcrumb */}
      <div className="space-y-2">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-white tracking-tight">
                {order.orderNumber}
              </h1>
              <Badge
                className={
                  order.status === "DELIVERED"
                    ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50"
                    : order.status === "CANCELLED"
                    ? "bg-rose-900/40 text-rose-300 border-rose-700/50"
                    : "bg-indigo-900/40 text-indigo-300 border-indigo-700/50"
                }
              >
                {order.status}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                {order.fulfillmentStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <OrderDetailActions order={order} />
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      {order.status !== "CANCELLED" && order.status !== "RTO" && (
        <Card className="border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 z-0"></div>
            {steps.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step} className="flex flex-col items-center z-10 space-y-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCompleted
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                        : "bg-slate-950 border border-slate-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isCurrent
                        ? "text-indigo-400 font-bold"
                        : isCompleted
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 2-Column Order Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items, Fulfillments, History) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-950/50">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-400" />
                Line Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-800/60">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-slate-400">{item.variantTitle}</p>
                    {item.sku && (
                      <p className="text-[11px] font-mono text-slate-500">SKU: {item.sku}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <span>Qty: {item.quantity}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Fulfilled: {item.fulfilledQuantity}</span>
                      {item.returnedQuantity > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400">Returned: {item.returnedQuantity}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold font-mono text-white text-sm">
                      {item.totalFormatted}
                    </p>
                    <p className="text-slate-500 text-[11px] font-mono">
                      {item.unitPriceFormatted} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Fulfillments Card */}
          {order.fulfillments.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-950/50">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-cyan-400" />
                  Shipments ({order.fulfillments.length})
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-slate-800/60">
                {order.fulfillments.map((f) => (
                  <div key={f.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">
                          {f.status}
                        </Badge>
                        <span className="font-semibold text-white">{f.carrier}</span>
                      </div>
                      <span className="text-slate-400">
                        {f.shippedAt
                          ? new Date(f.shippedAt).toLocaleDateString("en-IN")
                          : "Pending"}
                      </span>
                    </div>

                    {f.trackingNumber && (
                      <p className="font-mono text-slate-300">
                        Tracking No:{" "}
                        {f.trackingUrl ? (
                          <a
                            href={f.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            {f.trackingNumber}
                          </a>
                        ) : (
                          <span>{f.trackingNumber}</span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Status Timeline Card */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-950/50">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Audit Status History
              </CardTitle>
            </CardHeader>
            <div className="p-4 space-y-4">
              {order.history.map((h, i) => (
                <div key={h.id} className="flex gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">
                        {h.toStatus} <span className="text-slate-500 font-normal">({h.actorType})</span>
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {new Date(h.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {h.note && <p className="text-slate-400 text-[11px]">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (Customer, Addresses, Financials) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white border-b border-slate-800 pb-2">
              <User className="h-4 w-4 text-indigo-400" />
              Customer Details
            </div>
            <div className="text-xs space-y-1 text-slate-300">
              <p className="font-medium text-white">{order.customer.fullName}</p>
              <p className="text-slate-400">{order.customer.email}</p>
              <p className="text-slate-400">{order.customer.phone}</p>
            </div>
          </Card>

          {/* Shipping Address Card */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white border-b border-slate-800 pb-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              Delivery Address
            </div>
            <div className="text-xs space-y-0.5 text-slate-300">
              <p className="font-medium text-white">{order.shippingAddress.name}</p>
              <p className="text-slate-400">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p className="text-slate-400">{order.shippingAddress.addressLine2}</p>
              )}
              <p className="text-slate-400">
                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-slate-400">{order.shippingAddress.country}</p>
              <p className="text-slate-400 pt-1">Phone: {order.shippingAddress.phone}</p>
            </div>
          </Card>

          {/* Financial Breakdown Card */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white border-b border-slate-800 pb-2">
              <CreditCard className="h-4 w-4 text-amber-400" />
              Financial Summary
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{order.subtotalFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-mono text-slate-200">{order.shippingFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (Tax Inclusive)</span>
                <span className="font-mono text-slate-200">{order.taxFormatted}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white text-sm">
                <span>Grand Total</span>
                <span className="font-mono text-emerald-400">{order.totalFormatted}</span>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Payment Method</span>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                  {order.paymentMethod}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

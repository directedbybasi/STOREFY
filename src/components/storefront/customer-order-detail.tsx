"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Download,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
  FileText,
  XCircle,
  MapPin,
  CreditCard,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderDetailDTO, OrderStatus, ReturnStatus } from "@/modules/orders/types";
import {
  requestStorefrontReturnAction,
} from "@/modules/orders/actions";

interface CustomerOrderDetailProps {
  initialOrder: OrderDetailDTO;
  domain: string;
}

const LIFECYCLE_STEPS: OrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

export function CustomerOrderDetail({ initialOrder, domain }: CustomerOrderDetailProps) {
  const [order, setOrder] = useState<OrderDetailDTO>(initialOrder);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialOrder.items[0]?.id || ""
  );
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>(
    "Defective or Damaged Product"
  );
  const [returnNotes, setReturnNotes] = useState<string>("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  // Determine current lifecycle step index
  const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.status);
  const isTerminalCancelled = order.status === "CANCELLED";
  const isTerminalRTO = order.status === "RTO";

  // Check 14-day return eligibility window
  const isDelivered = order.status === "DELIVERED";
  const deliveredDate = order.fulfillments.find((f) => f.deliveredAt)?.deliveredAt || order.updatedAt;
  const daysSinceDelivery = (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24);
  const isReturnEligible = isDelivered && daysSinceDelivery <= 14;

  const selectedItem = order.items.find((i) => i.id === selectedItemId);
  const maxReturnableQty = selectedItem
    ? Math.max(0, selectedItem.quantity - selectedItem.returnedQuantity)
    : 0;

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setIsSubmittingReturn(true);
      setReturnError(null);

      const res = await requestStorefrontReturnAction(
        {
          orderId: order.id,
          reason: returnReason,
          notes: returnNotes || undefined,
          items: [
            {
              orderItemId: selectedItem.id,
              quantity: Number(returnQuantity),
              reason: returnReason,
            },
          ],
        },
        domain,
        order.customerId
      );

      if (!res.success) {
        throw new Error(res.error);
      }

      setReturnSuccessMsg(
        `Return request ${res.returnReq.returnNumber} submitted successfully!`
      );
      // Append return to order
      setOrder((prev) => ({
        ...prev,
        returns: [res.returnReq, ...prev.returns],
      }));
      setIsReturnModalOpen(false);
    } catch (err: unknown) {
      setReturnError(err instanceof Error ? err.message : "Failed to submit return.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
      case "PROCESSING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Processing</Badge>;
      case "PACKED":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Packed</Badge>;
      case "SHIPPED":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Shipped</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Delivered</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Cancelled</Badge>;
      case "RTO":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Returned to Origin (RTO)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReturnStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case "REQUESTED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Return Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Request Rejected</Badge>;
      case "RECEIVED":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Package Received</Badge>;
      case "REFUNDED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <Link href={`/${domain}`} className="hover:text-slate-900 transition">
            Home
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <Link href={`/${domain}/account/orders`} className="hover:text-slate-900 transition">
            My Orders
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900 font-medium font-mono">{order.orderNumber}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
                Order #{order.orderNumber}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
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

          <div className="flex items-center gap-2">
            {order.invoice && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs shadow-sm"
              >
                <a
                  href={`/api/v1/invoices/${order.invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                  Tax Invoice (PDF)
                </a>
              </Button>
            )}

            {isReturnEligible && maxReturnableQty > 0 && (
              <Button
                size="sm"
                onClick={() => setIsReturnModalOpen(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Request Return
              </Button>
            )}
          </div>
        </div>
      </div>

      {returnSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{returnSuccessMsg}</span>
        </div>
      )}

      {/* Lifecycle Progress Bar */}
      {!isTerminalCancelled && !isTerminalRTO && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Progress</h2>
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-0">
              <div
                className="h-1 bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    (currentStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100
                  )}%`,
                }}
              />
            </div>

            {LIFECYCLE_STEPS.map((stepName, idx) => {
              const isCompleted = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;

              return (
                <div key={stepName} className="flex flex-col items-center z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-400"
                    } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-2 capitalize ${
                      isCompleted ? "text-slate-900 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {stepName.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isTerminalCancelled && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3">
          <Ban className="h-6 w-6 text-rose-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-rose-900">This order has been cancelled</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Reason: {order.cancelledReason || "Customer request"}
            </p>
          </div>
        </div>
      )}

      {isTerminalRTO && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-center gap-3">
          <RotateCcw className="h-6 w-6 text-orange-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-orange-900">Package Returned to Origin (RTO)</h3>
            <p className="text-xs text-orange-700 mt-0.5">
              The carrier was unable to complete delivery and the package has returned to our fulfillment warehouse.
            </p>
          </div>
        </div>
      )}

      {/* Shipment & Tracking Information */}
      {order.fulfillments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-600" />
              Shipment & Tracking Information
            </h2>
            <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs">
              {order.fulfillmentStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.fulfillments.map((f) => (
              <div key={f.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">
                    {f.carrier || "Standard Shipping Carrier"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {f.status}
                  </Badge>
                </div>
                {f.trackingNumber && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Tracking Number:</span>
                    <span className="font-mono font-bold text-slate-900">{f.trackingNumber}</span>
                  </div>
                )}
                {f.trackingUrl && (
                  <div className="pt-2">
                    <a
                      href={f.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Track Package on Carrier Site
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Items & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Package className="h-4 w-4 text-slate-600" />
              Items in this Order ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500">
                        {item.variantTitle} {item.sku && `• SKU: ${item.sku}`}
                      </p>
                      <p className="text-xs text-slate-600">
                        Qty: <span className="font-semibold text-slate-900">{item.quantity}</span> ×{" "}
                        {item.unitPriceFormatted}
                      </p>
                      {item.returnedQuantity > 0 && (
                        <p className="text-[11px] font-semibold text-amber-600">
                          {item.returnedQuantity} returned
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{item.totalFormatted}</p>
                    {item.taxPaise > 0 && (
                      <p className="text-[10px] text-slate-400">
                        Incl. Tax ({item.taxFormatted})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Returns Section */}
          {order.returns.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Return Requests ({order.returns.length})
              </h2>

              <div className="space-y-3">
                {order.returns.map((ret) => (
                  <div key={ret.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-900">{ret.returnNumber}</span>
                      {getReturnStatusBadge(ret.status)}
                    </div>
                    <p className="text-slate-700">
                      <strong>Reason:</strong> {ret.reason}
                    </p>
                    {ret.notes && (
                      <p className="text-slate-500">
                        <strong>Notes:</strong> {ret.notes}
                      </p>
                    )}
                    <div className="pt-1 text-slate-500 border-t border-slate-200/60 text-[11px] flex justify-between">
                      <span>Requested on {new Date(ret.createdAt).toLocaleDateString()}</span>
                      <span>{ret.items.length} item(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Price Breakdown, Address, & Payment */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Payment Summary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{order.subtotalFormatted}</span>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-{order.discountFormatted}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span className="font-medium text-slate-900">
                  {order.shippingPaise === 0 ? "Free" : order.shippingFormatted}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Tax (Included)</span>
                <span className="font-medium text-slate-900">{order.taxFormatted}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-100 text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono">{order.totalFormatted}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  Payment Method
                </span>
                <span className="font-semibold text-slate-900">
                  {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-medium text-emerald-600">{order.paymentStatus}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <MapPin className="h-4 w-4 text-slate-500" />
              Delivery Address
            </h2>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="pt-1 text-slate-500 font-mono">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Return Request Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-500" />
                Request Return / Exchange
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {returnError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{returnError}</span>
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Select Item to Return</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setReturnQuantity(1);
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {order.items.map((item) => {
                    const eligible = item.quantity - item.returnedQuantity;
                    return (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={eligible <= 0}
                      >
                        {item.title} ({item.variantTitle}) — {eligible} returnable
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">
                  Return Quantity (Max: {maxReturnableQty})
                </label>
                <Input
                  type="number"
                  min={1}
                  max={maxReturnableQty}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Defective or Damaged Product">Defective or Damaged Product</option>
                  <option value="Wrong Item Received">Wrong Item Received</option>
                  <option value="Item Does Not Match Description">Item Does Not Match Description</option>
                  <option value="Size / Fit Issue">Size / Fit Issue</option>
                  <option value="Arrived Too Late">Arrived Too Late</option>
                  <option value="Changed Mind">Changed Mind</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Additional Details / Notes</label>
                <textarea
                  rows={3}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Describe the defect or reason for returning..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="text-xs border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingReturn || maxReturnableQty <= 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                >
                  {isSubmittingReturn ? "Submitting..." : "Submit Return Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

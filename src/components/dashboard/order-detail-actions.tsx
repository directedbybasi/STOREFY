"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateDashboardOrderStatusAction,
  createDashboardFulfillmentAction,
  cancelDashboardOrderAction,
  updateDashboardFulfillmentStatusAction,
} from "@/modules/orders/actions";
import type { OrderDetailDTO, OrderStatus } from "@/modules/orders/types";

interface OrderDetailActionsProps {
  order: OrderDetailDTO;
}

export function OrderDetailActions({ order }: OrderDetailActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fulfillment form state
  const [carrier, setCarrier] = useState("Delhivery");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  // Cancel form state
  const [cancelReason, setCancelReason] = useState("");

  const handleStatusUpdate = async (nextStatus: OrderStatus) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await updateDashboardOrderStatusAction(order.id, nextStatus);
      if (!res.success) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      // Fulfill all remaining unfulfilled items
      const itemsToFulfill = order.items
        .filter((i) => i.quantity - i.fulfilledQuantity > 0)
        .map((i) => ({
          orderItemId: i.id,
          quantity: i.quantity - i.fulfilledQuantity,
        }));

      if (itemsToFulfill.length === 0) {
        setError("All items in this order are already fulfilled.");
        return;
      }

      const res = await createDashboardFulfillmentAction(order.id, {
        carrier,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
        items: itemsToFulfill,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        setShowFulfillModal(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create shipment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDelivered = async (fulfillmentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await updateDashboardFulfillmentStatusAction(fulfillmentId, {
        status: "DELIVERED",
      });
      if (!res.success) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark delivered.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await cancelDashboardOrderAction(order.id, cancelReason);
      if (!res.success) {
        setError(res.error);
      } else {
        setShowCancelModal(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setIsLoading(false);
    }
  };

  const canFulfill =
    order.status === "CONFIRMED" || order.status === "PROCESSING" || order.status === "PACKED";

  const canCancel =
    order.status === "PENDING" ||
    order.status === "CONFIRMED" ||
    order.status === "PROCESSING" ||
    order.status === "PACKED";

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {order.status === "CONFIRMED" && (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate("PROCESSING")}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8"
          >
            Mark Processing
          </Button>
        )}

        {order.status === "PROCESSING" && (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate("PACKED")}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8"
          >
            Mark Packed
          </Button>
        )}

        {canFulfill && (
          <Button
            size="sm"
            onClick={() => setShowFulfillModal(true)}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1.5"
          >
            <Truck className="h-3.5 w-3.5" />
            Create Shipment / Fulfill
          </Button>
        )}

        {order.status === "SHIPPED" && order.fulfillments.length > 0 && (
          <Button
            size="sm"
            onClick={() => handleMarkDelivered(order.fulfillments[0].id)}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Delivered
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          asChild
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-8 gap-1.5"
        >
          <a
            href={`/api/v1/invoices/${order.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            GST Tax Invoice (PDF)
          </a>
        </Button>

        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            disabled={isLoading}
            className="border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-xs h-8 gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel Order
          </Button>
        )}
      </div>

      {/* Fulfillment Modal */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-400" />
                Dispatch & Fulfill Order
              </h3>
              <button
                type="button"
                onClick={() => setShowFulfillModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFulfillment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Courier / Carrier Name
                </label>
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. Delhivery, BlueDart, India Post"
                  required
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  AWB / Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. DEL-123456789"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tracking Web Link (Optional)
                </label>
                <Input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.carrier.com/..."
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                Fulfilling {order.items.length} items. This will transition order state to{" "}
                <span className="text-cyan-400 font-semibold">SHIPPED</span>.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFulfillModal(false)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  {isLoading ? "Dispatching..." : "Confirm & Ship"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-400" />
                Cancel Order
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Cancellation
                </label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation, out of stock"
                  required
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                />
              </div>

              <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-xs text-rose-300">
                Cancelling will release unfulfilled items back to available inventory and
                record restock movements in the audit ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(false)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
                >
                  {isLoading ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

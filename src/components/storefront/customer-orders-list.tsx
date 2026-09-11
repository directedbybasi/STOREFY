"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Package,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderSummaryDTO, OrderStatus } from "@/modules/orders/types";

interface CustomerOrdersListProps {
  orders: OrderSummaryDTO[];
  domain: string;
}

export function CustomerOrdersList({ orders, domain }: CustomerOrdersListProps) {
  const router = useRouter();
  const [lookupOrderNumber, setLookupOrderNumber] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderNumber.trim()) return;

    try {
      setIsSearching(true);
      setLookupError(null);

      // Call storefront lookup API
      const res = await fetch(
        `/api/v1/storefront/orders?search=${encodeURIComponent(
          lookupOrderNumber.trim()
        )}`,
        {
          headers: {
            "x-storefront-domain": domain,
          },
        }
      );

      const json = await res.json();
      if (!res.ok || !json.data || json.data.length === 0) {
        throw new Error(
          "No order found matching this Order Number. Please verify and try again."
        );
      }

      const matched = json.data[0];
      if (
        lookupEmail.trim() &&
        matched.customerEmail.toLowerCase() !== lookupEmail.trim().toLowerCase()
      ) {
        throw new Error("Email does not match the customer record for this order.");
      }

      router.push(`/${domain}/account/orders/${matched.id}`);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Failed to find order.");
    } finally {
      setIsSearching(false);
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
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">RTO</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Order History & Tracking
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review previous purchases, track deliveries, download GST invoices, and manage returns.
        </p>
      </div>

      {/* Guest Order Lookup Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-600" />
            Track an Order (Guest / Fast Lookup)
          </h2>
          <p className="text-xs text-slate-500">
            Placed an order as a guest? Enter your Order Number and checkout email to look up status.
          </p>
        </div>

        {lookupError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{lookupError}</span>
          </div>
        )}

        <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Order # (e.g. STF-2026-000001)"
            value={lookupOrderNumber}
            onChange={(e) => setLookupOrderNumber(e.target.value)}
            className="bg-white border-slate-300 text-xs text-slate-900 font-mono"
            required
          />
          <Input
            type="email"
            placeholder="Email (used at checkout)"
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            className="bg-white border-slate-300 text-xs text-slate-900"
          />
          <Button
            type="submit"
            disabled={isSearching}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            {isSearching ? "Searching..." : "Track Order"}
          </Button>
        </form>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-600" />
          Recent Orders ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t completed any orders yet, or your orders were placed as a guest.
              Use the tracker above to find guest orders.
            </p>
            <div className="pt-2">
              <Button asChild size="sm" className="bg-slate-900 text-white text-xs">
                <Link href={`/${domain}`}>Browse Products</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-slate-500 font-medium">
                      {order.fulfillmentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    • {order.customerName}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-400">Total Amount</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      {order.totalFormatted}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                  >
                    <Link href={`/${domain}/account/orders/${order.id}`}>
                      View Details
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderSummaryDTO, OrderStatus, PaymentStatus } from "@/modules/orders/types";

interface OrdersTableProps {
  initialOrders: OrderSummaryDTO[];
  total: number;
}

export function OrdersTable({ initialOrders, total }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredOrders = initialOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/50">Confirmed</Badge>;
      case "PROCESSING":
        return <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50">Processing</Badge>;
      case "PACKED":
        return <Badge className="bg-purple-900/40 text-purple-300 border-purple-700/50">Packed</Badge>;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-cyan-900/40 text-cyan-300 border-cyan-700/50">Shipped</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700/50">Delivered</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-900/40 text-rose-300 border-rose-700/50">Cancelled</Badge>;
      case "RTO":
        return <Badge className="bg-orange-900/40 text-orange-300 border-orange-700/50">RTO</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: PaymentStatus, method: string) => {
    if (status === "CAPTURED" || status === "AUTHORIZED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Paid ({method})
        </span>
      );
    }
    if (status === "REFUNDED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        Pending ({method})
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Tabs Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, customer, or email..."
            className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus-visible:ring-1 focus-visible:ring-indigo-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RTO"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab === "ALL" ? "All Orders" : tab.replace(/_/g, " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-sm">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
            <tr>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No orders found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="hover:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                    >
                      {order.orderNumber}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-200">{order.customerName}</div>
                    <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                  <td className="py-3.5 px-4">
                    {getPaymentBadge(order.paymentStatus, order.paymentMethod)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold font-mono text-white">
                    {order.totalFormatted}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 px-2.5 text-[11px] border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200"
                    >
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing {filteredOrders.length} of {total} orders
        </span>
      </div>
    </div>
  );
}

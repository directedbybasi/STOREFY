"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  ShoppingBag,
  ChevronRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
        return <Badge variant="info" dot>Confirmed</Badge>;
      case "PROCESSING":
        return <Badge variant="warning" dot>Processing</Badge>;
      case "PACKED":
        return <Badge variant="info" dot>Packed</Badge>;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Badge variant="info" dot>In Transit</Badge>;
      case "DELIVERED":
        return <Badge variant="success" dot>Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="error" dot>Cancelled</Badge>;
      case "RTO":
        return <Badge variant="warning" dot>RTO</Badge>;
      default:
        return <Badge variant="neutral" dot>{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: PaymentStatus, method: string) => {
    if (status === "CAPTURED" || status === "AUTHORIZED") {
      return (
        <Badge variant="success" dot className="text-[10px]">
          Paid ({method})
        </Badge>
      );
    }
    if (status === "REFUNDED") {
      return (
        <Badge variant="error" dot className="text-[10px]">
          Refunded
        </Badge>
      );
    }
    return (
      <Badge variant="warning" dot className="text-[10px]">
        Pending ({method})
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Tabs Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer, or email..."
            className="pl-8 pr-8 h-8 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {["ALL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RTO"].map(
            (tab) => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {tab === "ALL" ? "All Orders" : tab.replace(/_/g, " ")}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Canonical Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ShoppingBag}
              title="No orders found"
              description="No orders match your filter criteria. When customer purchases occur, orders appear here in real-time."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="group">
                  <TableCell className="font-mono font-medium text-foreground">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      prefetch={true}
                      className="hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      {order.orderNumber}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>

                  <TableCell className="text-muted-foreground font-tabular text-xs whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-foreground truncate max-w-[180px]">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {order.customerEmail}
                    </div>
                  </TableCell>

                  <TableCell>{getStatusBadge(order.status)}</TableCell>

                  <TableCell>
                    {getPaymentBadge(order.paymentStatus, order.paymentMethod)}
                  </TableCell>

                  <TableCell className="text-right font-medium font-tabular text-foreground">
                    {order.totalFormatted}
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="xs"
                      asChild
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/dashboard/orders/${order.id}`} prefetch={true}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Table Footer Summary */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground font-tabular">{filteredOrders.length}</span> of{" "}
            <span className="font-medium text-foreground font-tabular">{total}</span> orders
          </span>
        </div>
      </div>
    </div>
  );
}

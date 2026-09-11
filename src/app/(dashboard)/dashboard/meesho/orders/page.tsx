"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import {
  listMarketplaceOrderTasksAction,
  recordMeeshoOrderPlacedAction,
  recordMeeshoTrackingAction,
} from "@/modules/marketplaces/orders/actions";
import type { MarketplaceOrderTaskDTO } from "@/modules/marketplaces/orders/types";
import { formatPaiseToRupees } from "@/lib/currency";

export default function MeeshoOrdersPage() {
  const [tasks, setTasks] = useState<MarketplaceOrderTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<MarketplaceOrderTaskDTO | null>(null);

  // Form states
  const [sourceOrderId, setSourceOrderId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("Delhivery");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await listMarketplaceOrderTasksAction();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleRecordOrderPlaced = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !sourceOrderId.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await recordMeeshoOrderPlacedAction(selectedTask.id, sourceOrderId.trim());
      setMessage("Marked as ordered on Meesho successfully!");
      setSourceOrderId("");
      setSelectedTask(null);
      await fetchTasks();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to record order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !trackingNumber.trim() || !carrier.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await recordMeeshoTrackingAction(selectedTask.id, trackingNumber.trim(), carrier.trim());
      setMessage("Shipment tracking recorded and STOREFY fulfillment synced!");
      setTrackingNumber("");
      setSelectedTask(null);
      await fetchTasks();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to record tracking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/meesho">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-400" />
              Meesho Fulfillment Tasks ({tasks.length})
            </h1>
            <p className="text-xs text-slate-400">
              Guide and track semi-manual orders placed on Meesho.
            </p>
          </div>
        </div>
        <Button
          onClick={fetchTasks}
          variant="outline"
          size="sm"
          className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Refresh
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading fulfillment tasks...</div>
      ) : tasks.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/60 text-center py-12">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No fulfillment tasks pending</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When a customer purchases a Meesho product, a fulfillment task appears here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product / Qty</th>
                <th className="px-4 py-3">Wholesale Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Meesho Reference</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3 text-right">Fulfillment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tasks.map((task) => {
                const statusColor =
                  task.status === "DELIVERED"
                    ? "text-emerald-400 border-emerald-500/30"
                    : task.status === "SHIPPED"
                    ? "text-sky-400 border-sky-500/30"
                    : task.status === "ORDERED"
                    ? "text-amber-400 border-amber-500/30"
                    : "text-rose-400 border-rose-500/30";

                return (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {task.orderNumber || task.orderId.slice(0, 8)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white truncate max-w-xs">
                        {task.productTitle}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Qty: {task.quantity} | Source ID: {task.sourceProductId}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {formatPaiseToRupees(task.sourceCostPaise)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {task.sourceOrderId || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {task.trackingNumber ? (
                        <span>
                          {task.carrier}: {task.trackingNumber}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {task.status === "PENDING" ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                        >
                          Mark Ordered
                        </Button>
                      ) : task.status === "ORDERED" ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                          className="h-7 text-xs bg-sky-600 hover:bg-sky-500 text-white"
                        >
                          Add Tracking
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">In Transit</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal / Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold">
                {selectedTask.status === "PENDING"
                  ? "Record Meesho Order Placed"
                  : "Record Carrier Tracking"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Order {selectedTask.orderNumber || selectedTask.orderId.slice(0, 8)} • {selectedTask.productTitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTask.status === "PENDING" ? (
                <form onSubmit={handleRecordOrderPlaced} className="space-y-4">
                  <div className="rounded bg-slate-950 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Customer Shipping Address:</p>
                    <p>{JSON.stringify(selectedTask.shippingAddress)}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      Meesho Order ID / Reference:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MSH-ORD-9821245"
                      value={sourceOrderId}
                      onChange={(e) => setSourceOrderId(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTask(null)}
                      className="flex-1 text-xs text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !sourceOrderId.trim()}
                      size="sm"
                      className="flex-1 text-xs bg-rose-600 hover:bg-rose-500 text-white"
                    >
                      {submitting ? "Saving..." : "Save Order Reference"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecordTracking} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">Carrier Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Delhivery, Shadowfax, XpressBees"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">AWB / Tracking Number:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12891240124"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTask(null)}
                      className="flex-1 text-xs text-slate-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !trackingNumber.trim()}
                      size="sm"
                      className="flex-1 text-xs bg-sky-600 hover:bg-sky-500 text-white"
                    >
                      {submitting ? "Saving..." : "Save & Sync Fulfillment"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

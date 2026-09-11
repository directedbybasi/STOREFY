"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PackageCheck,
  IndianRupee,
  ChevronRight,
  AlertCircle,
  Clock,
  ArchiveRestore,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { ReturnDTO, ReturnStatus } from "@/modules/orders/types";
import {
  reviewDashboardReturnAction,
  receiveDashboardReturnAction,
} from "@/modules/orders/actions";

interface ReturnsTableProps {
  initialReturns: ReturnDTO[];
  total: number;
}

export function ReturnsTable({ initialReturns, total }: ReturnsTableProps) {
  const [returnsList, setReturnsList] = useState<ReturnDTO[]>(initialReturns);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReturn, setSelectedReturn] = useState<ReturnDTO | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "RECEIVE" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiveCondition, setReceiveCondition] = useState("Good condition / Resellable");
  const [restockInventory, setRestockInventory] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredReturns = returnsList.filter((ret) => {
    const matchesSearch =
      ret.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || ret.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case "REQUESTED":
        return <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50">Requested</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/50">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-900/40 text-rose-300 border-rose-700/50">Rejected</Badge>;
      case "RECEIVED":
        return <Badge className="bg-purple-900/40 text-purple-300 border-purple-700/50">Received</Badge>;
      case "REFUNDED":
        return <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700/50">Refunded</Badge>;
      case "CANCELLED":
        return <Badge className="bg-slate-800 text-slate-400 border-slate-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReview = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedReturn) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const res = await reviewDashboardReturnAction(selectedReturn.id, {
        decision,
        reason: decision === "REJECTED" ? rejectReason : undefined,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      setReturnsList((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? res.returnReq : r))
      );
      setSelectedReturn(null);
      setActionType(null);
      setRejectReason("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to review return.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedReturn) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const res = await receiveDashboardReturnAction(selectedReturn.id, {
        condition: receiveCondition,
        restockInventory,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      setReturnsList((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? res.returnReq : r))
      );
      setSelectedReturn(null);
      setActionType(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to receive return.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search return #, order #, or reason..."
            className="pl-9 bg-slate-950/60 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {["ALL", "REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === tab
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Returns List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm">
        {filteredReturns.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No return requests found</p>
            <p className="text-xs text-slate-500 mt-1">
              Customer-initiated return requests will appear here for review and restocking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Customer Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredReturns.map((ret) => {
                  const totalUnits = ret.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-white">
                        {ret.returnNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/dashboard/orders/${ret.orderId}`}
                          className="font-mono text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          {ret.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="space-y-0.5">
                          <p className="font-medium text-white">
                            {totalUnits} unit{totalUnits > 1 ? "s" : ""}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {ret.items.map((it) => `${it.title} (${it.quantity}x)`).join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                        <p className="truncate font-medium">{ret.reason}</p>
                        {ret.notes && (
                          <p className="text-[11px] text-slate-500 truncate">{ret.notes}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(ret.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {ret.status === "REQUESTED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReturn(ret);
                                  setActionType("APPROVE");
                                }}
                                className="h-7 px-2.5 text-[11px] border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReturn(ret);
                                  setActionType("REJECT");
                                }}
                                className="h-7 px-2.5 text-[11px] border-rose-600/50 text-rose-400 hover:bg-rose-600/20"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {ret.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReturn(ret);
                                setActionType("RECEIVE");
                              }}
                              className="h-7 px-2.5 text-[11px] border-purple-600/50 text-purple-400 hover:bg-purple-600/20"
                            >
                              <PackageCheck className="h-3 w-3 mr-1" />
                              Receive & Restock
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-7 px-2 text-slate-400 hover:text-white"
                          >
                            <Link href={`/dashboard/orders/${ret.orderId}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Order
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {selectedReturn && actionType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {actionType === "APPROVE" && (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-blue-400" />
                    Approve Return Request
                  </>
                )}
                {actionType === "REJECT" && (
                  <>
                    <XCircle className="h-5 w-5 text-rose-400" />
                    Reject Return Request
                  </>
                )}
                {actionType === "RECEIVE" && (
                  <>
                    <ArchiveRestore className="h-5 w-5 text-purple-400" />
                    Confirm Physical Receipt & Restock
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setSelectedReturn(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Return #</span>
                <span className="font-mono text-white">{selectedReturn.returnNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order #</span>
                <span className="font-mono text-white">{selectedReturn.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason</span>
                <span className="text-white font-medium">{selectedReturn.reason}</span>
              </div>
            </div>

            {actionType === "APPROVE" && (
              <p className="text-xs text-slate-400">
                Approving this request authorises the customer to send back the package.
                Once received at your warehouse, you can inspect and restock the items to your inventory ledger.
              </p>
            )}

            {actionType === "REJECT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rejection Reason</label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Item used / outside return window / missing tags"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            )}

            {actionType === "RECEIVE" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Package Inspection Condition</label>
                  <Input
                    value={receiveCondition}
                    onChange={(e) => setReceiveCondition(e.target.value)}
                    placeholder="e.g., Unopened / good condition / damaged"
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <input
                    type="checkbox"
                    id="restockCheckbox"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="restockCheckbox" className="text-xs text-slate-200 cursor-pointer">
                    <span className="font-semibold block">Automatic Inventory Restock</span>
                    <span className="text-[11px] text-slate-400">
                      Increment available stock on the ledger via auditable RETURN restock movement.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedReturn(null);
                  setActionType(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>

              {actionType === "APPROVE" && (
                <Button
                  size="sm"
                  onClick={() => handleReview("APPROVED")}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                >
                  {isProcessing ? "Approving..." : "Confirm Approval"}
                </Button>
              )}

              {actionType === "REJECT" && (
                <Button
                  size="sm"
                  onClick={() => handleReview("REJECTED")}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
                >
                  {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              )}

              {actionType === "RECEIVE" && (
                <Button
                  size="sm"
                  onClick={handleReceive}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  {isProcessing ? "Receiving..." : "Confirm Received & Restock"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

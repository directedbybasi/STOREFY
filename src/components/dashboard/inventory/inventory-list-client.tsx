"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ArrowUpDown,
  History,
  Edit,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type InventoryItemDTO,
  type InventoryListResult,
  type InventoryReason,
  INVENTORY_REASONS,
  adjustStockAction,
  bulkAdjustStockAction,
  updateInventoryThresholdAction,
} from "@/modules/inventory";

interface InventoryListClientProps {
  data: InventoryListResult;
}

export function InventoryListClient({ data }: InventoryListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeStatus, setActiveStatus] = useState<string>(
    searchParams.get("stockStatus") || "ALL"
  );
  const [activeSort, setActiveSort] = useState<string>(
    searchParams.get("sortBy") || "available"
  );
  const [sortOrder, setSortOrder] = useState<string>(
    searchParams.get("sortOrder") || "asc"
  );

  // Single Adjustment Modal State
  const [adjustTarget, setAdjustTarget] = useState<InventoryItemDTO | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<InventoryReason>("ADJUSTMENT");
  const adjustRefType = "MANUAL_ADJUSTMENT";
  const [adjustRefId, setAdjustRefId] = useState<string>("");
  const [adjustNotes, setAdjustNotes] = useState<string>("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Bulk Adjustment Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDelta, setBulkDelta] = useState<number>(0);
  const [bulkReason, setBulkReason] = useState<InventoryReason>("RESTOCK");
  const bulkRefType = "BULK_ADJUSTMENT";
  const [bulkRefId, setBulkRefId] = useState<string>("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkAdjusting, setIsBulkAdjusting] = useState(false);

  // Low Stock Threshold Modal State
  const [thresholdTarget, setThresholdTarget] = useState<InventoryItemDTO | null>(null);
  const [newThreshold, setNewThreshold] = useState<number>(5);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  // URL Query Updater
  function updateQuery(params: Record<string, string | null>) {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "" || (key === "stockStatus" && value === "ALL")) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    // reset to page 1 on filter changes unless page itself is updated
    if (!("page" in params)) {
      current.delete("page");
    }
    startTransition(() => {
      router.push(`/dashboard/inventory?${current.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchQuery });
  }

  function handleStatusChange(status: string) {
    setActiveStatus(status);
    updateQuery({ stockStatus: status });
  }

  function handleSortChange(sort: string) {
    const newOrder = activeSort === sort && sortOrder === "asc" ? "desc" : "asc";
    setActiveSort(sort);
    setSortOrder(newOrder);
    updateQuery({ sortBy: sort, sortOrder: newOrder });
  }

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(data.items.map((i) => i.variantId));
    } else {
      setSelectedIds([]);
    }
  }

  function handleToggleSelect(variantId: string) {
    setSelectedIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }

  // Submit Single Adjustment
  async function handleSingleAdjustSubmit() {
    if (!adjustTarget) return;
    if (adjustDelta === 0) {
      setAdjustError("Adjustment quantity cannot be zero");
      return;
    }

    setAdjustError(null);
    setIsAdjusting(true);
    try {
      await adjustStockAction({
        variantId: adjustTarget.variantId,
        quantityDelta: adjustDelta,
        reason: adjustReason,
        referenceType: adjustRefType || undefined,
        referenceId: adjustRefId || undefined,
        notes: adjustNotes || undefined,
      });

      setAdjustTarget(null);
      setAdjustDelta(0);
      setAdjustRefId("");
      setAdjustNotes("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to adjust stock";
      setAdjustError(msg);
    } finally {
      setIsAdjusting(false);
    }
  }

  // Submit Bulk Adjustment
  async function handleBulkAdjustSubmit() {
    if (selectedIds.length === 0 || bulkDelta === 0) {
      setBulkError("Please select variants and specify a non-zero adjustment delta");
      return;
    }

    setBulkError(null);
    setIsBulkAdjusting(true);
    try {
      await bulkAdjustStockAction({
        adjustments: selectedIds.map((id) => ({
          variantId: id,
          quantityDelta: bulkDelta,
        })),
        reason: bulkReason,
        referenceType: bulkRefType || undefined,
        referenceId: bulkRefId || undefined,
      });

      setBulkModalOpen(false);
      setSelectedIds([]);
      setBulkDelta(0);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to perform bulk adjustment";
      setBulkError(msg);
    } finally {
      setIsBulkAdjusting(false);
    }
  }

  // Submit Threshold Change
  async function handleThresholdSubmit() {
    if (!thresholdTarget) return;
    if (newThreshold < 0) {
      setThresholdError("Threshold cannot be negative");
      return;
    }

    setThresholdError(null);
    setIsSavingThreshold(true);
    try {
      await updateInventoryThresholdAction({
        variantId: thresholdTarget.variantId,
        lowStockThreshold: newThreshold,
      });

      setThresholdTarget(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update threshold";
      setThresholdError(msg);
    } finally {
      setIsSavingThreshold(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-emerald-400" />
            Inventory Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant stock ledger, available balances, reservations, and auditable movement logs.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Badge variant="secondary" className="bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              {selectedIds.length} Selected
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600/50 text-emerald-300 hover:bg-emerald-950/40 text-xs"
              onClick={() => {
                setBulkDelta(0);
                setBulkError(null);
                setBulkModalOpen(true);
              }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              Bulk Adjust
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-slate-400 hover:text-white"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Variants</span>
          <p className="text-xl font-bold text-white mt-1">{data.summary.totalVariants}</p>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> In Stock
          </span>
          <p className="text-xl font-bold text-emerald-300 mt-1">{data.summary.inStockCount}</p>
        </div>
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Low Stock
          </span>
          <p className="text-xl font-bold text-amber-300 mt-1">{data.summary.lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Out of Stock
          </span>
          <p className="text-xl font-bold text-rose-300 mt-1">{data.summary.outOfStockCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">On Hand</span>
          <p className="text-xl font-bold text-white mt-1">{data.summary.totalOnHand}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Reserved</span>
          <p className="text-xl font-bold text-slate-300 mt-1">{data.summary.totalReserved}</p>
        </div>
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Available</span>
          <p className="text-xl font-bold text-indigo-300 mt-1">{data.summary.totalAvailable}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: "ALL", label: "All Stock" },
            { id: "IN_STOCK", label: "In Stock" },
            { id: "LOW_STOCK", label: "Low Stock" },
            { id: "OUT_OF_STOCK", label: "Out of Stock" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeStatus === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 h-8"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700">
            Search
          </Button>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={data.items.length > 0 && selectedIds.length === data.items.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                </th>
                <th className="p-3">Product / Variant</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Status</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("on_hand")}>
                  <div className="flex items-center gap-1">
                    On Hand <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("reserved")}>
                  <div className="flex items-center gap-1">
                    Reserved <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("available")}>
                  <div className="flex items-center gap-1 text-emerald-400">
                    Available <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3">Threshold</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <Boxes className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No inventory records match your criteria.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => {
                  const isSelected = selectedIds.includes(item.variantId);
                  return (
                    <tr
                      key={item.variantId}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isSelected ? "bg-emerald-950/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.variantId)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                        />
                      </td>

                      {/* Product / Variant Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.variantTitle}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/inventory/${item.variantId}`}
                              className="font-medium text-white hover:text-emerald-400 transition-colors"
                            >
                              {item.productTitle}
                            </Link>
                            <div className="text-[11px] text-slate-400">
                              {item.variantTitle !== "Default Title" ? item.variantTitle : "Default"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-3 font-mono text-slate-300">
                        {item.sku || <span className="text-slate-600">—</span>}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {item.stockStatus === "IN_STOCK" && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px]">
                            In Stock
                          </Badge>
                        )}
                        {item.stockStatus === "LOW_STOCK" && (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-950/40 text-amber-300 text-[10px]">
                            Low Stock
                          </Badge>
                        )}
                        {item.stockStatus === "OUT_OF_STOCK" && (
                          <Badge variant="outline" className="border-rose-500/30 bg-rose-950/40 text-rose-300 text-[10px]">
                            Out of Stock
                          </Badge>
                        )}
                      </td>

                      {/* Quantities */}
                      <td className="p-3 font-semibold text-slate-200">{item.onHand}</td>
                      <td className="p-3 text-slate-400">{item.reserved}</td>
                      <td className="p-3 font-bold text-sm text-emerald-400">{item.available}</td>

                      {/* Low Stock Threshold */}
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setThresholdTarget(item);
                            setNewThreshold(item.lowStockThreshold);
                            setThresholdError(null);
                          }}
                          className="flex items-center gap-1 text-slate-400 hover:text-white group transition-colors"
                          title="Click to edit threshold"
                        >
                          <span>{item.lowStockThreshold}</span>
                          <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={() => {
                              setAdjustTarget(item);
                              setAdjustDelta(0);
                              setAdjustError(null);
                            }}
                          >
                            Adjust
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            asChild
                            title="View Ledger History"
                          >
                            <Link href={`/dashboard/inventory/${item.variantId}`}>
                              <History className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          <div>
            Showing {(data.page - 1) * data.pageSize + 1} to{" "}
            {Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-800"
              disabled={data.page <= 1 || isPending}
              onClick={() => updateQuery({ page: String(data.page - 1) })}
            >
              Previous
            </Button>
            <span className="text-slate-300 font-medium px-2">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-800"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => updateQuery({ page: String(data.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* SINGLE ADJUSTMENT MODAL */}
      {adjustTarget && (
        <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-emerald-400" />
                Adjust Stock: {adjustTarget.productTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Variant: {adjustTarget.variantTitle} | SKU: {adjustTarget.sku || "N/A"}
              </DialogDescription>
            </DialogHeader>

            {adjustError && (
              <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
                {adjustError}
              </div>
            )}

            <div className="space-y-4 py-2 text-xs">
              {/* Current Balances Display */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/60 p-3 border border-slate-800 text-center">
                <div>
                  <span className="text-slate-400 text-[10px] block">ON HAND</span>
                  <span className="text-sm font-semibold text-white">{adjustTarget.onHand}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">RESERVED</span>
                  <span className="text-sm font-semibold text-amber-300">{adjustTarget.reserved}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">AVAILABLE</span>
                  <span className="text-sm font-bold text-emerald-400">{adjustTarget.available}</span>
                </div>
              </div>

              {/* Delta Input */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-300">Quantity Delta (+ to increase, - to decrease)</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-slate-700"
                    onClick={() => setAdjustDelta((prev) => prev - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                    className="h-8 text-center font-bold text-white bg-slate-950 border-slate-800"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-slate-700"
                    onClick={() => setAdjustDelta((prev) => prev + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="text-[11px] text-slate-400 text-center mt-1">
                  New Available:{" "}
                  <span className="font-bold text-white">
                    {Math.max(0, adjustTarget.onHand + adjustDelta - adjustTarget.reserved)}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-300">Adjustment Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as InventoryReason)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-white"
                >
                  {INVENTORY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference ID / Note */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-300">Reference / Note (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. PO-9842, Damaged in Transit, etc."
                  value={adjustRefId}
                  onChange={(e) => setAdjustRefId(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => setAdjustTarget(null)}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                onClick={handleSingleAdjustSubmit}
                disabled={isAdjusting || adjustDelta === 0}
              >
                {isAdjusting ? "Writing Ledger..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK ADJUSTMENT MODAL */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
              Bulk Adjust {selectedIds.length} Variants
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Apply uniform stock adjustments across all selected items atomically.
            </DialogDescription>
          </DialogHeader>

          {bulkError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
              {bulkError}
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Delta Quantity (+/-)</label>
              <Input
                type="number"
                value={bulkDelta}
                onChange={(e) => setBulkDelta(parseInt(e.target.value) || 0)}
                placeholder="e.g. 50 or -10"
                className="h-8 bg-slate-950 border-slate-800 text-white font-mono text-center text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Reason</label>
              <select
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value as InventoryReason)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-white"
              >
                {INVENTORY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Reference ID</label>
              <Input
                type="text"
                placeholder="e.g. BULK-RESTOCK-2026"
                value={bulkRefId}
                onChange={(e) => setBulkRefId(e.target.value)}
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => setBulkModalOpen(false)}
              disabled={isBulkAdjusting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              onClick={handleBulkAdjustSubmit}
              disabled={isBulkAdjusting || bulkDelta === 0}
            >
              {isBulkAdjusting ? "Executing Bulk Transaction..." : "Apply Bulk Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOW STOCK THRESHOLD MODAL */}
      {thresholdTarget && (
        <Dialog open={!!thresholdTarget} onOpenChange={(open) => !open && setThresholdTarget(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Set Low Stock Alert</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Trigger low-stock warning when available quantity falls below or equal to:
              </DialogDescription>
            </DialogHeader>

            {thresholdError && (
              <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2 text-xs text-rose-300">
                {thresholdError}
              </div>
            )}

            <div className="py-2">
              <Input
                type="number"
                min={0}
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                className="h-8 text-center font-bold text-white bg-slate-950 border-slate-800 text-sm"
              />
            </div>

            <DialogFooter className="gap-1 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white text-xs"
                onClick={() => setThresholdTarget(null)}
                disabled={isSavingThreshold}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                onClick={handleThresholdSubmit}
                disabled={isSavingThreshold}
              >
                {isSavingThreshold ? "Saving..." : "Save Threshold"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

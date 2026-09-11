"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Search,
  SlidersHorizontal,
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
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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

  function updateQuery(params: Record<string, string | null>) {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "" || (key === "stockStatus" && value === "ALL")) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
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

  function handleSortChange(column: string) {
    const nextOrder = activeSort === column && sortOrder === "asc" ? "desc" : "asc";
    setActiveSort(column);
    setSortOrder(nextOrder);
    updateQuery({ sortBy: column, sortOrder: nextOrder });
  }

  function handleToggleSelect(variantId: string) {
    setSelectedIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.items.map((i) => i.variantId));
    }
  }

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
        referenceType: adjustRefType,
        referenceId: adjustRefId || undefined,
      });

      setAdjustTarget(null);
      setAdjustDelta(0);
      setAdjustRefId("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record adjustment";
      setAdjustError(msg);
    } finally {
      setIsAdjusting(false);
    }
  }

  async function handleBulkAdjustSubmit() {
    if (selectedIds.length === 0) return;
    if (bulkDelta === 0) {
      setBulkError("Adjustment quantity cannot be zero");
      return;
    }

    setBulkError(null);
    setIsBulkAdjusting(true);
    try {
      await bulkAdjustStockAction({
        reason: bulkReason,
        referenceType: bulkRefType,
        referenceId: bulkRefId || undefined,
        adjustments: selectedIds.map((variantId) => ({
          variantId,
          quantityDelta: bulkDelta,
        })),
      });

      setBulkModalOpen(false);
      setSelectedIds([]);
      setBulkDelta(0);
      setBulkRefId("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process bulk adjustment";
      setBulkError(msg);
    } finally {
      setIsBulkAdjusting(false);
    }
  }

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
    <div className="space-y-5">
      {/* Canonical Page Header */}
      <PageHeader
        title="Inventory"
        description="Real-time multi-tenant stock ledger, available balances, reservations, and auditable movement logs."
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <span className="inline-flex h-5 items-center justify-center rounded bg-primary/20 px-2 text-xs font-semibold text-primary font-tabular">
                {selectedIds.length} selected
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setBulkDelta(0);
                  setBulkError(null);
                  setBulkModalOpen(true);
                }}
              >
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                Bulk Adjust
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                Deselect
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-4">
        <StatCard
          title="Total Variants"
          value={data.summary.totalVariants}
          icon={Boxes}
        />
        <StatCard
          title="In Stock"
          value={data.summary.inStockCount}
          subtitle="Available for order routing"
        />
        <StatCard
          title="Low Stock"
          value={data.summary.lowStockCount}
          subtitle="Below safety threshold"
        />
        <StatCard
          title="Available Units"
          value={data.summary.totalAvailable}
          subtitle={`${data.summary.totalReserved} units currently reserved`}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: "ALL", label: "All Stock" },
            { id: "IN_STOCK", label: "In Stock" },
            { id: "LOW_STOCK", label: "Low Stock" },
            { id: "OUT_OF_STOCK", label: "Out of Stock" },
          ].map((tab) => {
            const isActive = activeStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button type="submit" size="xs" variant="outline" className="h-8 px-2.5 text-xs">
            Search
          </Button>
        </form>
      </div>

      {/* Canonical Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Boxes}
              title="No inventory records found"
              description="No catalog variants match your active filter criteria."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={data.items.length > 0 && selectedIds.length === data.items.length}
                    onChange={handleSelectAll}
                    className="rounded border-input text-primary focus:ring-0"
                  />
                </TableHead>
                <TableHead>Product / Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("on_hand")}
                >
                  <div className="flex items-center gap-1">
                    On Hand <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("reserved")}
                >
                  <div className="flex items-center gap-1">
                    Reserved <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("available")}
                >
                  <div className="flex items-center gap-1">
                    Available <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead>Alert Threshold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => {
                const isSelected = selectedIds.includes(item.variantId);
                return (
                  <TableRow
                    key={item.variantId}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.variantId)}
                        className="rounded border-input text-primary focus:ring-0"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.variantTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/inventory/${item.variantId}`}
                            className="font-medium text-foreground hover:text-primary transition-colors block truncate max-w-[200px]"
                          >
                            {item.productTitle}
                          </Link>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {item.variantTitle !== "Default Title" ? item.variantTitle : "Default"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {item.sku || "—"}
                    </TableCell>

                    <TableCell>
                      {item.stockStatus === "IN_STOCK" && (
                        <Badge variant="success" dot>In Stock</Badge>
                      )}
                      {item.stockStatus === "LOW_STOCK" && (
                        <Badge variant="warning" dot>Low Stock</Badge>
                      )}
                      {item.stockStatus === "OUT_OF_STOCK" && (
                        <Badge variant="error" dot>Out of Stock</Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-medium font-tabular text-foreground">{item.onHand}</TableCell>
                    <TableCell className="text-muted-foreground font-tabular">{item.reserved}</TableCell>
                    <TableCell className="font-semibold font-tabular text-foreground">{item.available}</TableCell>

                    <TableCell>
                      <button
                        onClick={() => {
                          setThresholdTarget(item);
                          setNewThreshold(item.lowStockThreshold);
                          setThresholdError(null);
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground group transition-colors text-xs font-tabular"
                        title="Click to edit threshold"
                      >
                        <span>{item.lowStockThreshold}</span>
                        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setAdjustTarget(item);
                            setAdjustDelta(0);
                            setAdjustError(null);
                          }}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          asChild
                          title="View Ledger History"
                        >
                          <Link href={`/dashboard/inventory/${item.variantId}`} prefetch={true}>
                            <History className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground font-tabular">{(data.page - 1) * data.pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground font-tabular">{Math.min(data.page * data.pageSize, data.totalCount)}</span> of{" "}
            <span className="font-medium text-foreground font-tabular">{data.totalCount}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={data.page <= 1 || isPending}
              onClick={() => updateQuery({ page: String(data.page - 1) })}
            >
              Previous
            </Button>
            <span className="font-mono text-[11px] font-tabular">
              {data.page} / {data.totalPages}
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => updateQuery({ page: String(data.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Single Adjustment Modal */}
      {adjustTarget && (
        <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
          <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Boxes className="h-4 w-4 text-primary" />
                Adjust Stock: {adjustTarget.productTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Variant: {adjustTarget.variantTitle} | SKU: {adjustTarget.sku || "N/A"}
              </DialogDescription>
            </DialogHeader>

            {adjustError && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-400">
                {adjustError}
              </div>
            )}

            <div className="space-y-3.5 py-2 text-xs">
              {/* Current Balances */}
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2.5 border border-border text-center">
                <div>
                  <span className="text-muted-foreground text-[10px] block uppercase font-medium">On Hand</span>
                  <span className="text-sm font-semibold text-foreground font-tabular">{adjustTarget.onHand}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block uppercase font-medium">Reserved</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 font-tabular">{adjustTarget.reserved}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block uppercase font-medium">Available</span>
                  <span className="text-sm font-bold text-foreground font-tabular">{adjustTarget.available}</span>
                </div>
              </div>

              {/* Delta Input */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Quantity Delta (+ to add, - to deduct)</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setAdjustDelta((prev) => prev - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                    className="h-8 text-center font-bold text-foreground font-tabular"
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setAdjustDelta((prev) => prev + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground text-center mt-1 font-tabular">
                  New Available:{" "}
                  <span className="font-semibold text-foreground">
                    {Math.max(0, adjustTarget.onHand + adjustDelta - adjustTarget.reserved)}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Adjustment Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as InventoryReason)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground"
                >
                  {INVENTORY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Reference / Note (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. PO-9842, Damaged in Transit, etc."
                  value={adjustRefId}
                  onChange={(e) => setAdjustRefId(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdjustTarget(null)}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSingleAdjustSubmit}
                disabled={isAdjusting || adjustDelta === 0}
              >
                {isAdjusting ? "Writing Ledger..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Adjustment Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Bulk Adjust {selectedIds.length} Variants
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Apply uniform stock adjustments across all selected items atomically.
            </DialogDescription>
          </DialogHeader>

          {bulkError && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-400">
              {bulkError}
            </div>
          )}

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-foreground">Delta Quantity (+/-)</label>
              <Input
                type="number"
                value={bulkDelta}
                onChange={(e) => setBulkDelta(parseInt(e.target.value) || 0)}
                placeholder="e.g. 50 or -10"
                className="h-8 font-tabular text-center text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Reason</label>
              <select
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value as InventoryReason)}
                className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground"
              >
                {INVENTORY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Reference ID</label>
              <Input
                type="text"
                placeholder="e.g. BULK-RESTOCK-2026"
                value={bulkRefId}
                onChange={(e) => setBulkRefId(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBulkModalOpen(false)}
              disabled={isBulkAdjusting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBulkAdjustSubmit}
              disabled={isBulkAdjusting || bulkDelta === 0}
            >
              {isBulkAdjusting ? "Executing..." : "Apply Bulk Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold Modal */}
      {thresholdTarget && (
        <Dialog open={!!thresholdTarget} onOpenChange={(open) => !open && setThresholdTarget(null)}>
          <DialogContent className="border-border bg-card text-card-foreground sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-foreground">Set Low Stock Alert</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Trigger low-stock warning when available units fall to or below:
              </DialogDescription>
            </DialogHeader>

            {thresholdError && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-700 dark:text-rose-400">
                {thresholdError}
              </div>
            )}

            <div className="py-2">
              <Input
                type="number"
                min={0}
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                className="h-8 text-center font-bold text-foreground text-sm font-tabular"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setThresholdTarget(null)}
                disabled={isSavingThreshold}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
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

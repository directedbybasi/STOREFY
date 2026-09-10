"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  ArrowLeft,
  History,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  adjustStockAction,
  updateInventoryThresholdAction,
  type InventoryReason,
  INVENTORY_REASONS,
} from "@/modules/inventory";

interface InventoryDetailClientProps {
  data: {
    variant: {
      id: string;
      productId: string;
      title: string;
      sku: string | null;
      barcode: string | null;
      imageUrl: string | null;
      price: number;
      costPrice: number | null;
      productTitle: string;
      productStatus: string;
      productSlug: string;
    };
    inventory: {
      id: string;
      onHand: number;
      reserved: number;
      available: number;
      incoming: number;
      lowStockThreshold: number;
      stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
      updatedAt: Date;
    };
    movements: Array<{
      id: string;
      quantityDelta: number;
      quantityBefore: number;
      quantityAfter: number;
      reason: string;
      referenceId: string | null;
      referenceType: string | null;
      createdBy: string | null;
      createdAt: Date;
    }>;
  };
}

export function InventoryDetailClient({ data }: InventoryDetailClientProps) {
  const router = useRouter();
  const { variant, inventory, movements } = data;

  // Adjustment form state
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<InventoryReason>("ADJUSTMENT");
  const refType = "MANUAL_ADJUSTMENT";
  const [refId, setRefId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Threshold form state
  const [threshold, setThreshold] = useState<number>(inventory.lowStockThreshold);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState(false);

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0) {
      setAdjustError("Adjustment quantity delta cannot be zero.");
      return;
    }

    setAdjustError(null);
    setIsAdjusting(true);
    try {
      await adjustStockAction({
        variantId: variant.id,
        quantityDelta: delta,
        reason,
        referenceType: refType || undefined,
        referenceId: refId || undefined,
        notes: notes || undefined,
      });

      setDelta(0);
      setRefId("");
      setNotes("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record stock adjustment";
      setAdjustError(msg);
    } finally {
      setIsAdjusting(false);
    }
  }

  async function handleThresholdSubmit(e: React.FormEvent) {
    e.preventDefault();
    setThresholdError(null);
    setThresholdSavedMsg(false);
    setIsSavingThreshold(true);

    try {
      await updateInventoryThresholdAction({
        variantId: variant.id,
        lowStockThreshold: threshold,
      });
      setThresholdSavedMsg(true);
      setTimeout(() => setThresholdSavedMsg(false), 3000);
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
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-slate-400 hover:text-white"
            asChild
          >
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Inventory
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-800" />
          <span className="text-xs text-slate-400 font-mono">SKU: {variant.sku || "N/A"}</span>
        </div>

        <div className="flex items-center gap-2">
          {inventory.stockStatus === "IN_STOCK" && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs py-1 px-3">
              <CheckCircle2 className="h-3 w-3 mr-1" /> In Stock
            </Badge>
          )}
          {inventory.stockStatus === "LOW_STOCK" && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-950/40 text-amber-300 text-xs py-1 px-3">
              <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
            </Badge>
          )}
          {inventory.stockStatus === "OUT_OF_STOCK" && (
            <Badge variant="outline" className="border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs py-1 px-3">
              <XCircle className="h-3 w-3 mr-1" /> Out of Stock
            </Badge>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0">
            {variant.imageUrl ? (
              <img src={variant.imageUrl} alt={variant.title} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-slate-600" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {variant.productTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Variant: <span className="text-slate-200 font-medium">{variant.title}</span> &bull; Product Status:{" "}
              <span className="text-emerald-400 font-medium">{variant.productStatus}</span>
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 text-xs text-slate-300 hover:text-white"
          asChild
        >
          <Link href={`/dashboard/products/${variant.productId}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            View Product
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">On Hand</span>
          <p className="text-2xl font-bold text-white mt-1">{inventory.onHand}</p>
          <span className="text-[10px] text-slate-500">Physical stock in warehouse</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reserved</span>
          <p className="text-2xl font-bold text-amber-300 mt-1">{inventory.reserved}</p>
          <span className="text-[10px] text-slate-500">Committed to active checkouts</span>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Available</span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{inventory.available}</p>
          <span className="text-[10px] text-emerald-500/80">Available = On Hand - Reserved</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Incoming</span>
          <p className="text-2xl font-bold text-indigo-300 mt-1">{inventory.incoming}</p>
          <span className="text-[10px] text-slate-500">Expected purchase orders</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stock Adjustment & Threshold Forms */}
        <div className="space-y-6">
          {/* Stock Adjustment Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="h-4 w-4 text-emerald-400" />
                Adjust Stock Balance
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Mutates stock atomically and writes an immutable record to the ledger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
                {adjustError && (
                  <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
                    {adjustError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-medium text-slate-300">Quantity Delta (+ or -)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-slate-700"
                      onClick={() => setDelta((prev) => prev - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={delta}
                      onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                      className="h-8 text-center font-bold text-white bg-slate-950 border-slate-800"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-slate-700"
                      onClick={() => setDelta((prev) => prev + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center">
                    Projected on-hand:{" "}
                    <span className="font-bold text-white">{Math.max(0, inventory.onHand + delta)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-slate-300">Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as InventoryReason)}
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
                    placeholder="e.g. PO-10294 or CYCLE-COUNT"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-slate-300">Notes (Audit Log)</label>
                  <Input
                    type="text"
                    placeholder="Optional details for audit trail..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                  disabled={isAdjusting || delta === 0}
                >
                  {isAdjusting ? "Writing Ledger..." : "Apply Adjustment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Low Stock Threshold Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Low Stock Threshold
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Trigger merchant warning when available inventory drops to or below:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleThresholdSubmit} className="space-y-3 text-xs">
                {thresholdError && (
                  <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2 text-xs text-rose-300">
                    {thresholdError}
                  </div>
                )}
                {thresholdSavedMsg && (
                  <div className="rounded-lg bg-emerald-950/50 border border-emerald-800 p-2 text-xs text-emerald-300">
                    Threshold updated successfully.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                    className="h-8 bg-slate-950 border-slate-800 text-white font-bold text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs bg-slate-800 text-white hover:bg-slate-700"
                    disabled={isSavingThreshold}
                  >
                    {isSavingThreshold ? "Saving..." : "Update"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Immutable Ledger Movements History */}
        <div className="lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/60 h-full">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-emerald-400" />
                    Immutable Movement Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Append-only audit trail. Historical movements are never overwritten.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                  {movements.length} Events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Delta</th>
                      <th className="p-3">Before &rarr; After</th>
                      <th className="p-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          <History className="h-6 w-6 mx-auto mb-2 opacity-30" />
                          No stock movements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const isPositive = m.quantityDelta > 0;
                        return (
                          <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-slate-400 whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px]">
                                {m.reason.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono font-bold">
                              <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                                {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {m.quantityBefore} &rarr; <span className="font-bold text-white">{m.quantityAfter}</span>
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">
                              {m.referenceId || m.referenceType || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

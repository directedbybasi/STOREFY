"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Package,
  Layers,
  Star,
  ExternalLink,
} from "lucide-react";
import { previewMeeshoProductAction, importMeeshoProductAction } from "@/modules/marketplaces/import/actions";
import type { ImportPreviewDTO } from "@/modules/marketplaces/import/types";
import { formatPaiseToRupees } from "@/lib/currency";

export default function MeeshoImportPage() {
  const router = useRouter();
  const [inputReference, setInputReference] = useState("3b2a1");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewDTO | null>(null);

  // Customization fields
  const [customTitle, setCustomTitle] = useState("");
  const [customPriceRupees, setCustomPriceRupees] = useState<number>(0);
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");

  const handleFetchPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputReference.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await previewMeeshoProductAction(inputReference.trim());
      setPreview(data);
      setCustomTitle(data.title);
      setCustomPriceRupees(Math.round(data.suggestedRetailPaise / 100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview product.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    setError(null);

    try {
      const retailPaise = Math.round(customPriceRupees * 100);
      const res = await importMeeshoProductAction(inputReference.trim(), {
        title: customTitle || preview.title,
        retailPricePaise: retailPaise,
        status,
      });

      setSuccess(
        res.isExisting
          ? `Product already imported! Found existing product ID: ${res.productId}`
          : `Successfully imported "${res.title}" with ${res.variantsCreated} variants!`
      );

      setTimeout(() => {
        router.push("/dashboard/meesho/products");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import product.");
    } finally {
      setImporting(false);
    }
  };

  // Live profit calculation
  const customRetailPaise = Math.round(customPriceRupees * 100);
  const sourceCostPaise = preview?.sourceCostPaise || 0;
  const estimatedProfitPaise = customRetailPaise - sourceCostPaise;
  const estimatedMarginPercent =
    customRetailPaise > 0
      ? Math.round((estimatedProfitPaise / customRetailPaise) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
        <Link href="/dashboard/meesho">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-400" />
            Import Meesho Product
          </h1>
          <p className="text-xs text-slate-400">
            Fetch wholesale product data by URL or product ID and customize pricing.
          </p>
        </div>
      </div>

      {/* Input Box */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="pt-6">
          <form onSubmit={handleFetchPreview} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Enter Meesho product URL or code (e.g. 3b2a1, 123456, 789xyz)"
                value={inputReference}
                onChange={(e) => setInputReference(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-9 py-2 text-xs text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !inputReference.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs whitespace-nowrap"
            >
              {loading ? "Fetching..." : "Fetch & Preview"}
            </Button>
          </form>

          {/* Quick sample chips */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Quick Samples:</span>
            {["3b2a1", "123456", "789xyz"].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setInputReference(sample);
                }}
                className="font-mono text-rose-400 hover:underline px-1.5 py-0.5 rounded bg-slate-800"
              >
                {sample}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[10px]">
                    Meesho Verified Source
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {preview.sourceProductId}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-white mt-2">
                  {preview.title}
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {preview.rating && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {preview.rating} ({preview.reviewCount} source reviews)
                    </span>
                  )}
                  {preview.categoryName && <span>• {preview.categoryName}</span>}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      preview.availability === "AVAILABLE"
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {preview.availability}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images Preview */}
                {preview.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {preview.images.map((img, i) => (
                      <div
                        key={i}
                        className="h-24 w-24 shrink-0 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden"
                      >
                        <img
                          src={img}
                          alt={`${preview.title} ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Description
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-800">
                    {preview.description || "No description provided by source."}
                  </p>
                </div>

                {/* Variants */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-rose-400" />
                    Source Variants ({preview.variants.length})
                  </h4>
                  <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Variant</th>
                          <th className="px-3 py-2">Wholesale Cost</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {preview.variants.map((v) => (
                          <tr key={v.sourceVariantId}>
                            <td className="px-3 py-2 font-medium text-white">{v.title}</td>
                            <td className="px-3 py-2 font-mono">{formatPaiseToRupees(v.sourceCostPaise)}</td>
                            <td className="px-3 py-2">
                              <span className={v.available ? "text-emerald-400" : "text-rose-400"}>
                                {v.available ? "In Stock" : "Out of Stock"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing & Import Settings */}
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/60 sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Reseller Pricing & Margins
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Set your retail selling price to calculate gross profit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wholesale Cost */}
                <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-slate-400">Meesho Wholesale Cost:</span>
                  <span className="font-mono font-bold text-white">
                    {formatPaiseToRupees(preview.sourceCostPaise)}
                  </span>
                </div>

                {/* Selling Price Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Store Selling Price (₹ INR):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">₹</span>
                    <input
                      type="number"
                      min={Math.ceil(preview.sourceCostPaise / 100)}
                      value={customPriceRupees}
                      onChange={(e) => setCustomPriceRupees(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Suggested markup: {formatPaiseToRupees(preview.suggestedRetailPaise)}
                  </p>
                </div>

                {/* Live Margin Calculation */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-300 font-medium">Estimated Profit:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatPaiseToRupees(estimatedProfitPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-emerald-400/80">
                    <span>Gross Margin:</span>
                    <span className="font-mono font-medium">{estimatedMarginPercent}%</span>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label className="text-xs text-slate-300 font-medium">Catalog Status:</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={status === "DRAFT" ? "default" : "outline"}
                      onClick={() => setStatus("DRAFT")}
                      className={`text-xs flex-1 ${
                        status === "DRAFT" ? "bg-slate-700 text-white" : "border-slate-800 text-slate-400"
                      }`}
                    >
                      Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={status === "ACTIVE" ? "default" : "outline"}
                      onClick={() => setStatus("ACTIVE")}
                      className={`text-xs flex-1 ${
                        status === "ACTIVE" ? "bg-emerald-600 text-white" : "border-slate-800 text-slate-400"
                      }`}
                    >
                      Active
                    </Button>
                  </div>
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={importing || customPriceRupees <= 0}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 mt-2"
                >
                  {importing ? "Importing..." : "Import Product to Store"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

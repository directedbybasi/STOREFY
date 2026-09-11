"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  AlertCircle,
  Check,
  Tag,
  FolderTree,
  ListPlus,
  Sliders,
  Type,
  AlignLeft,
} from "lucide-react";
import { generateAiSuggestionAction } from "@/modules/ai/actions";
import type { AiToolType, AttributeConfidence } from "@/modules/ai/core/types";

interface AiAssistantModalProps {
  tool: AiToolType;
  productId?: string;
  context: {
    currentTitle?: string;
    currentDescription?: string;
    currentCategoryName?: string;
    currentTags?: string[];
    brand?: string;
  };
  onApply: (value: unknown) => void;
  onClose: () => void;
}

type SuggestionPayload =
  | { suggestions: string[] }
  | { summary: string; paragraphs: string[]; bulletPoints: string[] }
  | { seoDescription: string }
  | { features: string[] }
  | { specifications: { name: string; value: string; confidence: AttributeConfidence }[] }
  | { tags: string[] }
  | { matchStatus: string; confidence?: number; suggestedCategoryId?: string | null; suggestedCategoryName?: string | null; path?: string | null }
  | null;

export function AiAssistantModal({
  tool,
  productId,
  context,
  onApply,
  onClose,
}: AiAssistantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionData, setSuggestionData] = useState<SuggestionPayload>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate on open if empty
  React.useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setCopied(false);

      const res = await generateAiSuggestionAction({
        productId,
        tool,
        context,
      });

      setRequestId(res.requestId);
      setSuggestionData(res.suggestion as SuggestionPayload);

      // Auto-select first item if titles
      if (tool === "AI_PRODUCT_TITLE" && res.suggestion) {
        const titles = (res.suggestion as { suggestions: string[] }).suggestions;
        if (titles && titles.length > 0) {
          setSelectedItem(titles[0]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate AI suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getToolTitle = () => {
    switch (tool) {
      case "AI_PRODUCT_TITLE":
        return "Generate Product Titles";
      case "AI_PRODUCT_DESCRIPTION":
        return "Generate Product Description";
      case "AI_SEO_DESCRIPTION":
        return "Generate SEO Meta Description";
      case "AI_PRODUCT_FEATURES":
        return "Generate Product Features";
      case "AI_PRODUCT_SPECIFICATIONS":
        return "Generate Technical Specifications";
      case "AI_PRODUCT_TAGS":
        return "Generate Product Tags";
      case "AI_CATEGORY_SUGGESTION":
        return "AI Category Suggestion";
    }
  };

  const getToolIcon = () => {
    switch (tool) {
      case "AI_PRODUCT_TITLE":
        return <Type className="h-5 w-5 text-indigo-400" />;
      case "AI_PRODUCT_DESCRIPTION":
        return <AlignLeft className="h-5 w-5 text-indigo-400" />;
      case "AI_SEO_DESCRIPTION":
        return <Sparkles className="h-5 w-5 text-indigo-400" />;
      case "AI_PRODUCT_FEATURES":
        return <ListPlus className="h-5 w-5 text-indigo-400" />;
      case "AI_PRODUCT_SPECIFICATIONS":
        return <Sliders className="h-5 w-5 text-indigo-400" />;
      case "AI_PRODUCT_TAGS":
        return <Tag className="h-5 w-5 text-indigo-400" />;
      case "AI_CATEGORY_SUGGESTION":
        return <FolderTree className="h-5 w-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl">
              {getToolIcon()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {getToolTitle()}
                <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Assistive AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AI generates suggestions based on your product data. Review and apply.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-mono p-1"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium animate-pulse">Generating suggestions with AI...</p>
            <p className="text-xs text-slate-500">Analyzing product context and attributes...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Generation Error</span>
            </div>
            <p className="text-xs text-rose-200">{error}</p>
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* 1. Title Tool View */}
            {tool === "AI_PRODUCT_TITLE" && suggestionData && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Select a title suggestion:
                </p>
                {(suggestionData as { suggestions: string[] }).suggestions.map((titleStr, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem(titleStr)}
                    className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition ${
                      selectedItem === titleStr
                        ? "bg-indigo-950/50 border-indigo-500 text-white shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-medium pr-4">{titleStr}</span>
                    {selectedItem === titleStr && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 2. Description Tool View */}
            {tool === "AI_PRODUCT_DESCRIPTION" && suggestionData && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <p className="font-semibold text-indigo-300">Summary:</p>
                  <p className="text-slate-300">{(suggestionData as { summary: string }).summary}</p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-400">Paragraphs:</p>
                  {(suggestionData as { paragraphs: string[] }).paragraphs.map((para, idx) => (
                    <p key={idx} className="p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-300">
                      {para}
                    </p>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-400">Key Bullet Points:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {(suggestionData as { bulletPoints: string[] }).bulletPoints.map((bp, idx) => (
                      <li key={idx}>{bp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 3. SEO Description Tool View */}
            {tool === "AI_SEO_DESCRIPTION" && suggestionData && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Generated Meta Description:
                </p>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-mono">
                  {(suggestionData as { seoDescription: string }).seoDescription}
                </div>
                <p className="text-[11px] text-slate-400 flex justify-between">
                  <span>Search Engine Meta Snippet</span>
                  <span>{(suggestionData as { seoDescription: string }).seoDescription.length} / 160 characters</span>
                </p>
              </div>
            )}

            {/* 4. Features Tool View */}
            {tool === "AI_PRODUCT_FEATURES" && suggestionData && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Extracted Features:
                </p>
                <div className="space-y-1.5">
                  {(suggestionData as { features: string[] }).features.map((feat, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Specifications Tool View */}
            {tool === "AI_PRODUCT_SPECIFICATIONS" && suggestionData && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Structured Specifications:
                </p>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 text-xs">
                  {(suggestionData as { specifications: { name: string; value: string; confidence: AttributeConfidence }[] }).specifications.map((spec, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">{spec.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{spec.value}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            spec.confidence === "SUPPORTED"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                              : spec.confidence === "INFERRED"
                              ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {spec.confidence}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Note: Values marked &quot;UNKNOWN&quot; will not be set as verified facts.
                </p>
              </div>
            )}

            {/* 6. Tags Tool View */}
            {tool === "AI_PRODUCT_TAGS" && suggestionData && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Generated Tags:
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  {(suggestionData as { tags: string[] }).tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Category Tool View */}
            {tool === "AI_CATEGORY_SUGGESTION" && suggestionData && (
              <div className="space-y-3 text-xs">
                {(suggestionData as { matchStatus: string }).matchStatus === "MATCHED" ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
                        Category Match Found
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold text-[10px]">
                        {Math.round(((suggestionData as { confidence: number }).confidence || 0) * 100)}% Confidence
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {(suggestionData as { suggestedCategoryName: string }).suggestedCategoryName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Category Path: {(suggestionData as { path: string }).path}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">No Confident Match</p>
                    <p>The AI could not confidently map this product to your current store categories. Please select a category manually.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>

            {suggestionData && (
              <button
                type="button"
                onClick={() => {
                  let copyText = "";
                  if (tool === "AI_PRODUCT_TITLE") copyText = selectedItem || "";
                  else if (tool === "AI_SEO_DESCRIPTION") copyText = (suggestionData as { seoDescription: string }).seoDescription;
                  else if (tool === "AI_PRODUCT_DESCRIPTION") {
                    const d = suggestionData as { summary: string; paragraphs: string[]; bulletPoints: string[] };
                    copyText = `${d.summary}\n\n${d.paragraphs.join("\n\n")}\n\nKey Points:\n${d.bulletPoints.map((b) => `- ${b}`).join("\n")}`;
                  } else if (tool === "AI_PRODUCT_TAGS") copyText = (suggestionData as { tags: string[] }).tags.join(", ");
                  else copyText = JSON.stringify(suggestionData, null, 2);
                  handleCopy(copyText);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading || !suggestionData}
              onClick={() => {
                if (tool === "AI_PRODUCT_TITLE") {
                  onApply(selectedItem);
                } else if (tool === "AI_SEO_DESCRIPTION") {
                  onApply((suggestionData as { seoDescription: string }).seoDescription);
                } else if (tool === "AI_PRODUCT_DESCRIPTION") {
                  const d = suggestionData as { summary: string; paragraphs: string[]; bulletPoints: string[] };
                  const formatted = `${d.summary}\n\n${d.paragraphs.join("\n\n")}\n\nKey Highlights:\n${d.bulletPoints.map((b) => `• ${b}`).join("\n")}`;
                  onApply(formatted);
                } else if (tool === "AI_PRODUCT_FEATURES") {
                  onApply((suggestionData as { features: string[] }).features);
                } else if (tool === "AI_PRODUCT_SPECIFICATIONS") {
                  onApply((suggestionData as { specifications: unknown[] }).specifications);
                } else if (tool === "AI_PRODUCT_TAGS") {
                  onApply((suggestionData as { tags: string[] }).tags);
                } else if (tool === "AI_CATEGORY_SUGGESTION") {
                  const cat = suggestionData as { suggestedCategoryId: string | null; matchStatus: string };
                  if (cat.matchStatus === "MATCHED" && cat.suggestedCategoryId) {
                    onApply(cat.suggestedCategoryId);
                  }
                }
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Apply to Field</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

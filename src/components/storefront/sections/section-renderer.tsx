"use client";

import React from "react";
import Link from "next/link";
import type { SectionNode, BlockNode } from "@/modules/builder/schema";
import { interpolateBindings, type BindingContext } from "@/modules/builder/bindings";
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Star,
  CheckCircle2,
  ChevronDown,
  Mail,
  Play,
  Clock,
} from "lucide-react";

interface SectionRendererProps {
  section: SectionNode;
  isBuilder?: boolean;
  isSelected?: boolean;
  selectedBlockId?: string;
  onSelectSection?: (id: string) => void;
  onSelectBlock?: (id: string) => void;
  context?: BindingContext;
}

export function SectionRenderer({
  section,
  isBuilder = false,
  isSelected = false,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  context = {},
}: SectionRendererProps) {
  if (section.isHidden && !isBuilder) {
    return null;
  }

  const { type, settings, blocks } = section;

  const handleSectionClick = (e: React.MouseEvent) => {
    if (isBuilder && onSelectSection) {
      e.stopPropagation();
      onSelectSection(section.id);
    }
  };

  const handleBlockClick = (e: React.MouseEvent, blockId: string) => {
    if (isBuilder && onSelectBlock) {
      e.stopPropagation();
      onSelectBlock(blockId);
    }
  };

  const t = (val: unknown) => {
    if (typeof val === "string") return interpolateBindings(val, context);
    if (val === undefined || val === null) return "";
    return interpolateBindings(String(val), context);
  };

  // Render individual block helper
  const renderBlock = (block: BlockNode) => {
    if (block.isHidden && !isBuilder) return null;
    const isBlockSelected = selectedBlockId === block.id;

    const blockWrapperClass = isBuilder
      ? `relative transition cursor-pointer ${
          isBlockSelected
            ? "ring-2 ring-[var(--store-accent,#2563eb)] rounded"
            : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400"
        }`
      : "";

    let content: React.ReactNode = null;

    switch (block.type) {
      case "heading": {
        const level = (block.settings.level as string) || "h2";
        const text = t(block.settings.text || "Heading");
        const className = `font-extrabold tracking-tight text-[var(--store-text,#0f172a)] font-heading ${
          level === "h1" ? "text-4xl sm:text-5xl md:text-6xl leading-tight" : "text-2xl sm:text-3xl"
        }`;
        content = level === "h1" ? <h1 className={className}>{text}</h1> : <h2 className={className}>{text}</h2>;
        break;
      }
      case "text": {
        content = (
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            {t(block.settings.text || "Content description.")}
          </p>
        );
        break;
      }
      case "button": {
        const label = t(block.settings.label || "Click Here");
        const url = (block.settings.url as string) || "#";
        const variant = (block.settings.variant as string) || "primary";
        content = (
          <Link
            href={isBuilder ? "#" : url}
            onClick={(e) => isBuilder && e.preventDefault()}
            className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition shadow-sm ${
              variant === "outline"
                ? "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                : "bg-[var(--store-primary,#0f172a)] text-white hover:opacity-90"
            }`}
          >
            <span>{label}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        );
        break;
      }
      case "image": {
        const url = (block.settings.url as string) || "/placeholder-store.png";
        const alt = (block.settings.alt as string) || "Store Image";
        content = (
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 max-h-96 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="w-full h-full object-cover" />
          </div>
        );
        break;
      }
      case "testimonial": {
        const quote = t(block.settings.quote || "Outstanding service!");
        const author = t(block.settings.author || "Satisfied Customer");
        const rating = typeof block.settings.rating === "number" ? block.settings.rating : 5;
        content = (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: rating }).map((_, idx) => (
                <Star key={idx} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{author}</span>
              {Boolean(block.settings.verified) && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified Buyer</span>
                </span>
              )}
            </div>
          </div>
        );
        break;
      }
      case "faq_item": {
        const question = t(block.settings.question || "Frequently Asked Question");
        const answer = t(block.settings.answer || "Detailed answer information.");
        content = (
          <details className="group border border-slate-200 rounded-xl bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-slate-900 font-semibold text-base">
              <span>{question}</span>
              <ChevronDown className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180 text-slate-500" />
            </summary>
            <p className="mt-4 leading-relaxed text-sm text-slate-600">{answer}</p>
          </details>
        );
        break;
      }
      case "feature": {
        const title = t(block.settings.title || "Feature Highlight");
        const description = t(block.settings.description || "Feature description details.");
        content = (
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="p-3 w-fit rounded-lg bg-slate-100 text-[var(--store-primary,#0f172a)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">{title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          </div>
        );
        break;
      }
      default:
        content = <div className="text-xs text-slate-400 p-2">[{block.type} Block]</div>;
    }

    return (
      <div
        key={block.id}
        className={blockWrapperClass}
        onClick={(e) => handleBlockClick(e, block.id)}
      >
        {content}
      </div>
    );
  };

  // Section Outer Shell
  const sectionWrapperClass = `relative w-full transition ${
    isBuilder
      ? `cursor-pointer ${
          isSelected
            ? "outline outline-2 outline-[var(--store-primary,#0f172a)] shadow-md z-10"
            : "hover:outline hover:outline-1 hover:outline-slate-300"
        }`
      : ""
  }`;

  return (
    <section
      id={`section-${section.id}`}
      className={sectionWrapperClass}
      onClick={handleSectionClick}
      style={{
        paddingTop: (settings.paddingTop as string) || "48px",
        paddingBottom: (settings.paddingBottom as string) || "48px",
        backgroundColor: (settings.backgroundColor as string) || "transparent",
      }}
    >
      {isBuilder && (
        <div className="absolute top-2 left-2 z-20 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
          {section.name || section.type}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Render content based on section type */}
        {type === "hero" && (
          <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/80 p-8 sm:p-12 md:p-16 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
              {blocks.map(renderBlock)}
            </div>
          </div>
        )}

        {type === "image_text" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {blocks.map(renderBlock)}
          </div>
        )}

        {type === "rich_text" && (
          <div className="max-w-3xl mx-auto text-center space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}

        {type === "multicolumn" && (
          <div className="space-y-6">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {type === "testimonials" && (
          <div className="space-y-6">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {type === "faq" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="space-y-3">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {type === "featured_collection" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                {blocks.map(renderBlock)}
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--store-accent,#2563eb)] hover:underline"
              >
                <span>View catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Catalog placeholder */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Catalog items configured in Phase 6 will appear here.</p>
            </div>
          </div>
        )}

        {type === "product_grid" && (
          <div className="space-y-6">
            {blocks.map(renderBlock)}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Live merchandise grid activates in Phase 6.</p>
            </div>
          </div>
        )}

        {type === "collection_grid" && (
          <div className="space-y-6">
            {blocks.map(renderBlock)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {["New Arrivals", "Best Sellers", "Seasonal Specials"].map((cat, i) => (
                <div key={i} className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                  <h4 className="font-bold text-slate-900">{cat}</h4>
                  <p className="text-xs text-slate-500">Collection</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "announcement_bar" && (
          <div className="text-center text-sm font-medium text-slate-800">
            {t(settings.text || "Special promotion available!")}
          </div>
        )}

        {type === "newsletter" && (
          <div className="max-w-xl mx-auto text-center space-y-4 p-8 rounded-2xl bg-slate-50 border border-slate-200">
            <Mail className="mx-auto h-8 w-8 text-[var(--store-primary,#0f172a)]" />
            {blocks.map(renderBlock)}
            <div className="flex gap-2 max-w-md mx-auto pt-2">
              <input
                type="email"
                placeholder="Enter your email"
                disabled
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              />
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-sm font-medium"
              >
                Subscribe
              </button>
            </div>
          </div>
        )}

        {type === "promo_banner" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8 text-center space-y-3">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
              {t(settings.couponCode || "PROMO")}
            </span>
            {blocks.map(renderBlock)}
          </div>
        )}

        {type === "countdown" && (
          <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 text-center space-y-6">
            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-widest">
              <Clock className="h-4 w-4" />
              <span>Limited Time Drop</span>
            </div>
            {blocks.map(renderBlock)}
            <div className="flex items-center justify-center gap-4 text-center">
              {[
                { label: "Hours", val: "23" },
                { label: "Mins", val: "59" },
                { label: "Secs", val: "45" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-800 rounded-xl min-w-[70px]">
                  <span className="text-2xl sm:text-3xl font-bold font-mono">{item.val}</span>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "video" && (
          <div className="rounded-2xl overflow-hidden bg-slate-900 text-white p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center mx-auto cursor-pointer transition">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
            {blocks.map(renderBlock)}
          </div>
        )}

        {type === "cta" && (
          <div className="rounded-2xl bg-[var(--store-primary,#0f172a)] text-white p-8 sm:p-12 text-center space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* Fallback for other standard sections */}
        {!["hero", "image_text", "rich_text", "multicolumn", "testimonials", "faq", "featured_collection", "product_grid", "collection_grid", "announcement_bar", "newsletter", "promo_banner", "countdown", "video", "cta"].includes(type) && (
          <div className="space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}
      </div>
    </section>
  );
}

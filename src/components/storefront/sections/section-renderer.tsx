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
  ShieldCheck,
  Truck,
  Banknote,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Phone,
  MapPin,
  Award,
} from "lucide-react";

interface SectionRendererProps {
  section: SectionNode;
  isBuilder?: boolean;
  isSelected?: boolean;
  selectedBlockId?: string;
  onSelectSection?: (id: string) => void;
  onSelectBlock?: (id: string) => void;
  onInlineUpdateBlock?: (sectionId: string, blockId: string, field: string, value: string) => void;
  context?: BindingContext;
}

export function SectionRenderer({
  section,
  isBuilder = false,
  isSelected = false,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onInlineUpdateBlock,
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

  const handleInlineBlur = (blockId: string, field: string, e: React.FocusEvent<HTMLElement>) => {
    if (isBuilder && onInlineUpdateBlock) {
      const text = e.currentTarget.innerText.trim();
      onInlineUpdateBlock(section.id, blockId, field, text);
    }
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
        const rawText = (block.settings.text as string) || "Heading";
        const text = t(rawText);
        const className = `font-extrabold tracking-tight text-[var(--store-text,#0f172a)] font-heading ${
          level === "h1" ? "text-4xl sm:text-5xl md:text-6xl leading-tight" : "text-2xl sm:text-3xl"
        }`;

        content = (
          <div
            contentEditable={isBuilder}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleInlineBlur(block.id, "text", e)}
            className={className}
          >
            {text}
          </div>
        );
        break;
      }

      case "text": {
        const rawText = (block.settings.text as string) || "Content description.";
        content = (
          <p
            contentEditable={isBuilder}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleInlineBlur(block.id, "text", e)}
            className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed outline-none"
          >
            {t(rawText)}
          </p>
        );
        break;
      }

      case "rich_text": {
        const rawContent = (block.settings.content as string) || "Rich text narrative highlighting store value.";
        content = (
          <div
            contentEditable={isBuilder}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleInlineBlur(block.id, "content", e)}
            className="prose max-w-none text-slate-700 leading-relaxed outline-none"
          >
            {t(rawContent)}
          </div>
        );
        break;
      }

      case "button": {
        const rawLabel = (block.settings.label as string) || "Click Here";
        const label = t(rawLabel);
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
            <span
              contentEditable={isBuilder}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleInlineBlur(block.id, "label", e)}
              className="outline-none"
            >
              {label}
            </span>
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

      case "icon": {
        content = (
          <div className="p-3 w-fit rounded-lg bg-slate-100 text-[var(--store-primary,#0f172a)]">
            <Sparkles className="h-6 w-6" />
          </div>
        );
        break;
      }

      case "product": {
        const rawTitle = (block.settings.title as string) || "{{ product.title }}";
        const rawPrice = (block.settings.price as string) || "{{ product.price }}";
        const title = t(rawTitle) === rawTitle && rawTitle.includes("{{") ? "Featured Product" : t(rawTitle);
        const price = t(rawPrice) === rawPrice && rawPrice.includes("{{") ? "₹999.00" : t(rawPrice);
        const image = (block.settings.image as string) || null;
        content = (
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-full h-36 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {image ? (
                <img src={image} alt={title} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800 truncate block">{title}</span>
              <p className="text-xs font-bold text-slate-900 font-mono">{price}</p>
            </div>
          </div>
        );
        break;
      }

      case "collection": {
        const rawTitle = (block.settings.title as string) || "{{ collection.title }}";
        const rawDesc = (block.settings.description as string) || "{{ collection.description }}";
        const title = t(rawTitle) === rawTitle && rawTitle.includes("{{") ? "Featured Collection" : t(rawTitle);
        const desc = t(rawDesc) === rawDesc && rawDesc.includes("{{") ? "Curated Grouping" : t(rawDesc);
        content = (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
            <h4 className="font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        );
        break;
      }

      case "price": {
        const price = block.settings.price ?? 1499;
        const compareAtPrice = block.settings.compareAtPrice;
        content = (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">₹{String(price)}</span>
            {compareAtPrice ? (
              <span className="text-sm line-through text-slate-400">₹{String(compareAtPrice)}</span>
            ) : null}
          </div>
        );
        break;
      }

      case "rating": {
        const rating = typeof block.settings.rating === "number" ? block.settings.rating : 5;
        const reviewCount = block.settings.reviewCount ?? 42;
        content = (
          <div className="flex items-center gap-1 text-amber-400">
            {Array.from({ length: rating }).map((_, idx) => (
              <Star key={idx} className="h-4 w-4 fill-amber-400" />
            ))}
            <span className="text-xs text-slate-600 font-medium ml-1">({String(reviewCount)} reviews)</span>
          </div>
        );
        break;
      }

      case "social_link": {
        const platform = (block.settings.platform as string) || "instagram";
        const url = (block.settings.url as string) || "#";
        content = (
          <Link
            href={isBuilder ? "#" : url}
            onClick={(e) => isBuilder && e.preventDefault()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            {platform === "instagram" && <Instagram className="h-3.5 w-3.5 text-pink-600" />}
            {platform === "facebook" && <Facebook className="h-3.5 w-3.5 text-blue-600" />}
            {platform === "twitter" && <Twitter className="h-3.5 w-3.5 text-sky-500" />}
            {platform === "youtube" && <Youtube className="h-3.5 w-3.5 text-red-600" />}
            {platform === "whatsapp" && <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
            <span className="capitalize">{platform}</span>
          </Link>
        );
        break;
      }

      case "feature": {
        const title = t(block.settings.title || "Feature Highlight");
        const description = t(block.settings.description || "Feature description details.");
        const icon = block.settings.icon as string;
        content = (
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="p-3 w-fit rounded-lg bg-slate-100 text-[var(--store-primary,#0f172a)]">
              {icon === "truck" ? (
                <Truck className="h-6 w-6" />
              ) : icon === "banknote" ? (
                <Banknote className="h-6 w-6" />
              ) : icon === "shield" ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>
            <h4 className="font-bold text-slate-900 text-base">{title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
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

      case "video": {
        content = (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center text-white">
            <Play className="h-10 w-10 fill-white" />
          </div>
        );
        break;
      }

      case "spacer": {
        const height = (block.settings.height as string) || "32px";
        content = <div style={{ height }} className={isBuilder ? "bg-slate-100/50 border border-dashed border-slate-300" : ""} />;
        break;
      }

      case "divider": {
        content = <hr className="my-4 border-slate-200" />;
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

      case "badge": {
        const label = t(block.settings.label || "Verified Trust");
        content = (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-800">
            <Award className="h-4 w-4 text-emerald-600" />
            <span>{label}</span>
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
        {/* HERO */}
        {type === "hero" && (
          <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/80 p-8 sm:p-12 md:p-16 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
              {blocks.map(renderBlock)}
            </div>
          </div>
        )}

        {/* HERO WITH IMAGE */}
        {type === "hero_image" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6">{blocks.filter((b) => b.type !== "image").map(renderBlock)}</div>
            <div>{blocks.filter((b) => b.type === "image").map(renderBlock)}</div>
          </div>
        )}

        {/* HERO WITH VIDEO */}
        {type === "hero_video" && (
          <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 text-white p-8 sm:p-16 text-center space-y-6">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
              {blocks.map(renderBlock)}
            </div>
          </div>
        )}

        {/* IMAGE WITH TEXT */}
        {type === "image_text" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* RICH TEXT */}
        {type === "rich_text" && (
          <div className="max-w-3xl mx-auto text-center space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* FEATURE GRID / MULTICOLUMN */}
        {(type === "feature_grid" || type === "multicolumn") && (
          <div className="space-y-6">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {/* IMAGE GALLERY */}
        {type === "image_gallery" && (
          <div className="space-y-6">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {/* TESTIMONIALS */}
        {type === "testimonials" && (
          <div className="space-y-6">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {/* TRUST BADGES */}
        {type === "trust_badges" && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {blocks.map(renderBlock)}
            </div>
          </div>
        )}

        {/* CUSTOMER REVIEWS */}
        {type === "reviews" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              {blocks.filter((b) => b.type === "heading").map(renderBlock)}
              {blocks.filter((b) => b.type === "rating").map(renderBlock)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blocks.filter((b) => b.type === "testimonial").map(renderBlock)}
            </div>
          </div>
        )}

        {/* FAQ */}
        {type === "faq" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="space-y-3">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {/* FEATURED COLLECTION */}
        {type === "featured_collection" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">{blocks.map(renderBlock)}</div>
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

        {/* PRODUCT GRID */}
        {type === "product_grid" && (
          <div className="space-y-6">
            {blocks.map(renderBlock)}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50 space-y-2">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Live merchandise grid activates in Phase 6.</p>
            </div>
          </div>
        )}

        {/* COLLECTION GRID */}
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

        {/* ANNOUNCEMENT BAR */}
        {type === "announcement_bar" && (
          <div className="text-center text-sm font-medium text-slate-800">
            {t(settings.text || "Special promotion available!")}
          </div>
        )}

        {/* NEWSLETTER */}
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

        {/* PROMO BANNER */}
        {type === "promo_banner" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8 text-center space-y-3">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
              {t(settings.couponCode || "PROMO")}
            </span>
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* COUNTDOWN */}
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

        {/* VIDEO */}
        {type === "video" && (
          <div className="rounded-2xl overflow-hidden bg-slate-900 text-white p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center mx-auto cursor-pointer transition">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* CTA */}
        {type === "cta" && (
          <div className="rounded-2xl bg-[var(--store-primary,#0f172a)] text-white p-8 sm:p-12 text-center space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}

        {/* CONTACT */}
        {type === "contact" && (
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 text-center">
            {blocks.filter((b) => b.type === "heading" || b.type === "text").map(renderBlock)}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>Customer Care</span>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>Pan-India Fulfillment</span>
              </div>
            </div>
            {blocks.filter((b) => b.type === "button" || b.type === "social_link").map(renderBlock)}
          </div>
        )}

        {/* LOGO LIST */}
        {type === "logo_list" && (
          <div className="space-y-4 text-center">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="flex flex-wrap items-center justify-center gap-8 py-4 opacity-70">
              {["VOGUE", "FORBES", "GQ", "ELLE", "TECHCRUNCH"].map((brand, i) => (
                <span key={i} className="text-xl font-bold tracking-widest text-slate-400 font-serif">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SOCIAL LINKS */}
        {type === "social_links" && (
          <div className="text-center space-y-4">
            {blocks.filter((b) => b.type === "heading").map(renderBlock)}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {blocks.filter((b) => b.type !== "heading").map(renderBlock)}
            </div>
          </div>
        )}

        {/* Fallback for other arbitrary custom sections */}
        {![
          "hero",
          "hero_image",
          "hero_video",
          "image_text",
          "rich_text",
          "feature_grid",
          "multicolumn",
          "image_gallery",
          "testimonials",
          "trust_badges",
          "reviews",
          "faq",
          "featured_collection",
          "product_grid",
          "collection_grid",
          "announcement_bar",
          "newsletter",
          "promo_banner",
          "countdown",
          "video",
          "cta",
          "contact",
          "logo_list",
          "social_links",
        ].includes(type) && (
          <div className="space-y-4">
            {blocks.map(renderBlock)}
          </div>
        )}
      </div>
    </section>
  );
}

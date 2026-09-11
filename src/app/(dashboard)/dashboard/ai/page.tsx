import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getAiUsageSummaryAction } from "@/modules/ai/actions";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Type,
  AlignLeft,
  ListPlus,
  Tag,
  FolderTree,
} from "lucide-react";

export const metadata = {
  title: "AI Product Intelligence — STOREFY",
  description: "Monitor AI tool usage, daily quotas, and product intelligence activity.",
};

export default async function AiDashboardPage() {
  await requirePermission("catalog:read");
  const metrics = await getAiUsageSummaryAction();

  const successRate =
    metrics.thisMonth.requests > 0
      ? Math.round((metrics.thisMonth.success / metrics.thisMonth.requests) * 100)
      : 100;

  const tools = [
    {
      id: "AI_PRODUCT_TITLE",
      name: "AI Product Title",
      icon: <Type className="h-4 w-4 text-indigo-400" />,
      desc: "Generates high-converting, factual product title suggestions.",
    },
    {
      id: "AI_PRODUCT_DESCRIPTION",
      name: "AI Product Description",
      icon: <AlignLeft className="h-4 w-4 text-indigo-400" />,
      desc: "Creates structured paragraphs and bullet-point selling highlights.",
    },
    {
      id: "AI_SEO_DESCRIPTION",
      name: "AI SEO Description",
      icon: <Sparkles className="h-4 w-4 text-indigo-400" />,
      desc: "Generates concise, non-spammy meta descriptions under 160 chars.",
    },
    {
      id: "AI_PRODUCT_FEATURES",
      name: "AI Product Features",
      icon: <ListPlus className="h-4 w-4 text-indigo-400" />,
      desc: "Extracts key benefits and functional highlights from verified data.",
    },
    {
      id: "AI_PRODUCT_SPECIFICATIONS",
      name: "AI Product Specifications",
      icon: <Sliders className="h-4 w-4 text-indigo-400" />,
      desc: "Structures technical attributes with strict confidence ratings.",
    },
    {
      id: "AI_PRODUCT_TAGS",
      name: "AI Product Tags",
      icon: <Tag className="h-4 w-4 text-indigo-400" />,
      desc: "Suggests clean, search-friendly e-commerce tags.",
    },
    {
      id: "AI_CATEGORY_SUGGESTION",
      name: "AI Category Suggestion",
      icon: <FolderTree className="h-4 w-4 text-indigo-400" />,
      desc: "Maps products accurately to existing categories in your store.",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 bg-indigo-950/70 border border-indigo-500/30 rounded-xl">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <span>AI Product Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assistive product-intelligence tools to enhance your catalog titles, descriptions, SEO, and specifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center gap-2 text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Daily Quota: <strong className="text-white">{metrics.today.requests}</strong> / {metrics.today.quotaLimit}
            </span>
          </div>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Requests */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Requests Today</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-white">{metrics.today.requests}</p>
            <span className="text-[11px] text-slate-500">{metrics.today.tokens.toLocaleString()} tokens</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (metrics.today.requests / metrics.today.quotaLimit) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Monthly Requests */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Requests This Month</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-white">{metrics.thisMonth.requests}</p>
            <span className="text-[11px] text-emerald-400">{metrics.thisMonth.success} successful</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics.thisMonth.tokens.toLocaleString()} total tokens consumed
          </p>
        </div>

        {/* Success Rate */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Generation Success Rate</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-400">{successRate}%</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics.thisMonth.failures} failed or rejected requests
          </p>
        </div>

        {/* Active Tools */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Intelligence Tools</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-white">7 Tools</p>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
              Assistive
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Integrated directly into Product Editor</p>
        </div>
      </div>

      {/* Available Tools Catalog */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Supported Product Intelligence Tools</span>
          <span className="text-xs font-normal text-slate-400">(Strictly Whitelisted)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <div
              key={t.id}
              className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">{t.icon}</div>
                <div>
                  <h3 className="text-xs font-bold text-white">{t.name}</h3>
                  <span className="text-[10px] font-mono text-slate-500">{t.id}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-400" />
          <span>Recent AI Activity</span>
        </h2>

        {metrics.recentActivity.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No AI generation requests recorded yet. Open any product in your catalog to start using AI tools.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-xs">
            {metrics.recentActivity.map((act) => (
              <div key={act.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      act.status === "SUCCEEDED" ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-white">{act.tool}</p>
                    <p className="text-[10px] font-mono text-slate-500">{act.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      act.status === "SUCCEEDED"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {act.status}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(act.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

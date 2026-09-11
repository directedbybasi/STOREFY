import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getAiUsageSummaryAction } from "@/modules/ai/actions";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Sliders,
  Type,
  AlignLeft,
  ListPlus,
  Tag,
  FolderTree,
  Clock,
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
      icon: <Type className="h-3.5 w-3.5 text-primary" />,
      desc: "Generates high-converting, factual product title suggestions.",
    },
    {
      id: "AI_PRODUCT_DESCRIPTION",
      name: "AI Product Description",
      icon: <AlignLeft className="h-3.5 w-3.5 text-primary" />,
      desc: "Creates structured paragraphs and bullet-point selling highlights.",
    },
    {
      id: "AI_SEO_DESCRIPTION",
      name: "AI SEO Description",
      icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
      desc: "Generates concise, non-spammy meta descriptions under 160 chars.",
    },
    {
      id: "AI_PRODUCT_FEATURES",
      name: "AI Product Features",
      icon: <ListPlus className="h-3.5 w-3.5 text-primary" />,
      desc: "Extracts key benefits and functional highlights from verified data.",
    },
    {
      id: "AI_PRODUCT_SPECIFICATIONS",
      name: "AI Product Specifications",
      icon: <Sliders className="h-3.5 w-3.5 text-primary" />,
      desc: "Structures technical attributes with strict confidence ratings.",
    },
    {
      id: "AI_PRODUCT_TAGS",
      name: "AI Product Tags",
      icon: <Tag className="h-3.5 w-3.5 text-primary" />,
      desc: "Suggests clean, search-friendly e-commerce tags.",
    },
    {
      id: "AI_CATEGORY_SUGGESTION",
      name: "AI Category Suggestion",
      icon: <FolderTree className="h-3.5 w-3.5 text-primary" />,
      desc: "Maps products accurately to existing categories in your store.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Product Intelligence"
        description="Assistive tools to enhance catalog titles, descriptions, SEO metadata, and product attributes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "AI Intelligence" },
        ]}
        actions={
          <div className="px-3 py-1 rounded-lg border border-border bg-card text-xs flex items-center gap-1.5 text-muted-foreground font-tabular">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Daily Quota: <strong className="text-foreground">{metrics.today.requests}</strong> / {metrics.today.quotaLimit}
            </span>
          </div>
        }
      />

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today's Requests"
          value={metrics.today.requests}
          helpText={`${metrics.today.tokens.toLocaleString()} tokens utilized`}
          icon={<Zap className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Monthly Requests"
          value={metrics.thisMonth.requests}
          helpText={`${metrics.thisMonth.success} successful`}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          helpText={`${metrics.thisMonth.failures} rejected / failed`}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Active Assistants"
          value="7 Tools"
          helpText="Integrated in Product Editor"
          icon={<Sliders className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Available Tools Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Integrated Intelligence Tools</h2>
          <span className="text-xs text-muted-foreground">Deterministic whitelist</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <Card key={t.id} className="p-4 space-y-2 hover:border-border/80 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted border border-border">{t.icon}</div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground">{t.name}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Recent AI Activity
          </CardTitle>
          <CardDescription>Audit stream of recent generation invocations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.recentActivity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No AI generation requests recorded yet. Open any product in your catalog to use assistive suggestions.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {metrics.recentActivity.map((act) => (
                <div key={act.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        act.status === "SUCCEEDED" ? "bg-emerald-500" : "bg-destructive"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-foreground">{act.tool}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{act.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Badge variant={act.status === "SUCCEEDED" ? "success" : "error"} dot>
                      {act.status}
                    </Badge>
                    <span className="text-muted-foreground text-[11px] font-tabular">
                      {new Date(act.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

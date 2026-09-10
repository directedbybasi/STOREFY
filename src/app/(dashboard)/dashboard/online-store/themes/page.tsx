import React from "react";
import Link from "next/link";
import { requirePermission } from "@/core/tenant/rbac";
import { db } from "@/database/client";
import { storeThemes, themeVersions } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  Palette,
  ExternalLink,
  Sparkles,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Monitor,
} from "lucide-react";

export default async function ThemesHubPage() {
  const ctx = await requirePermission("builder:read");

  // 1. Fetch active theme
  let [activeTheme] = await db
    .select()
    .from(storeThemes)
    .where(and(eq(storeThemes.storeId, ctx.store.id), eq(storeThemes.isActive, true)))
    .limit(1);

  if (!activeTheme) {
    [activeTheme] = await db
      .insert(storeThemes)
      .values({
        storeId: ctx.store.id,
        name: `${ctx.store.name} Standard Theme`,
        isActive: true,
        version: 1,
      })
      .returning();
  }

  // 2. Fetch recent versions
  const recentVersions = await db
    .select()
    .from(themeVersions)
    .where(eq(themeVersions.storeId, ctx.store.id))
    .orderBy(desc(themeVersions.versionNumber))
    .limit(5);

  const storefrontUrl = ctx.store.customDomain
    ? `https://${ctx.store.customDomain}`
    : `/${ctx.store.subdomain}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Themes</h1>
          <p className="text-sm text-slate-500">
            Manage and visually customize the layout, typography, and styling of your online storefront.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs"
          >
            <span>View Storefront</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>

          <Link
            href="/dashboard/online-store/themes/customizer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-xs font-semibold hover:opacity-90 transition shadow-sm"
          >
            <Palette className="h-4 w-4" />
            <span>Open Customizer</span>
          </Link>
        </div>
      </div>

      {/* Active Theme Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Current Live Theme</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{activeTheme.name}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Version v{activeTheme.version}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Updated {new Date(activeTheme.updatedAt).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard/online-store/themes/customizer"
              className="w-full md:w-auto text-center px-6 py-2.5 rounded-xl bg-[var(--store-primary,#0f172a)] text-white text-sm font-semibold hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>Customize</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Visual Preview Graphic */}
        <div className="bg-slate-50/70 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="p-2 w-fit rounded-lg bg-indigo-50 text-indigo-600">
              <Monitor className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Responsive Engine</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Theme automatically optimizes across Desktop, Tablet, and Smartphone viewports.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Shopify-Style Hierarchy</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Structured Section & Block AST architecture ensures zero brittle code generation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="p-2 w-fit rounded-lg bg-amber-50 text-amber-600">
              <History className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Immutable Revisions</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every publication creates an audit snapshot with instant one-click rollback.
            </p>
          </div>
        </div>
      </div>

      {/* Revision History Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Publications</h3>
          </div>
          <Link
            href="/dashboard/online-store/themes/customizer"
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Manage in Customizer &rarr;
          </Link>
        </div>

        {recentVersions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No published revisions recorded yet. Revisions are created each time you publish from the customizer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentVersions.map((v) => (
              <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">Version v{v.versionNumber}</span>
                  <span className="text-slate-600">{v.commitMessage || "Published theme update"}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Save,
  Rocket,
  History,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";

export type ViewportMode = "desktop" | "tablet" | "mobile";

interface TopToolbarProps {
  currentTemplate: string;
  onSelectTemplate: (template: string) => void;
  viewport: ViewportMode;
  onSelectViewport: (mode: ViewportMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onOpenVersions: () => void;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  storeName: string;
}

export function TopToolbar({
  currentTemplate,
  onSelectTemplate,
  viewport,
  onSelectViewport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  isSaving,
  isPublishing,
  onSaveDraft,
  onPublish,
  onOpenVersions,
  isPreviewMode,
  onTogglePreview,
  storeName,
}: TopToolbarProps) {
  const templates = [
    { key: "home", label: "Home Page" },
    { key: "products", label: "Products Catalog" },
    { key: "collections", label: "Collections" },
    { key: "about", label: "About Page" },
    { key: "contact", label: "Contact Page" },
  ];

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between gap-4 select-none z-30 shrink-0">
      {/* Left: Back to Dashboard & Template Selector */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/online-store/themes"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          title="Exit to Themes Hub"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="h-4 w-px bg-slate-200" />

        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <select
            value={currentTemplate}
            onChange={(e) => onSelectTemplate(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 hidden sm:inline">&bull; {storeName}</span>
        </div>
      </div>

      {/* Center: Device Viewports & Undo/Redo */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => onSelectViewport("desktop")}
            className={`p-1.5 rounded-md text-xs transition ${
              viewport === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectViewport("tablet")}
            className={`p-1.5 rounded-md text-xs transition ${
              viewport === "tablet" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectViewport("mobile")}
            className={`p-1.5 rounded-md text-xs transition ${
              viewport === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right: Status Indicator & Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Status indicator */}
        <div className="hidden md:flex items-center gap-1 text-xs">
          {isDirty ? (
            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Unsaved changes</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Draft saved</span>
            </span>
          )}
        </div>

        {/* Revision History */}
        <button
          type="button"
          onClick={onOpenVersions}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition hidden sm:flex items-center gap-1 text-xs font-medium"
          title="Revision History & Rollback"
        >
          <History className="h-4 w-4" />
          <span className="hidden lg:inline">History</span>
        </button>

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            isPreviewMode ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
          }`}
          title="Toggle Full Preview"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">{isPreviewMode ? "Editing" : "Preview"}</span>
        </button>

        {/* Save Draft */}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving || !isDirty}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{isSaving ? "Saving..." : "Save Draft"}</span>
        </button>

        {/* Publish Live */}
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--store-primary,#0f172a)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-sm"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span>{isPublishing ? "Publishing..." : "Publish"}</span>
        </button>
      </div>
    </header>
  );
}

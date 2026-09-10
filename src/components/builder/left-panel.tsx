"use client";

import React, { useState } from "react";
import type { PageAst, SectionNode } from "@/modules/builder/schema";
import {
  SECTION_DEFINITIONS,
  BLOCK_DEFINITIONS,
  createSectionFromDefinition,
  type SectionCategory,
} from "@/modules/builder/schema";
import { STARTER_PRESETS } from "@/modules/builder/presets";
import {
  Layers,
  Plus,
  Palette,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  ClipboardPaste,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Check,
  FileCode,
} from "lucide-react";

import { DEFAULT_THEME_SETTINGS, type StoreThemeSettings } from "@/modules/storefront/theme-engine";

interface LeftPanelProps {
  ast: PageAst;
  selectedSectionId?: string;
  selectedBlockId?: string;
  onSelectSection: (id: string) => void;
  onSelectBlock: (id: string) => void;
  onAddSection: (section: SectionNode) => void;
  onRemoveSection: (id: string) => void;
  onMoveSection: (id: string, direction: "up" | "down") => void;
  onDuplicateSection: (id: string) => void;
  onCopySection: (id: string) => void;
  onPasteSection: () => void;
  hasCopiedSection: boolean;
  onToggleHideSection: (id: string) => void;
  onToggleLockSection: (id: string) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onRemoveBlock: (sectionId: string, blockId: string) => void;
  onMoveBlock: (sectionId: string, blockId: string, direction: "up" | "down") => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onCopyBlock: (sectionId: string, blockId: string) => void;
  onPasteBlock: (sectionId: string) => void;
  hasCopiedBlock: boolean;
  onToggleHideBlock: (sectionId: string, blockId: string) => void;
  onToggleLockBlock: (sectionId: string, blockId: string) => void;
  currentTemplate: string;
  onSelectTemplate: (template: string) => void;
  themeSettings: StoreThemeSettings;
  onUpdateThemeSettings: (settings: StoreThemeSettings) => void;
  onApplyPreset: (presetKey: string) => void;
}

const CANONICAL_TEMPLATES = [
  { slug: "home", label: "Home", description: "Primary storefront landing page" },
  { slug: "products", label: "Products", description: "Merchandise catalog & product grid" },
  { slug: "collections", label: "Collections", description: "Category discovery & grouped collections" },
  { slug: "about", label: "About", description: "Brand narrative, founders, and story" },
  { slug: "contact", label: "Contact", description: "Customer care, WhatsApp, and inquiry form" },
  { slug: "custom", label: "Custom Page", description: "Bespoke marketing & promotional page" },
];

const CATEGORIES: Array<"ALL" | SectionCategory> = [
  "ALL",
  "HERO",
  "CONTENT",
  "COMMERCE",
  "TRUST",
  "MARKETING",
  "BUSINESS",
];

export function LeftPanel({
  ast,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onDuplicateSection,
  onCopySection,
  onPasteSection,
  hasCopiedSection,
  onToggleHideSection,
  onToggleLockSection,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onDuplicateBlock,
  onCopyBlock,
  onPasteBlock,
  hasCopiedBlock,
  onToggleHideBlock,
  onToggleLockBlock,
  currentTemplate,
  onSelectTemplate,
  themeSettings,
  onUpdateThemeSettings,
  onApplyPreset,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "add" | "templates" | "theme">("structure");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [addSearch, setAddSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | SectionCategory>("ALL");

  const toggleSectionExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSections = Object.values(SECTION_DEFINITIONS).filter((def) => {
    const matchesSearch =
      def.label.toLowerCase().includes(addSearch.toLowerCase()) ||
      def.category.toLowerCase().includes(addSearch.toLowerCase()) ||
      def.description.toLowerCase().includes(addSearch.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || def.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none">
      {/* Panel Tab Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/70">
        <button
          type="button"
          onClick={() => setActiveTab("structure")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "structure"
              ? "border-slate-900 text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Page Structure"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Sections</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "add"
              ? "border-slate-900 text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Add Section"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "templates"
              ? "border-slate-900 text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Template Switcher"
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("theme")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "theme"
              ? "border-slate-900 text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Global Theme Settings"
        >
          <Palette className="h-3.5 w-3.5" />
          <span>Theme</span>
        </button>
      </div>

      {/* TAB 1: STRUCTURE (SECTIONS & BLOCKS TREE) */}
      {activeTab === "structure" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sections ({ast.sections.length})
            </span>
            <div className="flex items-center gap-1.5">
              {hasCopiedSection && (
                <button
                  type="button"
                  onClick={onPasteSection}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                  title="Paste Copied Section"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Paste</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("add")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {ast.sections.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-3">
              <p>No sections added to this template.</p>
              <button
                type="button"
                onClick={() => setActiveTab("add")}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium"
              >
                Add First Section
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {ast.sections.map((section, index) => {
                const isSelected = selectedSectionId === section.id;
                const isExpanded = !!expandedSections[section.id];
                const def = SECTION_DEFINITIONS[section.type];

                return (
                  <div
                    key={section.id}
                    className={`rounded-lg border transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-50/80 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Section Header Row */}
                    <div
                      onClick={() => onSelectSection(section.id)}
                      className="p-2.5 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleSectionExpanded(section.id, e)}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {section.name || def?.label || section.type}
                        </span>
                        {section.isHidden && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">
                            Hidden
                          </span>
                        )}
                        {section.isLocked && (
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={index === 0 || section.isLocked}
                          onClick={() => onMoveSection(section.id, "up")}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === ast.sections.length - 1 || section.isLocked}
                          onClick={() => onMoveSection(section.id, "down")}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleHideSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title={section.isHidden ? "Show Section" : "Hide Section"}
                        >
                          {section.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleLockSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title={section.isLocked ? "Unlock Section" : "Lock Section"}
                        >
                          {section.isLocked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopySection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Copy Section"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Duplicate Section"
                        >
                          <Copy className="h-3 w-3 text-blue-500" />
                        </button>
                        <button
                          type="button"
                          disabled={section.isLocked}
                          onClick={() => onRemoveSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-20"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Child Blocks Tree */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 pb-2 pt-1 border-t border-slate-100 space-y-1 bg-white/50">
                        {section.blocks.map((block, bIdx) => {
                          const isBlockSelected = selectedBlockId === block.id;

                          return (
                            <div
                              key={block.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBlock(block.id);
                              }}
                              className={`p-1.5 rounded flex items-center justify-between text-xs cursor-pointer ${
                                isBlockSelected
                                  ? "bg-slate-900 text-white font-medium"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span className="truncate">
                                {String(block.settings?.text || block.settings?.title || block.settings?.label || block.type)}
                              </span>

                              <div
                                className="flex items-center gap-0.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={bIdx === 0 || block.isLocked}
                                  onClick={() => onMoveBlock(section.id, block.id, "up")}
                                  className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20"
                                  title="Move Block Up"
                                >
                                  <ArrowUp className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={bIdx === section.blocks.length - 1 || block.isLocked}
                                  onClick={() => onMoveBlock(section.id, block.id, "down")}
                                  className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20"
                                  title="Move Block Down"
                                >
                                  <ArrowDown className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onToggleHideBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title={block.isHidden ? "Show Block" : "Hide Block"}
                                >
                                  {block.isHidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onToggleLockBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title={block.isLocked ? "Unlock Block" : "Lock Block"}
                                >
                                  {block.isLocked ? <Lock className="h-2.5 w-2.5 text-amber-500" /> : <Unlock className="h-2.5 w-2.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCopyBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title="Copy Block"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDuplicateBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title="Duplicate Block"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={block.isLocked}
                                  onClick={() => onRemoveBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100 text-rose-500"
                                  title="Delete Block"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Block to Section & Paste Block */}
                        <div className="pt-1 flex items-center gap-1.5">
                          {def?.allowedBlocks && def.allowedBlocks.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  onAddBlock(section.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              defaultValue=""
                              className="flex-1 text-[11px] py-1 px-2 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-600 cursor-pointer"
                            >
                              <option value="" disabled>
                                + Add Block...
                              </option>
                              {def.allowedBlocks.map((bt) => (
                                <option key={bt} value={bt}>
                                  Add {BLOCK_DEFINITIONS[bt]?.label || bt}
                                </option>
                              ))}
                            </select>
                          )}
                          {hasCopiedBlock && (
                            <button
                              type="button"
                              onClick={() => onPasteBlock(section.id)}
                              className="px-2 py-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded border border-emerald-200 hover:bg-emerald-100"
                              title="Paste Copied Block into this Section"
                            >
                              Paste
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADD SECTION (PRESETS & CATEGORIES) */}
      {activeTab === "add" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sections..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-full whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Section Library */}
          <div className="space-y-2 pt-1">
            {filteredSections.map((def) => (
              <div
                key={def.type}
                onClick={() => {
                  onAddSection(createSectionFromDefinition(def.type));
                  setActiveTab("structure");
                }}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                    {def.label}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {def.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{def.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">Store Templates</h4>
            <p className="text-[11px] text-slate-500">Select template to customize its sections.</p>
          </div>

          <div className="space-y-2">
            {CANONICAL_TEMPLATES.map((tmpl) => {
              const isActive = currentTemplate === tmpl.slug;
              return (
                <div
                  key={tmpl.slug}
                  onClick={() => onSelectTemplate(tmpl.slug)}
                  className={`p-3 rounded-xl border transition cursor-pointer space-y-1 ${
                    isActive
                      ? "border-slate-900 bg-slate-50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{tmpl.label}</span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{tmpl.description}</p>
                </div>
              );
            })}
          </div>

          {/* Starter Themes Presets */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Starter Archetypes</h4>
            <div className="space-y-2">
              {Object.values(STARTER_PRESETS).map((preset) => (
                <div
                  key={preset.key}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                    {preset.badge && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{preset.description}</p>
                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset.key)}
                    className="w-full py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                  >
                    Apply Preset
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THEME SETTINGS */}
      {activeTab === "theme" && (() => {
        const safeColors = { ...DEFAULT_THEME_SETTINGS.colors, ...(themeSettings.colors || {}) };
        const safeTypography = { ...DEFAULT_THEME_SETTINGS.typography, ...(themeSettings.typography || {}) };
        const safeLayout = { ...DEFAULT_THEME_SETTINGS.layout, ...(themeSettings.layout || {}) };

        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Theme Settings</h4>
              <p className="text-[11px] text-slate-500">Global design tokens applied across the storefront.</p>
            </div>

            {/* Color Palette */}
            <div className="space-y-3 border-t pt-3">
              <h5 className="font-semibold text-slate-800">Color Palette</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={safeColors.primary}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, primary: e.target.value },
                        })
                      }
                      className="h-7 w-8 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-[10px] text-slate-600">{safeColors.primary}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={safeColors.accent}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, accent: e.target.value },
                        })
                      }
                      className="h-7 w-8 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-[10px] text-slate-600">{safeColors.accent}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={safeColors.background}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, background: e.target.value },
                        })
                      }
                      className="h-7 w-8 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-[10px] text-slate-600">{safeColors.background}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Secondary</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={safeColors.secondary}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, secondary: e.target.value },
                        })
                      }
                      className="h-7 w-8 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-[10px] text-slate-600">{safeColors.secondary}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-3 border-t pt-3">
              <h5 className="font-semibold text-slate-800">Typography</h5>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Heading Font Family</label>
                  <select
                    value={safeTypography.headingFont}
                    onChange={(e) =>
                      onUpdateThemeSettings({
                        ...themeSettings,
                        typography: { ...safeTypography, headingFont: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                    <option value="Outfit, sans-serif">Outfit (Modern Geometric)</option>
                    <option value="Playfair Display, serif">Playfair Display (Luxury Editorial)</option>
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans (Contemporary)</option>
                    <option value="Roboto, sans-serif">Roboto (Technical)</option>
                    <option value="Space Grotesk, sans-serif">Space Grotesk (Bold Streetwear)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Body Font Family</label>
                  <select
                    value={safeTypography.bodyFont}
                    onChange={(e) =>
                      onUpdateThemeSettings({
                        ...themeSettings,
                        typography: { ...safeTypography, bodyFont: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Layout & Shapes */}
            <div className="space-y-3 border-t pt-3">
              <h5 className="font-semibold text-slate-800">Component Border Radius</h5>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Sharp", val: "0px" },
                  { label: "Subtle", val: "0.25rem" },
                  { label: "Rounded", val: "0.5rem" },
                  { label: "Large", val: "1rem" },
                  { label: "Pill", val: "9999px" },
                ].map((r) => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() =>
                      onUpdateThemeSettings({
                        ...themeSettings,
                        layout: { ...safeLayout, borderRadius: r.val },
                      })
                    }
                    className={`p-2 rounded border text-center transition ${
                      safeLayout.borderRadius === r.val
                        ? "border-slate-900 bg-slate-900 text-white font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}

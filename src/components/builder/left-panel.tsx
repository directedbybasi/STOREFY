"use client";

import React, { useState } from "react";
import type { PageAst, SectionNode } from "@/modules/builder/schema";
import { SECTION_DEFINITIONS, createSectionFromDefinition } from "@/modules/builder/schema";
import { STARTER_PRESETS } from "@/modules/builder/presets";
import {
  Layers,
  Plus,
  Palette,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";

import type { StoreThemeSettings } from "@/modules/storefront/theme-engine";

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
  onToggleHideSection: (id: string) => void;
  onToggleLockSection: (id: string) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onRemoveBlock: (sectionId: string, blockId: string) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  themeSettings: StoreThemeSettings;
  onUpdateThemeSettings: (settings: StoreThemeSettings) => void;
  onApplyPreset: (presetKey: string) => void;
}

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
  onToggleHideSection,
  onToggleLockSection,
  onAddBlock,
  onRemoveBlock,
  onDuplicateBlock,
  themeSettings,
  onUpdateThemeSettings,
  onApplyPreset,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "add" | "templates" | "theme">("structure");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [addSearch, setAddSearch] = useState("");

  const toggleSectionExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSections = Object.values(SECTION_DEFINITIONS).filter(
    (def) =>
      def.label.toLowerCase().includes(addSearch.toLowerCase()) ||
      def.category.toLowerCase().includes(addSearch.toLowerCase()) ||
      def.description.toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none">
      {/* Panel Tab Buttons */}
      <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/70">
        <button
          type="button"
          onClick={() => setActiveTab("structure")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "structure"
              ? "border-[var(--store-primary,#0f172a)] text-slate-900 bg-white font-bold"
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
              ? "border-[var(--store-primary,#0f172a)] text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Add Section"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("theme")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "theme"
              ? "border-[var(--store-primary,#0f172a)] text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Global Theme Tokens"
        >
          <Palette className="h-3.5 w-3.5" />
          <span>Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === "templates"
              ? "border-[var(--store-primary,#0f172a)] text-slate-900 bg-white font-bold"
              : "border-transparent hover:text-slate-900"
          }`}
          title="Starter Archetypes"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span>Presets</span>
        </button>
      </div>

      {/* Tab 1: Structure Tree */}
      {activeTab === "structure" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Page Tree ({ast.sections.length})
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--store-accent,#2563eb)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Section</span>
            </button>
          </div>

          {ast.sections.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-3">
              <p>No sections added yet.</p>
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
                        ? "border-[var(--store-primary,#0f172a)] bg-slate-50/80 shadow-xs"
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
                          <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                        )}
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMoveSection(section.id, "up")}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === ast.sections.length - 1}
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
                          onClick={() => onDuplicateSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Duplicate Section"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSection(section.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Child Blocks Tree */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 pb-2 pt-1 border-t border-slate-100 space-y-1 bg-white/50">
                        {section.blocks.map((block) => {
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
                                  ? "bg-[var(--store-primary,#0f172a)] text-white font-medium"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span className="truncate">
                                {String(block.settings?.text || block.settings?.title || block.settings?.label || block.type)}
                              </span>
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => onDuplicateBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title="Duplicate Block"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveBlock(section.id, block.id)}
                                  className="p-0.5 opacity-60 hover:opacity-100"
                                  title="Delete Block"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Block to Section */}
                        {def?.allowedBlocks && def.allowedBlocks.length > 0 && (
                          <div className="pt-1">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  onAddBlock(section.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              defaultValue=""
                              className="w-full text-[11px] py-1 px-2 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-600 cursor-pointer"
                            >
                              <option value="" disabled>
                                + Add Block...
                              </option>
                              {def.allowedBlocks.map((bt) => (
                                <option key={bt} value={bt}>
                                  Add {bt.charAt(0).toUpperCase() + bt.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Add Section Palette */}
      {activeTab === "add" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search sections..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-2">
            {filteredSections.map((def) => (
              <div
                key={def.type}
                onClick={() => {
                  onAddSection(createSectionFromDefinition(def.type));
                  setActiveTab("structure");
                }}
                className="p-3 rounded-xl border border-slate-200 hover:border-[var(--store-primary,#0f172a)] hover:shadow-xs transition cursor-pointer bg-white group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[var(--store-primary,#0f172a)]">
                    {def.label}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {def.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{def.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Global Theme Settings */}
      {activeTab === "theme" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Theme Settings</h3>
            <p className="text-slate-500 text-[11px]">Global styling applied across the entire storefront.</p>
          </div>

          {/* Colors */}
          <div className="space-y-3 border-t pt-3">
            <h4 className="font-semibold text-slate-800">Color Palette</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Primary Color</span>
                <input
                  type="color"
                  value={themeSettings.colors?.primary || "#0f172a"}
                  onChange={(e) =>
                    onUpdateThemeSettings({
                      ...themeSettings,
                      colors: { ...themeSettings.colors, primary: e.target.value },
                    })
                  }
                  className="h-7 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Accent Color</span>
                <input
                  type="color"
                  value={themeSettings.colors?.accent || "#2563eb"}
                  onChange={(e) =>
                    onUpdateThemeSettings({
                      ...themeSettings,
                      colors: { ...themeSettings.colors, accent: e.target.value },
                    })
                  }
                  className="h-7 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Background Color</span>
                <input
                  type="color"
                  value={themeSettings.colors?.background || "#ffffff"}
                  onChange={(e) =>
                    onUpdateThemeSettings({
                      ...themeSettings,
                      colors: { ...themeSettings.colors, background: e.target.value },
                    })
                  }
                  className="h-7 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-3 border-t pt-3">
            <h4 className="font-semibold text-slate-800">Typography</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-slate-600 mb-1">Heading Font</label>
                <select
                  value={themeSettings.typography?.headingFont || "Inter, sans-serif"}
                  onChange={(e) =>
                    onUpdateThemeSettings({
                      ...themeSettings,
                      typography: { ...themeSettings.typography, headingFont: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                  <option value="Playfair Display, serif">Playfair Display (Luxury Editorial)</option>
                  <option value="Roboto, sans-serif">Roboto (Tech Standard)</option>
                  <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans (Contemporary)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Body Font</label>
                <select
                  value={themeSettings.typography?.bodyFont || "Inter, sans-serif"}
                  onChange={(e) =>
                    onUpdateThemeSettings({
                      ...themeSettings,
                      typography: { ...themeSettings.typography, bodyFont: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Layout & Radii */}
          <div className="space-y-3 border-t pt-3">
            <h4 className="font-semibold text-slate-800">Shapes & Layout</h4>
            <div>
              <label className="block text-slate-600 mb-1">Border Radius</label>
              <select
                value={themeSettings.layout?.borderRadius || "0.5rem"}
                onChange={(e) =>
                  onUpdateThemeSettings({
                    ...themeSettings,
                    layout: { ...themeSettings.layout, borderRadius: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              >
                <option value="0px">Sharp (0px)</option>
                <option value="0.25rem">Subtle (4px)</option>
                <option value="0.5rem">Standard (8px)</option>
                <option value="1rem">Rounded (16px)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Starter Archetype Presets */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Starter Presets</h3>
            <p className="text-slate-500 text-[11px]">One-click industry archetypes for rapid launching.</p>
          </div>

          <div className="space-y-2">
            {Object.values(STARTER_PRESETS).map((preset) => (
              <div
                key={preset.key}
                onClick={() => {
                  if (confirm(`Apply the "${preset.name}" preset? This will overwrite your current draft sections.`)) {
                    onApplyPreset(preset.key);
                    setActiveTab("structure");
                  }
                }}
                className="p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:shadow-xs transition cursor-pointer bg-white space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                  {preset.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {preset.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{preset.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

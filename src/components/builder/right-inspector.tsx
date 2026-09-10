"use client";

import React, { useState } from "react";
import type { PageAst, BlockNode } from "@/modules/builder/schema";
import { SECTION_DEFINITIONS, BLOCK_DEFINITIONS } from "@/modules/builder/schema";
import { Sliders, X, Trash2, Sparkles, Smartphone, Monitor } from "lucide-react";
import { DEFAULT_THEME_SETTINGS, type StoreThemeSettings } from "@/modules/storefront/theme-engine";

interface RightInspectorProps {
  ast: PageAst;
  selectedSectionId?: string;
  selectedBlockId?: string;
  onDeselect: () => void;
  onUpdateSectionSettings: (sectionId: string, settings: Record<string, unknown>) => void;
  onUpdateSectionName: (sectionId: string, name: string) => void;
  onUpdateBlockSettings: (sectionId: string, blockId: string, settings: Record<string, unknown>) => void;
  onRemoveSection: (id: string) => void;
  onRemoveBlock: (sectionId: string, blockId: string) => void;
  themeSettings?: StoreThemeSettings;
  onUpdateThemeSettings?: (settings: StoreThemeSettings) => void;
}

export function RightInspector({
  ast,
  selectedSectionId,
  selectedBlockId,
  onDeselect,
  onUpdateSectionSettings,
  onUpdateSectionName,
  onUpdateBlockSettings,
  onRemoveSection,
  onRemoveBlock,
  themeSettings,
  onUpdateThemeSettings,
}: RightInspectorProps) {
  const [inspectorTab, setInspectorTab] = useState<"settings" | "layout" | "responsive">("settings");

  const selectedSection = ast.sections.find((s) => s.id === selectedSectionId);

  let selectedBlock: BlockNode | undefined;
  if (selectedSection && selectedBlockId) {
    selectedBlock = selectedSection.blocks.find((b) => b.id === selectedBlockId);
  }

  // 1. STATE: NO OBJECT SELECTED -> SHOW GLOBAL THEME SETTINGS
  if (!selectedSection) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-5 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Global Store Theme</h4>
            <p className="text-[10px] text-slate-500">Global design tokens and layout</p>
          </div>
        </div>

        {themeSettings && onUpdateThemeSettings ? (() => {
          const safeColors = { ...DEFAULT_THEME_SETTINGS.colors, ...(themeSettings.colors || {}) };
          const safeTypography = { ...DEFAULT_THEME_SETTINGS.typography, ...(themeSettings.typography || {}) };
          const safeLayout = { ...DEFAULT_THEME_SETTINGS.layout, ...(themeSettings.layout || {}) };

          return (
            <div className="space-y-4 pt-4 text-xs">
              {/* Colors */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-800 text-[11px]">Store Palette</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Primary</label>
                    <input
                      type="color"
                      value={safeColors.primary}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, primary: e.target.value },
                        })
                      }
                      className="h-7 w-full rounded cursor-pointer border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Accent</label>
                    <input
                      type="color"
                      value={safeColors.accent}
                      onChange={(e) =>
                        onUpdateThemeSettings({
                          ...themeSettings,
                          colors: { ...safeColors, accent: e.target.value },
                        })
                      }
                      className="h-7 w-full rounded cursor-pointer border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-2 border-t pt-3">
                <span className="font-semibold text-slate-800 text-[11px]">Typography</span>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Heading Font</label>
                  <select
                    value={safeTypography.headingFont}
                    onChange={(e) =>
                      onUpdateThemeSettings({
                        ...themeSettings,
                        typography: { ...safeTypography, headingFont: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Outfit, sans-serif">Outfit</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                  </select>
                </div>
              </div>

              {/* Radius */}
              <div className="space-y-2 border-t pt-3">
                <span className="font-semibold text-slate-800 text-[11px]">Corner Radius</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Sharp", val: "0px" },
                    { label: "Soft", val: "0.5rem" },
                    { label: "Round", val: "1rem" },
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
                      className={`py-1 text-center rounded border transition text-[11px] ${
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
        })() : (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <p>Click any section or block on the canvas to inspect and edit its settings.</p>
          </div>
        )}
      </aside>
    );
  }

  // 2. STATE: BLOCK SELECTED
  if (selectedBlock) {
    const blockDef = BLOCK_DEFINITIONS[selectedBlock.type];

    return (
      <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedSection.name || selectedSection.type} &bull; Block
            </span>
            <h3 className="text-xs font-bold text-slate-900 capitalize">
              {blockDef?.label || selectedBlock.type}
            </h3>
          </div>
          <button
            type="button"
            onClick={onDeselect}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
            title="Close Inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic token helper */}
        <div className="m-4 mb-0 p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-900">
            <Sparkles className="h-3 w-3" />
            <span>Dynamic Data Binding</span>
          </div>
          <p className="text-[10px] text-indigo-700 leading-tight">
            Use tokens like <code className="font-mono bg-white px-1 py-0.5 rounded text-indigo-950 font-bold">{"{{ store.name }}"}</code> in any text field.
          </p>
        </div>

        {/* Block Settings Form */}
        <div className="p-4 space-y-4 text-xs">
          {/* Text Content */}
          {selectedBlock.settings.text !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Text Content</label>
              <textarea
                rows={3}
                value={(selectedBlock.settings.text as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    text: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none font-sans"
              />
            </div>
          )}

          {/* Heading Level */}
          {selectedBlock.type === "heading" && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Heading Level</label>
              <select
                value={(selectedBlock.settings.level as string) || "h2"}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    level: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              >
                <option value="h1">H1 (Hero Title)</option>
                <option value="h2">H2 (Section Header)</option>
                <option value="h3">H3 (Subheader)</option>
                <option value="h4">H4 (Card Title)</option>
              </select>
            </div>
          )}

          {/* Button Label & URL */}
          {selectedBlock.settings.label !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Button Label</label>
              <input
                type="text"
                value={(selectedBlock.settings.label as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    label: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          {selectedBlock.settings.url !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Destination Link / URL</label>
              <input
                type="text"
                value={(selectedBlock.settings.url as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    url: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-[11px]"
              />
            </div>
          )}

          {selectedBlock.settings.variant !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Button Style</label>
              <select
                value={(selectedBlock.settings.variant as string) || "primary"}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    variant: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              >
                <option value="primary">Primary (Filled)</option>
                <option value="outline">Outline</option>
              </select>
            </div>
          )}

          {/* Testimonial Fields */}
          {selectedBlock.settings.quote !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Customer Quote</label>
              <textarea
                rows={3}
                value={(selectedBlock.settings.quote as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    quote: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 resize-none"
              />
            </div>
          )}

          {selectedBlock.settings.author !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Author Name</label>
              <input
                type="text"
                value={(selectedBlock.settings.author as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    author: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
          )}

          {/* FAQ Fields */}
          {selectedBlock.settings.question !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Question</label>
              <input
                type="text"
                value={(selectedBlock.settings.question as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    question: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
          )}

          {selectedBlock.settings.answer !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Answer</label>
              <textarea
                rows={3}
                value={(selectedBlock.settings.answer as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    answer: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 resize-none"
              />
            </div>
          )}

          {/* Feature Fields */}
          {selectedBlock.settings.title !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Title</label>
              <input
                type="text"
                value={(selectedBlock.settings.title as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
          )}

          {selectedBlock.settings.description !== undefined && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Description</label>
              <textarea
                rows={2}
                value={(selectedBlock.settings.description as string) || ""}
                onChange={(e) =>
                  onUpdateBlockSettings(selectedSection.id, selectedBlock!.id, {
                    ...selectedBlock!.settings,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 resize-none"
              />
            </div>
          )}

          {/* Delete Action */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onRemoveBlock(selectedSection.id, selectedBlock!.id)}
              className="w-full py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Block</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. STATE: SECTION SELECTED
  const sectionDef = SECTION_DEFINITIONS[selectedSection.type];

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {sectionDef?.category || "Section"}
          </span>
          <h3 className="text-xs font-bold text-slate-900">{selectedSection.name || sectionDef?.label}</h3>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="p-1 rounded text-slate-400 hover:text-slate-700"
          title="Close Inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Tab Selector */}
      <div className="flex border-b border-slate-200 text-xs bg-slate-50/50">
        <button
          type="button"
          onClick={() => setInspectorTab("settings")}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            inspectorTab === "settings"
              ? "border-slate-900 text-slate-900 font-bold bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setInspectorTab("layout")}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            inspectorTab === "layout"
              ? "border-slate-900 text-slate-900 font-bold bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Spacing
        </button>
        <button
          type="button"
          onClick={() => setInspectorTab("responsive")}
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition ${
            inspectorTab === "responsive"
              ? "border-slate-900 text-slate-900 font-bold bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Responsive
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* SUBTAB 1: SETTINGS */}
        {inspectorTab === "settings" && (
          <div className="space-y-4">
            {/* Section Label */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Section Name / Label</label>
              <input
                type="text"
                value={selectedSection.name || ""}
                onChange={(e) => onUpdateSectionName(selectedSection.id, e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Background Color */}
            <div className="space-y-2 border-t pt-3">
              <label className="font-semibold text-slate-700">Background Color</label>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Color</span>
                <input
                  type="color"
                  value={(selectedSection.settings.backgroundColor as string) || "#ffffff"}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      backgroundColor: e.target.value,
                    })
                  }
                  className="h-7 w-12 rounded cursor-pointer border border-slate-200 p-0.5"
                />
              </div>
            </div>

            {/* Specific section configs */}
            {selectedSection.settings.collectionTitle !== undefined && (
              <div className="space-y-1 border-t pt-3">
                <label className="font-semibold text-slate-700">Collection Title</label>
                <input
                  type="text"
                  value={(selectedSection.settings.collectionTitle as string) || ""}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      collectionTitle: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                />
              </div>
            )}

            {selectedSection.settings.couponCode !== undefined && (
              <div className="space-y-1 border-t pt-3">
                <label className="font-semibold text-slate-700">Coupon Code</label>
                <input
                  type="text"
                  value={(selectedSection.settings.couponCode as string) || ""}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      couponCode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: SPACING & LAYOUT */}
        {inspectorTab === "layout" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Vertical Spacing</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Top Padding</label>
                <select
                  value={(selectedSection.settings.paddingTop as string) || "48px"}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      paddingTop: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="0px">None (0px)</option>
                  <option value="24px">Small (24px)</option>
                  <option value="48px">Medium (48px)</option>
                  <option value="64px">Large (64px)</option>
                  <option value="96px">Extra Large (96px)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Bottom Padding</label>
                <select
                  value={(selectedSection.settings.paddingBottom as string) || "48px"}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      paddingBottom: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="0px">None (0px)</option>
                  <option value="24px">Small (24px)</option>
                  <option value="48px">Medium (48px)</option>
                  <option value="64px">Large (64px)</option>
                  <option value="96px">Extra Large (96px)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: RESPONSIVE OVERRIDES */}
        {inspectorTab === "responsive" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Breakpoint Visibility</h4>
            <p className="text-[11px] text-slate-500">Hide this section on specific customer device types.</p>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-500" />
                  <span>Hide on Desktop</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedSection.styles?.desktop?.hide)}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      hideOnDesktop: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  <span>Hide on Mobile</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedSection.styles?.mobile?.hide)}
                  onChange={(e) =>
                    onUpdateSectionSettings(selectedSection.id, {
                      ...selectedSection.settings,
                      hideOnMobile: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300"
                />
              </label>
            </div>
          </div>
        )}

        {/* Delete Section Action */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={selectedSection.isLocked}
            onClick={() => onRemoveSection(selectedSection.id)}
            className="w-full py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remove Section</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

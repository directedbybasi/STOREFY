"use client";

import React from "react";
import type { PageAst, BlockNode } from "@/modules/builder/schema";
import { SECTION_DEFINITIONS } from "@/modules/builder/schema";
import { Sliders, X, Trash2, Sparkles } from "lucide-react";

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
}: RightInspectorProps) {
  const selectedSection = ast.sections.find((s) => s.id === selectedSectionId);

  let selectedBlock: BlockNode | undefined;
  if (selectedSection && selectedBlockId) {
    selectedBlock = selectedSection.blocks.find((b) => b.id === selectedBlockId);
  }

  if (!selectedSection) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 shrink-0 select-none">
        <div className="p-3 rounded-full bg-slate-100 text-slate-500">
          <Sliders className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-700">No Component Selected</h4>
          <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
            Click any section or block on the canvas to customize its settings, copy, and layout.
          </p>
        </div>
      </aside>
    );
  }

  // If a block is specifically selected
  if (selectedBlock) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedSection.name} &bull; Block
            </span>
            <h3 className="text-xs font-bold text-slate-900 capitalize">{selectedBlock.type}</h3>
          </div>
          <button
            type="button"
            onClick={onDeselect}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Block Settings Fields */}
        <div className="p-4 space-y-4 text-xs">
          {/* Dynamic token helper */}
          <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-900">
              <Sparkles className="h-3 w-3" />
              <span>Dynamic Data Binding</span>
            </div>
            <p className="text-[10px] text-indigo-700 leading-tight">
              Type <code className="font-mono bg-white px-1 py-0.5 rounded text-indigo-950">{"{{ store.name }}"}</code> or click to insert.
            </p>
          </div>

          {/* Text/Content inputs */}
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
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-[11px]"
              />
            </div>
          )}

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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
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

  // Section Inspector
  const def = SECTION_DEFINITIONS[selectedSection.type];

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {def?.category || "Section"}
          </span>
          <h3 className="text-xs font-bold text-slate-900">{selectedSection.name || def?.label}</h3>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="p-1 rounded text-slate-400 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Form */}
      <div className="p-4 space-y-5 text-xs">
        {/* Section Label */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">Section Label</label>
          <input
            type="text"
            value={selectedSection.name || ""}
            onChange={(e) => onUpdateSectionName(selectedSection.id, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Spacing Controls */}
        <div className="space-y-3 border-t pt-3">
          <h4 className="font-semibold text-slate-800">Vertical Spacing</h4>
          <div className="grid grid-cols-2 gap-2">
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

        {/* Background color */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="font-semibold text-slate-800">Background Color</h4>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Section Background</span>
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

        {/* Delete Section */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onRemoveSection(selectedSection.id)}
            className="w-full py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remove Section</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

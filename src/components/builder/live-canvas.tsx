"use client";

import React from "react";
import type { PageAst } from "@/modules/builder/schema";
import { SectionRenderer } from "@/components/storefront/sections/section-renderer";
import { compileThemeCssVariables, type StoreThemeSettings } from "@/modules/storefront/theme-engine";
import type { ViewportMode } from "./top-toolbar";
import type { BindingContext } from "@/modules/builder/bindings";

interface LiveCanvasProps {
  ast: PageAst;
  viewport: ViewportMode;
  selectedSectionId?: string;
  selectedBlockId?: string;
  onSelectSection: (id: string) => void;
  onSelectBlock: (id: string) => void;
  themeSettings: StoreThemeSettings;
  storeContext: BindingContext;
}

export function LiveCanvas({
  ast,
  viewport,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  themeSettings,
  storeContext,
}: LiveCanvasProps) {
  const cssVariables = compileThemeCssVariables(themeSettings);

  const getViewportContainerClass = () => {
    switch (viewport) {
      case "mobile":
        return "w-[375px] my-6 rounded-[2.5rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden min-h-[750px] bg-white transition-all duration-300";
      case "tablet":
        return "w-[768px] my-6 rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden min-h-[900px] bg-white transition-all duration-300";
      case "desktop":
      default:
        return "w-full min-h-full bg-white shadow-xs transition-all duration-300";
    }
  };

  return (
    <main
      onClick={() => {
        // Deselect if clicking on canvas backdrop
      }}
      className="flex-1 bg-slate-100/70 overflow-y-auto flex items-start justify-center p-0 sm:p-4 transition-colors"
    >
      <div
        style={cssVariables}
        className={getViewportContainerClass()}
      >
        {/* Render sections using the unified storefront renderer */}
        {ast.sections.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <p className="text-base font-medium">This template has no sections yet.</p>
            <p className="text-xs">Click &quot;Add Section&quot; in the left panel to begin designing.</p>
          </div>
        ) : (
          <div className="flex flex-col w-full divide-y divide-slate-100">
            {ast.sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isBuilder={true}
                isSelected={selectedSectionId === section.id}
                selectedBlockId={selectedBlockId}
                onSelectSection={onSelectSection}
                onSelectBlock={onSelectBlock}
                context={storeContext}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

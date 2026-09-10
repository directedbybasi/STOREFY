"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { PageAst, SectionNode, BlockNode } from "@/modules/builder/schema";
import { createBlockNode } from "@/modules/builder/schema";
import { STARTER_PRESETS } from "@/modules/builder/presets";
import { saveThemeDraftAction, publishThemeAction } from "@/modules/builder/actions";
import { TopToolbar, type ViewportMode } from "./top-toolbar";
import { LeftPanel } from "./left-panel";
import { LiveCanvas } from "./live-canvas";
import { RightInspector } from "./right-inspector";
import { VersionsModal } from "./versions-modal";
import type { BindingContext } from "@/modules/builder/bindings";
import type { StoreThemeSettings } from "@/modules/storefront/theme-engine";

interface CustomizerWorkspaceProps {
  initialAst: PageAst;
  initialThemeSettings: StoreThemeSettings;
  store: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
    currency: string;
    logoUrl: string | null;
  };
  initialPageSlug?: string;
}

export function CustomizerWorkspace({
  initialAst,
  initialThemeSettings,
  store,
  initialPageSlug = "home",
}: CustomizerWorkspaceProps) {
  // Page AST state
  const [ast, setAst] = useState<PageAst>(initialAst);
  const [themeSettings, setThemeSettings] = useState<StoreThemeSettings>(initialThemeSettings);
  const [pageSlug, setPageSlug] = useState<string>(initialPageSlug);

  // In-memory Undo / Redo history stack (up to 50 items)
  const [history, setHistory] = useState<Array<{ ast: PageAst; themeSettings: StoreThemeSettings }>>([
    { ast: initialAst, themeSettings: initialThemeSettings },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI state
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(
    initialAst.sections[0]?.id
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  // Ref to track latest state for autosave
  const astRef = useRef(ast);
  astRef.current = ast;
  const themeRef = useRef(themeSettings);
  themeRef.current = themeSettings;

  // Push new state to history stack
  const recordHistory = useCallback(
    (newAst: PageAst, newThemeSettings: StoreThemeSettings) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, { ast: newAst, themeSettings: newThemeSettings }];
        return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
      setIsDirty(true);
    },
    [historyIndex]
  );

  // State update helpers with history recording
  const updateAst = useCallback(
    (updater: (prev: PageAst) => PageAst) => {
      setAst((prev) => {
        const next = updater(prev);
        recordHistory(next, themeSettings);
        return next;
      });
    },
    [recordHistory, themeSettings]
  );

  const updateTheme = useCallback(
    (
      updaterOrSettings:
        | StoreThemeSettings
        | ((prev: StoreThemeSettings) => StoreThemeSettings)
    ) => {
      setThemeSettings((prev) => {
        const next =
          typeof updaterOrSettings === "function"
            ? (updaterOrSettings as (prev: StoreThemeSettings) => StoreThemeSettings)(prev)
            : updaterOrSettings;
        recordHistory(ast, next);
        return next;
      });
    },
    [ast, recordHistory]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setAst(prevEntry.ast);
      setThemeSettings(prevEntry.themeSettings);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setAst(nextEntry.ast);
      setThemeSettings(nextEntry.themeSettings);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inside text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Escape") {
        setSelectedSectionId(undefined);
        setSelectedBlockId(undefined);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Section Operations
  const handleAddSection = (newSection: SectionNode) => {
    updateAst((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setSelectedSectionId(newSection.id);
    setSelectedBlockId(undefined);
  };

  const handleRemoveSection = (sectionId: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(undefined);
      setSelectedBlockId(undefined);
    }
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    updateAst((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;

      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.sections.length) return prev;

      const updated = [...prev.sections];
      const [moved] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, moved);
      return { ...prev, sections: updated };
    });
  };

  const handleDuplicateSection = (sectionId: string) => {
    const sectionToDup = ast.sections.find((s) => s.id === sectionId);
    if (!sectionToDup) return;

    const duplicated: SectionNode = {
      ...sectionToDup,
      id: `${sectionToDup.type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${sectionToDup.name || sectionToDup.type} (Copy)`,
      blocks: sectionToDup.blocks.map((b) => ({
        ...b,
        id: `${b.type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    updateAst((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      const updated = [...prev.sections];
      updated.splice(idx + 1, 0, duplicated);
      return { ...prev, sections: updated };
    });
    setSelectedSectionId(duplicated.id);
  };

  const handleToggleHideSection = (sectionId: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, isHidden: !s.isHidden } : s
      ),
    }));
  };

  const handleToggleLockSection = (sectionId: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, isLocked: !s.isLocked } : s
      ),
    }));
  };

  const handleUpdateSectionName = (sectionId: string, name: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
    }));
  };

  const handleUpdateSectionSettings = (sectionId: string, settings: Record<string, unknown>) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, settings } : s)),
    }));
  };

  // Block Operations
  const handleAddBlock = (sectionId: string, blockType: string) => {
    const newBlock = createBlockNode(blockType);
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, blocks: [...s.blocks, newBlock] } : s
      ),
    }));
    setSelectedSectionId(sectionId);
    setSelectedBlockId(newBlock.id);
  };

  const handleRemoveBlock = (sectionId: string, blockId: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) } : s
      ),
    }));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(undefined);
    }
  };

  const handleDuplicateBlock = (sectionId: string, blockId: string) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const bIdx = s.blocks.findIndex((b) => b.id === blockId);
        if (bIdx === -1) return s;
        const target = s.blocks[bIdx];
        const dup: BlockNode = {
          ...target,
          id: `${target.type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        };
        const nextBlocks = [...s.blocks];
        nextBlocks.splice(bIdx + 1, 0, dup);
        return { ...s, blocks: nextBlocks };
      }),
    }));
  };

  const handleUpdateBlockSettings = (
    sectionId: string,
    blockId: string,
    settings: Record<string, unknown>
  ) => {
    updateAst((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, settings } : b)),
        };
      }),
    }));
  };

  // Apply Starter Preset
  const handleApplyPreset = async (presetKey: string) => {
    const preset = STARTER_PRESETS[presetKey];
    if (!preset) return;
    setAst(preset.homeAst);
    setThemeSettings(preset.defaultThemeSettings);
    recordHistory(preset.homeAst, preset.defaultThemeSettings);
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await saveThemeDraftAction({
        template: pageSlug,
        pageSlug,
        draftAst: ast,
        draftThemeSettings: themeSettings,
      });
      setIsDirty(false);
    } catch (err: unknown) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Action
  const handlePublish = async () => {
    if (!confirm("Publish this theme to the live storefront? All customers will immediately see these updates.")) {
      return;
    }

    setIsPublishing(true);
    try {
      // First ensure latest draft is saved
      await saveThemeDraftAction({
        template: pageSlug,
        pageSlug,
        draftAst: ast,
        draftThemeSettings: themeSettings,
      });

      const res = await publishThemeAction({
        pageSlug,
        commitMessage: `Published via Theme Customizer`,
      });
      setIsDirty(false);
      alert(`Successfully published Version v${res.versionNumber} to the live storefront!`);
    } catch (err: unknown) {
      alert(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const storeContext: BindingContext = {
    store: {
      name: store.name,
      subdomain: store.subdomain,
      customDomain: store.customDomain,
      currency: store.currency,
      logoUrl: store.logoUrl,
    },
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans">
      {/* Top Toolbar */}
      <TopToolbar
        currentTemplate={pageSlug}
        onSelectTemplate={(t) => setPageSlug(t)}
        viewport={viewport}
        onSelectViewport={setViewport}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isDirty={isDirty}
        isSaving={isSaving}
        isPublishing={isPublishing}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onOpenVersions={() => setIsVersionsOpen(true)}
        isPreviewMode={isPreviewMode}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        storeName={store.name}
      />

      {/* Main 3-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Structure Panel (Hidden in Preview Mode) */}
        {!isPreviewMode && (
          <LeftPanel
            ast={ast}
            selectedSectionId={selectedSectionId}
            selectedBlockId={selectedBlockId}
            onSelectSection={(id) => {
              setSelectedSectionId(id);
              setSelectedBlockId(undefined);
            }}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            onMoveSection={handleMoveSection}
            onDuplicateSection={handleDuplicateSection}
            onToggleHideSection={handleToggleHideSection}
            onToggleLockSection={handleToggleLockSection}
            onAddBlock={handleAddBlock}
            onRemoveBlock={handleRemoveBlock}
            onDuplicateBlock={handleDuplicateBlock}
            themeSettings={themeSettings}
            onUpdateThemeSettings={updateTheme}
            onApplyPreset={handleApplyPreset}
          />
        )}

        {/* Center Live Storefront Canvas */}
        <LiveCanvas
          ast={ast}
          viewport={viewport}
          selectedSectionId={selectedSectionId}
          selectedBlockId={selectedBlockId}
          onSelectSection={(id) => {
            setSelectedSectionId(id);
            setSelectedBlockId(undefined);
          }}
          onSelectBlock={(id) => setSelectedBlockId(id)}
          themeSettings={themeSettings}
          storeContext={storeContext}
        />

        {/* Right Settings Inspector (Hidden in Preview Mode) */}
        {!isPreviewMode && (
          <RightInspector
            ast={ast}
            selectedSectionId={selectedSectionId}
            selectedBlockId={selectedBlockId}
            onDeselect={() => {
              setSelectedSectionId(undefined);
              setSelectedBlockId(undefined);
            }}
            onUpdateSectionSettings={handleUpdateSectionSettings}
            onUpdateSectionName={handleUpdateSectionName}
            onUpdateBlockSettings={handleUpdateBlockSettings}
            onRemoveSection={handleRemoveSection}
            onRemoveBlock={handleRemoveBlock}
          />
        )}
      </div>

      {/* Versions & Rollback Modal */}
      <VersionsModal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        pageSlug={pageSlug}
        onRollbackSuccess={() => {
          alert("Storefront successfully rolled back to selected revision!");
          window.location.reload();
        }}
      />
    </div>
  );
}

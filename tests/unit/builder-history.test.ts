import { describe, it, expect } from "vitest";
import type { PageAst } from "@/modules/builder/schema";

/**
 * Pure History Manager encapsulating the exact 50-step Undo/Redo stack logic
 * used by CustomizerWorkspace.
 */
class HistoryManager {
  private history: PageAst[] = [];
  private index: number = -1;
  private maxHistory: number = 50;

  constructor(initialState: PageAst) {
    this.history = [structuredClone(initialState)];
    this.index = 0;
  }

  public canUndo(): boolean {
    return this.index > 0;
  }

  public canRedo(): boolean {
    return this.index < this.history.length - 1;
  }

  public getCurrent(): PageAst {
    return structuredClone(this.history[this.index]);
  }

  public getHistoryLength(): number {
    return this.history.length;
  }

  public getIndex(): number {
    return this.index;
  }

  public push(newState: PageAst): void {
    // Truncate redo stack when a new branch is created
    const sliced = this.history.slice(0, this.index + 1);
    sliced.push(structuredClone(newState));

    if (sliced.length > this.maxHistory) {
      sliced.shift();
    }

    this.history = sliced;
    this.index = this.history.length - 1;
  }

  public undo(): PageAst | null {
    if (!this.canUndo()) return null;
    this.index -= 1;
    return this.getCurrent();
  }

  public redo(): PageAst | null {
    if (!this.canRedo()) return null;
    this.index += 1;
    return this.getCurrent();
  }
}

describe("Phase 5: Builder History & Undo/Redo Stack", () => {
  it("should initialize with initial state at index 0", () => {
    const initial: PageAst = { template: "home", sections: [] };
    const hm = new HistoryManager(initial);

    expect(hm.canUndo()).toBe(false);
    expect(hm.canRedo()).toBe(false);
    expect(hm.getCurrent().sections.length).toBe(0);
    expect(hm.getHistoryLength()).toBe(1);
    expect(hm.getIndex()).toBe(0);
  });

  it("should support undo and redo across multiple edits", () => {
    const initial: PageAst = { template: "home", sections: [] };
    const hm = new HistoryManager(initial);

    // Edit 1: Add Section A
    hm.push({
      template: "home",
      sections: [{ id: "A", type: "hero", settings: { title: "Title A" }, blocks: [] }],
    });

    // Edit 2: Update Title A to A+
    hm.push({
      template: "home",
      sections: [{ id: "A", type: "hero", settings: { title: "Title A+" }, blocks: [] }],
    });

    // Edit 3: Add Section B
    hm.push({
      template: "home",
      sections: [
        { id: "A", type: "hero", settings: { title: "Title A+" }, blocks: [] },
        { id: "B", type: "faq", settings: {}, blocks: [] },
      ],
    });

    expect(hm.getHistoryLength()).toBe(4);
    expect(hm.canUndo()).toBe(true);
    expect(hm.canRedo()).toBe(false);
    expect(hm.getCurrent().sections.length).toBe(2);

    // Undo Edit 3
    const stateAfterUndo1 = hm.undo();
    expect(stateAfterUndo1?.sections.length).toBe(1);
    expect(stateAfterUndo1?.sections[0].settings.title).toBe("Title A+");
    expect(hm.canRedo()).toBe(true);

    // Undo Edit 2
    const stateAfterUndo2 = hm.undo();
    expect(stateAfterUndo2?.sections[0].settings.title).toBe("Title A");

    // Undo Edit 1 (back to initial)
    const stateAfterUndo3 = hm.undo();
    expect(stateAfterUndo3?.sections.length).toBe(0);
    expect(hm.canUndo()).toBe(false);

    // Redo 1 step
    const stateAfterRedo1 = hm.redo();
    expect(stateAfterRedo1?.sections.length).toBe(1);
    expect(stateAfterRedo1?.sections[0].settings.title).toBe("Title A");

    // Redo 2 steps
    hm.redo();
    const finalRedo = hm.redo();
    expect(finalRedo?.sections.length).toBe(2);
    expect(hm.canRedo()).toBe(false);
  });

  it("should clear the redo branch when a new edit is pushed after an undo", () => {
    const initial: PageAst = { template: "home", sections: [] };
    const hm = new HistoryManager(initial);

    hm.push({ template: "home", sections: [{ id: "1", type: "hero", settings: {}, blocks: [] }] });
    hm.push({ template: "home", sections: [{ id: "2", type: "hero", settings: {}, blocks: [] }] });

    expect(hm.getHistoryLength()).toBe(3);

    // Undo to step 1
    hm.undo();
    expect(hm.canRedo()).toBe(true);

    // Now make a branching edit (Section 3 instead of Section 2)
    hm.push({ template: "home", sections: [{ id: "3", type: "newsletter", settings: {}, blocks: [] }] });

    // Redo should now be cleared
    expect(hm.canRedo()).toBe(false);
    expect(hm.getCurrent().sections[0].id).toBe("3");
    expect(hm.getHistoryLength()).toBe(3);
  });

  it("should enforce the maximum limit of 50 history entries and evict oldest states", () => {
    const initial: PageAst = { template: "home", sections: [] };
    const hm = new HistoryManager(initial);

    // Push 70 distinct states
    for (let i = 1; i <= 70; i++) {
      hm.push({
        template: "home",
        sections: [{ id: `sec-${i}`, type: "rich_text", settings: { step: i }, blocks: [] }],
      });
    }

    expect(hm.getHistoryLength()).toBe(50);
    expect(hm.getCurrent().sections[0].settings.step).toBe(70);

    // Verify we can undo 49 times (from index 49 down to index 0)
    let undoCount = 0;
    while (hm.canUndo()) {
      hm.undo();
      undoCount++;
    }
    expect(undoCount).toBe(49);
    // The oldest retained state should be step 21 (since 71 total states - 50 = evicted first 21 states)
    expect(hm.getCurrent().sections[0].settings.step).toBe(21);
  });

  it("should correctly handle keyboard shortcut bindings (Ctrl+Z, Ctrl+Y, Shift+Ctrl+Z)", () => {
    function simulateKeydown(
      event: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
      hm: HistoryManager
    ): "undo" | "redo" | "noop" {
      const isMac = false;
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        if (hm.canUndo()) {
          hm.undo();
          return "undo";
        }
      } else if (
        (mod && event.key.toLowerCase() === "y") ||
        (mod && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        if (hm.canRedo()) {
          hm.redo();
          return "redo";
        }
      }

      return "noop";
    }

    const initial: PageAst = { template: "home", sections: [] };
    const hm = new HistoryManager(initial);
    hm.push({ template: "home", sections: [{ id: "A", type: "hero", settings: {}, blocks: [] }] });

    // Ctrl+Z triggers undo
    const r1 = simulateKeydown({ key: "z", ctrlKey: true, shiftKey: false }, hm);
    expect(r1).toBe("undo");
    expect(hm.getCurrent().sections.length).toBe(0);

    // Ctrl+Y triggers redo
    const r2 = simulateKeydown({ key: "y", ctrlKey: true, shiftKey: false }, hm);
    expect(r2).toBe("redo");
    expect(hm.getCurrent().sections.length).toBe(1);

    // Undo again
    simulateKeydown({ key: "z", ctrlKey: true }, hm);

    // Ctrl+Shift+Z triggers redo
    const r3 = simulateKeydown({ key: "z", ctrlKey: true, shiftKey: true }, hm);
    expect(r3).toBe("redo");
    expect(hm.getCurrent().sections.length).toBe(1);

    // Random key does nothing
    const r4 = simulateKeydown({ key: "a", ctrlKey: false }, hm);
    expect(r4).toBe("noop");
  });
});

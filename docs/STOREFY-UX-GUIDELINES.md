# STOREFY — Ultra-Premium UX Guidelines

> **Experience Target**: Clarity → Confidence → Speed → Control. Make the platform look simple. Keep the platform powerful. Make every interaction feel expensive.

---

## 1. Interaction Principles

### Progressive Disclosure
- Present essential form controls and primary metrics by default.
- Advanced settings (custom tax overrides, webhook retry policies, variant matrix rules) are revealed through tabs, collapsible panels, or detail drawers.
- Never overwhelm a merchant on initial page load with 50 unconfigured inputs.

### Keyboard-First Ergonomics
- Global Command Center via `Ctrl/Cmd + K`:
  - Quick navigation across all dashboard destinations.
  - Quick search across products, orders, customers, and settings.
- Standard keybindings:
  - `Esc`: Close open modal, drawer, or search dropdown.
  - `Enter`: Submit focused form or confirm primary dialog.
  - `F2`: Instant focus on POS catalog search input.

### Sub-10ms Intent-Based Pre-Warming
- Pointer-down and hover triggers pre-warm target dashboard routes using Next.js route prefetching.
- Keep client bundle sizes minimal: no heavy chart bundles or redundant icon packages.

---

## 2. Component UX Guidelines

### Tables & Data Grids
1. **Header**: Lightweight, uppercase font (10px), subtle bottom border (`border-b border-border`).
2. **Row Height**: Strictly 48–52px comfortable row density. Never bloated.
3. **Hover State**: Very subtle surface change (`hover:bg-muted/40`).
4. **Contextual Bulk Actions**: Selecting checkboxes toggles a floating contextual action bar (`X selected [Archive] [Delete] [Export]`).
5. **Pagination**: Subtle footer showing `1–25 of 1,284` with compact previous/next buttons.

### Forms & Editing
1. **Layout**: Maximum content width between `720px` and `960px` for optimal eye-tracking.
2. **Field Structure**:
   - `Label` (11–12px medium)
   - `Input` (8px radius, subtle border, quiet placeholder)
   - `Helper Text` (11px muted text)
   - `Error State` (11px destructive text with subtle red input border)
3. **Save Experience**:
   - Sticky action bar on long forms with explicit states: `Unsaved changes`, `Saving...`, `Saved`.
   - Never lose merchant input without a dirty-form confirmation prompt.

### AI Assist UX
- AI tools must appear as clean, inline assistants (e.g. `[✨ Generate with AI]`).
- Generated suggestions render in a quiet panel directly below or beside the input.
- Actions: `Apply`, `Copy`, `Dismiss`.
- Never insert animated gradients or flashy sparkles that distract from catalog entry.

### POS Counter Terminal UX
- Speed-optimized 3-zone layout:
  1. Products catalog & barcode search (left)
  2. Active cart stream with increment/decrement steppers (right)
  3. Cash / UPI / Card tender breakdown with instant change-due calculation (bottom right)
- Large touch-friendly controls with instant response and zero page reloads.

### Platform Admin UX
- Dedicated shell (`STOREFY ADMIN`) strictly separated from the merchant interface.
- Instant tenant oversight, verification queues, and audit trails.
- Same calm, restrained visual language as the merchant dashboard.

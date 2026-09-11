# STOREFY — Ultra-Premium Commerce OS Design System

> **Design Target**: Shopify-level Simplicity + Stripe-level Precision + Linear-level Polish + Premium Modern SaaS Quality.

---

## 1. Core Principles

The interface feels expensive because it is:
- **Precise**: Exact alignment, optical centering, 1px subtle borders, no floating drop shadows.
- **Calm**: Low visual noise, neutral canvas, restrained brand accent.
- **Spacious**: 8-point spacing grid, intentional whitespace allowing high information value without clutter.
- **Consistent**: A single canonical component library (`src/components/ui/*`). No ad-hoc variations.
- **Fast**: Intent-based pre-warming, sub-10ms navigation, lightweight DOM, 120–180ms micro-interactions.

---

## 2. Color System & Design Tokens

### Neutral Foundation
STOREFY utilizes an editorial neutral palette tuned identically across Light and Dark themes:

| Token | CSS Variable | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas** | `--background` | `hsl(0 0% 99%)` | `hsl(240 10% 4%)` | Primary page foundation |
| **Card / Surface** | `--card` | `hsl(0 0% 100%)` | `hsl(240 10% 6.5%)` | Elevated containers |
| **Muted Surface**| `--muted` | `hsl(240 4.8% 95.9%)` | `hsl(240 6% 12%)` | Input fills, subtle backgrounds |
| **Borders** | `--border` | `hsl(240 5.9% 90%)` | `hsl(240 6% 15%)` | 1px clean separation lines |
| **Primary Text** | `--foreground` | `hsl(240 10% 3.9%)` | `hsl(0 0% 98%)` | High-contrast editorial titles |
| **Muted Text** | `--muted-foreground`| `hsl(240 3.8% 46.1%)` | `hsl(240 5% 64.9%)` | Metadata, helpers, subtitles |

### Brand Accent
**Obsidian Slate-Indigo**: `hsl(224 76% 48%)` (Dark mode: `hsl(224 76% 54%)`).
Used strictly for:
- Primary CTA buttons
- Active navigation indicator (2.5px left border + subtle surface tint)
- Selected radio / segmented controls
- Critical hyperlinks

*Never used to tint entire cards, backgrounds, or data visualization areas.*

### Semantic Status Colors
| Status | Token | Accent Hue | Purpose |
| :--- | :--- | :--- | :--- |
| **Success** | `success` | `hsl(142 71% 45%)` | Active coupons, fulfilled orders, verified merchants |
| **Warning** | `warning` | `hsl(38 92% 50%)` | Low stock, pending verification, draft states |
| **Error / Destructive** | `destructive` | `hsl(0 84.2% 60.2%)` | Failed payouts, deleted items, out-of-stock items |
| **Info** | `info` | `hsl(217 91% 60%)` | Informational callouts, tracking numbers |
| **Neutral** | `neutral` | `hsl(240 5% 65%)` | Inactive items, archived products |

---

## 3. Typography & Numerals

UI Font Family: System Sans-Serif font stack (`Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`).

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 20–24px | 600 (Semibold) | 1.25 | Primary page H1 in PageHeader |
| **Section Title**| 14–16px | 600 (Semibold) | 1.35 | CardHeader, group headers |
| **Body** | 13–14px | 400 (Regular) | 1.5 | Standard reading, form descriptions |
| **Labels** | 11–12px | 500 (Medium) | 1.2 | Form field labels, table headers |
| **Metadata** | 10–11px | 400 (Regular) | 1.2 | Timestamps, SKU chips, secondary status |

### Tabular Numerals (`font-tabular`)
All monetary sums (Paise / Rupees), counts, percentages, and dates use tabular numerals:
```css
.font-tabular {
  font-variant-numeric: tabular-nums;
}
```
Helper utilities in `src/lib/design-tokens.ts`:
- `formatTabularINR(amountInPaise)` -> `₹1,24,500.00`
- `formatTabularNumber(value)` -> `1,284`
- `formatPercentageDelta(delta)` -> `↑ 12.4%`

---

## 4. Spacing, Borders & Radius

- **8-Point Spacing Grid**: `4px (1)`, `8px (2)`, `12px (3)`, `16px (4)`, `20px (5)`, `24px (6)`, `32px (8)`, `48px (12)`, `64px (16)`.
- **Border Radii**:
  - `6px` (`rounded-md`): Small controls, badges, buttons, chips.
  - `8px` (`rounded-lg`): Form inputs, standard cards, dropdown popovers.
  - `12px` (`rounded-xl`): Outer containers, modal dialogs, drawers.
- **Borders over Shadows**: STOREFY relies on crisp 1px borders (`border border-border`) and minimal or zero drop shadows (`shadow-xs` / `shadow-none`). Floating drop shadows are banned.

---

## 5. Canonical UI Components

All pages import strictly from canonical definitions in `src/components/ui/*`:

1. **`Button`** (`button.tsx`):
   - Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `subtle`.
   - Micro-interaction: `duration-150 active:scale-[0.99]`.
2. **`Badge`** (`badge.tsx`):
   - Semantic variants: `success`, `warning`, `error`, `info`, `neutral`, `secondary`.
   - Optional `dot` prop for live state pulse.
3. **`Card`** (`card.tsx`):
   - Border-first design, calm 8px radius, zero floating drop shadow.
4. **`StatCard`** (`stat-card.tsx`):
   - Label, tabular value, trend delta, and optional icon.
5. **`PageHeader`** (`page-header.tsx`):
   - Breadcrumb navigation, H1, description sentence, and right-aligned action group.
6. **`Table` & `DataTable`** (`table.tsx`):
   - Compact 48–50px row density, theme-aware hover highlight, aligned tabular figures.
7. **`FilterBar`** (`filter-bar.tsx`):
   - Search input, filter dropdowns, active filter chips, and contextual bulk selection bar.
8. **`EmptyState`** (`empty-state.tsx`):
   - Calm, uncluttered empty representation with clear primary CTA.
9. **`CommandPalette`** (`command-palette.tsx`):
   - Global `Ctrl/Cmd + K` Command Center across catalog, orders, customers, and routes.
10. **`Timeline`** (`timeline.tsx`):
    - Linear chronological event stream with status dots for orders and fulfillment.

---

## 6. Motion & Micro-Interactions

- **Timing**:
  - Default transitions: `120ms – 150ms ease-out`
  - Modal / Drawer transitions: `180ms – 200ms ease-out`
- **Philosophy**:
  - Motion is strictly functional (feedback on hover, focus, open/close).
  - No decorative or bouncy animations.

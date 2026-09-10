# PHASE 5 IMPLEMENTATION: STOREFY THEME CUSTOMIZER

## Executive Summary

Phase 5 delivers **STOREFY Theme Customizer**, a production-grade, Shopify-style visual storefront builder for multi-tenant ecommerce stores. Rather than a generic unstructured free-form canvas or raw HTML editor, STOREFY implements a strict, schema-driven JSON AST hierarchy:

$$\text{Theme} \longrightarrow \text{Template} \longrightarrow \text{Section} \longrightarrow \text{Block} \longrightarrow \text{Element / Content}$$

The customizer operates with zero-trust multi-tenant isolation, safe dynamic data interpolation, draft vs. published separation, an in-memory 50-step undo/redo stack, and atomic rollback to immutable version snapshots. The customer storefront and the customizer canvas share the exact same `SectionRenderer` engine, eliminating visual drift between preview and production.

---

## 1. Core Architecture & Hierarchy

### Strict Hierarchical Model
```
Store Theme (Global design tokens, colors, typography, layout)
  └── Template (e.g. home, products, collections, about, contact)
       └── Page (Domain 2 record: pages)
            └── Section (Configurable functional area, e.g. hero, testimonials, faq)
                 └── Block (Content items inside section, e.g. heading, button, faq_item)
                      └── Element / Content (Dynamic text, links, media, bindings)
```

### JSON AST Schema
Stored in PostgreSQL `jsonb` columns: `pages.draft_content` (active work-in-progress) and `pages.content` (live published storefront):

```typescript
export interface PageAst {
  template: string;
  sections: SectionNode[];
}

export interface SectionNode {
  id: string;
  type: string;
  name?: string;
  settings: Record<string, unknown>;
  blocks: BlockNode[];
  styles?: ResponsiveStyles;
  isHidden?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
}

export interface BlockNode {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  styles?: ResponsiveStyles;
  isHidden?: boolean;
  isLocked?: boolean;
}
```

---

## 2. Canonical Section & Block Library

### 19 Canonical Section Presets
Across the 6 canonical categories:
- **HERO:** Hero (`hero`), Hero with Image (`hero_image`), Hero with Video (`hero_video`).
- **CONTENT:** Rich Text (`rich_text`), Image + Text (`image_text`), Feature Grid (`feature_grid` / `multicolumn`), Image Gallery (`image_gallery`).
- **COMMERCE:** Product Grid (`product_grid`), Featured Collection (`featured_collection`), Collection Grid (`collection_grid`).
- **TRUST:** Testimonials (`testimonials`), Trust Badges (`trust_badges`), Reviews (`reviews`).
- **MARKETING:** Announcement Bar (`announcement_bar`), Promo Banner (`promo_banner`), Countdown Timer (`countdown`), Newsletter (`newsletter`), Call to Action (`cta`).
- **BUSINESS:** Contact & Care (`contact`), FAQ Accordion (`faq`), Logo List (`logo_list`), Social Links (`social_links`).

### 18 Canonical Block Types
`heading`, `text`, `rich_text`, `button`, `image`, `icon`, `product`, `collection`, `price`, `rating`, `social_link`, `feature`, `testimonial`, `video`, `spacer`, `divider`, `faq_item`, `badge`.

### Section & Block Operations
- **Section Operations:** Add, remove, reorder (drag & accessible Up/Down), duplicate, copy, paste, hide/show, lock/unlock, edit settings.
- **Block Operations:** Add (from section's `allowedBlocks`), remove, reorder (move Up/Down), duplicate, copy, paste, hide/show, lock/unlock, edit content and typography.
- **ID Regeneration Invariant:** Copying and duplicating sections or blocks always regenerates fresh, unique UUIDs/nanoids for the target and all child nodes. IDs are never duplicated.

---

## 3. Builder Workspace (3-Panel Layout)

### Route Structure
- `/dashboard/online-store/themes`: Themes Hub showcasing the active theme, published version, and quick customizer access.
- `/dashboard/online-store/themes/customizer`: Full-screen 3-panel customizer workspace.

### Panel Breakdown
```
┌────────────────────────────────────────────────────────────────────────┐
│ Template ▾    [Desktop] [Tablet] [Mobile]    Undo  Redo    Save   Publish │
├──────────────┬───────────────────────────────────────────┬─────────────┤
│ LEFT PANEL   │               LIVE CANVAS                 │ RIGHT PANEL │
│              │                                           │             │
│ • Sections   │   Real Storefront Preview (100% Shared)   │ Contextual  │
│ • Add Sect.  │                                           │ Inspector:  │
│ • Theme Tok. │   - Click-to-select outline               │ - Content   │
│ • Presets    │   - Reorder & duplicate controls          │ - Spacing   │
│              │   - Live CSS Custom Properties applied    │ - Styles    │
└──────────────┴───────────────────────────────────────────┴─────────────┘
```

1. **Top Toolbar**: Template switcher, viewport controls (Desktop 100%, Tablet 768px, Mobile 375px), in-memory Undo/Redo stack triggers, unsaved changes indicator, Save Draft, Publish, and Version History dialog.
2. **Left Panel**:
   - **Tree Structure**: Reorder (Up/Down), duplicate, delete, hide/show, lock/unlock sections and nested child blocks.
   - **Add Section**: 19 section palette grouped by category with one-click insertion.
   - **Theme Settings**: Real-time palette control (primary, accent, background), typography font family selection, and border radius tokens.
   - **Starter Archetypes**: 5 one-click starter themes (Modern Minimal, Couture & Apparel, Aura Beauty, Apex Tech, Velocity Dropship).
3. **Center Live Canvas**:
   - Renders using `SectionRenderer` (the identical component used on the public storefront).
   - Dynamic viewport sizing with realistic device frames and drop shadows.
   - Click-to-select outlines and contextual quick-action buttons.
4. **Right Inspector**:
   - Dynamic contextual inspector displaying content, spacing, links, text areas, and dynamic data binding helpers based on the selected section or block node.

---

## 4. Undo / Redo & History Stack

An in-memory 50-step undo/redo stack (`HistoryManager` / React state):
- Tracks granular AST and theme setting modifications.
- Pushing any edit truncates the redo stack to prevent branching conflicts.
- Capped at 50 entries to maintain minimal memory overhead without saving every keystroke to PostgreSQL.
- Supported keyboard shortcuts:
  - **Undo**: `Ctrl+Z` / `Cmd+Z`
  - **Redo**: `Ctrl+Y` / `Cmd+Shift+Z`
  - **Deselect**: `Escape`

---

## 5. Safe Dynamic Data Bindings (Zero Eval)

STOREFY implements a whitelist-only interpolation engine (`interpolateBindings`):

$$\text{Syntax: } \{\{\text{ scope.key }\}\}$$

### Approved Whitelist
- `store`: `name`, `subdomain`, `customDomain`, `currency`, `logoUrl`, `description`
- `product`: `title`, `description`, `price`, `compareAtPrice`, `sku`, `primaryImageUrl`
- `collection`: `title`, `description`, `productsCount`

### Security Safeguards
- Strictly validates property existence via `Object.prototype.hasOwnProperty`.
- Built-in prototype traversal (`__proto__`, `constructor`, `prototype`) returns `undefined`.
- Zero execution of `eval()`, `Function()`, or arbitrary JavaScript expressions.
- Missing values fall back gracefully without runtime exceptions.

---

## 6. Draft vs. Published Isolation & Atomic Rollback

```
+-----------------------------------------------------------+
| Merchant edits in customizer                              |
|   -> Draft AST saved to pages.draft_content               |
|   -> Draft tokens saved to store_themes.draft_settings    |
+-----------------------------------------------------------+
                             |
                   Click "Publish Theme"
                             |
                             v
+-----------------------------------------------------------+
| Atomic Publication (Server Action):                       |
|   1. Promotes draft_content -> pages.content              |
|   2. Promotes draft_settings -> store_themes.settings     |
|   3. Increments theme version (e.g. v1 -> v2)             |
|   4. Records immutable snapshot in theme_versions table   |
|   5. Revalidates ISR / Edge cache for storefront domains  |
+-----------------------------------------------------------+
                             |
                    Customer Storefront
         (Consumes ONLY published pages.content)
```

### Immutable Rollback
When rolling back to any historical version snapshot:
1. Snapshot AST is restored to `pages.content` and `pages.draft_content`.
2. A **new** revision record is appended to `theme_versions` (`v4 -> v5 (Rollback to v2)`). Historical revision records remain strictly immutable.

---

## 7. Multi-Tenant Security & RBAC Enforcement

All builder operations run through server actions (`saveThemeDraftAction`, `publishThemeAction`, `rollbackThemeVersionAction`) guarded by Phase 2 RBAC:

| Role | builder:read | builder:write | builder:publish |
| :--- | :---: | :---: | :---: |
| **OWNER** | Yes | Yes | Yes |
| **ADMIN** | Yes | Yes | Yes |
| **MARKETING_MANAGER** | Yes | Yes | No (Draft Only) |
| **PRODUCT_MANAGER** | Yes | No | No |
| **SUPPORT** | No | No | No |

### Cross-Tenant Boundary
Every database mutation resolves tenant context exclusively via `requirePermission()` from authenticated sessions. Store IDs, Theme IDs, and Revision IDs sent by the client are strictly cross-verified against `ctx.store.id`. Merchant A is blocked at both the application layer and PostgreSQL RLS from viewing, editing, publishing, or rolling back Merchant B's theme.

---

## 8. Verification Results

| Suite | Status | Details |
| :--- | :---: | :--- |
| **Unit Tests** | Passed | 20 test files, 134 tests passing (`vitest run`) |
| **TypeScript** | Passed | `tsc --noEmit` exited with code 0 (0 errors) |
| **ESLint** | Passed | `eslint .` exited with code 0 (0 errors, 0 warnings) |
| **Production Build** | Passed | `next build` succeeded with all 23 static & dynamic routes |
| **Database Verification** | Passed | `npm run db:verify` latency 1574ms against hosted Supabase |
| **Database Migrations** | Passed | `0003_clever_jetstream.sql` applied successfully |

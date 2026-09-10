# STOREFY — Theme Customizer Specification
## Shopify-Style Visual Storefront Customization System

**Document Version:** 2.0.0  
**Phase:** 5 — Visual Storefront Customization System  
**Product Name:** STOREFY THEME CUSTOMIZER  
**Module Directory:** `src/modules/builder`  
**Subsystem:** Section & Block-Driven Visual Storefront Customizer & Theme Engine  

---

## 1. Architectural Paradigm: Section & Block Hierarchy

STOREFY Theme Customizer abandons the obsolete concept of a generic, free-form, absolute-positioned page builder. Unrestricted drag-and-drop page builders produce brittle DOM trees, inconsistent responsive layouts, and cognitive overload for ecommerce merchants.

Instead, STOREFY adopts the proven, predictable, production-grade **Shopify-style customization model**:

$$\mathbf{Theme} \longrightarrow \mathbf{Template} \longrightarrow \mathbf{Section} \longrightarrow \mathbf{Block} \longrightarrow \mathbf{Element / Content}$$

```
[Store Theme]
  │ (Global design tokens: color palette, typography scale, component radii, shadows, layout width)
  │
  └── [Template]
        │ (Structural layout archetype: Home, Products, Collections, About, Contact, Custom)
        │
        └── [Page Record]
              │ (Domain 2 document mapped to storeId and slug in PostgreSQL)
              │
              └── [Section]
                    │ (Primary layout module: Hero Banner, Product Grid, Testimonials, FAQ)
                    │ (Properties: id, type, settings, responsive config, visibility, sortOrder)
                    │
                    └── [Block]
                          │ (Structured content unit inside a section: Heading, Text, Button, FAQ Item)
                          │ (Properties: id, type, settings, allowed by parent section definition)
                          │
                          └── [Element / Content / Dynamic Binding]
                                (Rendered DOM primitives, inline text, safe tokens like {{ store.name }})
```

### 1.1 Core Architectural Principles

1. **Structured & Predictable:** Every page is composed of modular sections; sections contain strictly validated blocks. No arbitrary free-floating DOM nodes or canvas drag overlays that break mobile responsiveness.
2. **Schema-Driven JSON AST:** Pages and theme settings are stored strictly as structured JSON in PostgreSQL (`pages.content`, `pages.draft_content`, `store_themes.settings_schema`, `store_themes.draft_settings`). Never store generated HTML as the primary source of truth.
3. **Zero Visual Drift (Shared Renderer):** The customizer live canvas and the customer-facing storefront use the **exact same** shared section rendering engine (`SectionRenderer`). The customizer does not create a fake or simulated approximation.
4. **Draft vs. Published Isolation:** Edits remain isolated in draft state until explicitly published. Publishing is atomic, increments the theme revision number, and captures an immutable snapshot in `theme_versions`.
5. **One-Click Immutable Rollback:** Rollback restores an exact prior revision snapshot by appending a new revision event without mutating or deleting historical version records.

---

## 2. Canonical JSON AST Specification

```typescript
/**
 * Complete Page AST Root
 */
export interface PageAst {
  schemaVersion: number; // e.g. 1 (version compatibility engine)
  template: string; // "home" | "products" | "collections" | "about" | "contact" | "custom"
  sections: SectionNode[];
}

/**
 * Section Node Specification
 */
export interface SectionNode {
  id: string; // Unique UUID or nanoid
  type: SectionType; // e.g. "hero", "featured_collection", "testimonials", "faq"
  name?: string; // Optional merchant-assigned label (e.g. "Summer Sale Hero")
  settings: Record<string, unknown>; // Section-level configuration (padding, layout, background)
  blocks: BlockNode[]; // Reusable child blocks allowed by SectionDefinition
  styles?: ResponsiveStyles; // Desktop, tablet, and mobile style overrides
  isHidden?: boolean; // Toggles public visibility without deleting
  isLocked?: boolean; // Prevents accidental edits or reordering
  sortOrder?: number; // Ordering sequence
}

/**
 * Block Node Specification
 */
export interface BlockNode {
  id: string; // Unique UUID or nanoid
  type: BlockType; // e.g. "heading", "text", "button", "image", "faq_item", "testimonial"
  settings: Record<string, unknown>; // Block-specific content & styling
  styles?: ResponsiveStyles; // Responsive overrides
  isHidden?: boolean; // Toggled visibility
  isLocked?: boolean; // Locked against deletion/mutation
}

/**
 * Responsive Overrides Matrix
 */
export interface ResponsiveStyles {
  desktop?: Record<string, unknown>;
  tablet?: Record<string, unknown>;
  mobile?: Record<string, unknown>;
}
```

---

## 3. Customizer Workspace Layout

The customizer implements a streamlined 3-panel SaaS workspace:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STOREFY THEME CUSTOMIZER                                                              │
│ Template: [ Home ▾ ]    Viewport: [ Desktop | Tablet | Mobile ]    Undo  Redo  Preview │
│                                                        Status: [ Draft ]   Save  Publish │
├───────────────────┬────────────────────────────────────────────┬───────────────────────┤
│ LEFT PANEL (320px)│ LIVE STOREFRONT CANVAS                     │ RIGHT INSPECTOR(340px)│
│                   │                                            │                       │
│ Tabs:             │ Real Storefront Renderer Frame             │ Dynamic Inspector:    │
│ • Structure       │                                            │                       │
│   - Sections Tree │ - Click-to-select outline                  │ If SECTION selected:  │
│   - Blocks Tree   │ - Section action buttons (Up/Down/Del)     │ - Section Settings    │
│ • Add Section     │ - In-place inline text editing             │ - Spacing & Padding   │
│ • Theme Settings  │ - Device frame (Desktop/Tablet/Mobile)     │ - Background & Colors │
│ • Presets Library │ - Live CSS Custom Properties applied       │                       │
│                   │ - Safe dynamic data bindings               │ If BLOCK selected:    │
│ Tree Actions:     │                                            │ - Content & Labels    │
│ - Reorder         │                                            │ - Destination Links   │
│ - Duplicate       │                                            │ - Dynamic Data Tokens │
│ - Hide / Show     │                                            │                       │
│ - Lock / Unlock   │                                            │ If THEME selected:    │
│                   │                                            │ - Global Color Tokens │
│                   │                                            │ - Typography Scales   │
│                   │                                            │ - Border Radii/Shadows│
└───────────────────┴────────────────────────────────────────────┴───────────────────────┘
```

### 3.1 Top Toolbar
- **Template / Page Selector:** Switch active editing template (`Home`, `Products`, `Collections`, `About`, `Contact`, `Custom Pages`).
- **Viewport Switches:**
  - **Desktop:** 100% fluid container.
  - **Tablet:** 768px device frame with realistic bezel preview.
  - **Mobile:** 375px bounded smartphone preview.
- **Undo / Redo:** Triggers in-memory 50-step history stack.
- **Save Draft:** Persists active AST to `pages.draft_content` and `store_themes.draft_settings`.
- **Publish Theme:** Atomically promotes draft AST to live production and records snapshot.
- **Version History:** Opens modal displaying historical versions with one-click rollback.

### 3.2 Left Sidebar (Structure, Add, Themes, Presets)
- **Structure Tab:** Collapsible tree displaying all sections on the template with child blocks nested inside. Supports reordering via move up/down controls, duplication with unique ID generation, delete with confirmation, hide/show toggle, and lock/unlock toggle.
- **Add Section Tab:** Curated library of 19 sections organized by canonical categories with real-time search.
- **Theme Settings Tab:** Centralized configuration of global theme tokens (Colors, Typography, Border Radii, Container Max Width).
- **Presets Tab:** One-click application of starter archetype templates.

### 3.3 Live Storefront Canvas
- Center iframe or sandboxed container executing the **identical** storefront engine used in production (`SectionRenderer`).
- Click-to-select visual highlights and contextual outline frames.
- Hover indicators showing section and block names.
- Touch-safe controls on smaller viewports.

### 3.4 Right Contextual Inspector
- Adapts dynamically to the selected node (Section, Block, or Global Theme).
- Displays only controls relevant to the selected element.
- Input controls for content, URLs, typography, padding, colors, ratings, FAQs, and dynamic data bindings.

---

## 4. Reusable Section & Block Catalog

### 4.1 Canonical 19 Sections Library (8 Core Categories)

| Category | Section Key | Label | Description & Default Settings | Allowed Child Blocks |
| :--- | :--- | :--- | :--- | :--- |
| **Media** | `hero` | Hero Banner | High-impact visual banner with headline, subhead, CTA buttons. | `heading`, `text`, `button`, `image` |
| **Media** | `video` | Video Banner | Playable video showcase with dark gradient scrim. | `heading`, `text`, `button` |
| **Media** | `image_gallery` | Curated Gallery | Multi-image lifestyle or product presentation. | `image`, `heading` |
| **Content** | `rich_text` | Rich Text | Centered or aligned editorial narrative. | `heading`, `text`, `button`, `divider` |
| **Content** | `image_text` | Image + Text | 50/50 split layout pairing imagery with editorial copy. | `heading`, `text`, `button`, `image` |
| **Content** | `multicolumn` | Multicolumn | 2, 3, or 4-column value proposition feature blocks. | `heading`, `feature` |
| **Content** | `split_content` | Split Content | Balanced dual-purpose split section. | `heading`, `text`, `button`, `image` |
| **Commerce** | `featured_collection`| Featured Collection | Showcase curated collection items with direct catalog links. | `heading`, `text` |
| **Commerce** | `product_grid` | Product Grid | Responsive multi-column catalog grid activating with Phase 6. | `heading`, `text` |
| **Commerce** | `collection_grid` | Collection Grid | Category discovery cards highlighting store collections. | `heading`, `text` |
| **Trust** | `testimonials` | Customer Reviews | Testimonial review cards with star ratings & verified buyer badges. | `heading`, `testimonial` |
| **Marketing**| `announcement_bar` | Announcement Bar | Top-of-store promotional banner (e.g. Free shipping pan-India). | None (direct settings) |
| **Marketing**| `newsletter` | Newsletter Signup | High-conversion lead-capture email form. | `heading`, `text` |
| **Marketing**| `promo_banner` | Promo Banner | Highlighted discount voucher strip with coupon code. | `heading`, `text`, `button` |
| **Marketing**| `countdown` | Drop Countdown | Urgent flash-sale or drop countdown timer with live ticks. | `heading`, `text`, `button` |
| **Marketing**| `cta` | Call to Action | High-impact closing banner driving checkout or catalog visits. | `heading`, `text`, `button` |
| **Business** | `faq` | FAQ Accordion | Collapsible accordion dropdowns for customer questions. | `heading`, `faq_item` |
| **Business** | `contact` | Contact & Hours | Store contact details, support hours, WhatsApp link. | `heading`, `text`, `button` |
| **Business** | `logo_list` | Partner Brands | Media and partner recognition logo banner. | `heading`, `image` |

### 4.2 Canonical 18 Blocks Library
- `heading`: Structural headers (`h1`-`h6`) with typography scale controls.
- `text`: Body paragraph text supporting rich narrative.
- `rich_text`: Formatted longform copy.
- `button`: Interactive action button (`primary`, `secondary`, `outline`) with destination URL.
- `link`: Text hyperlink.
- `image`: Optimized responsive image block.
- `icon`: Lucide icon picker block.
- `video`: Video playback frame.
- `spacer`: Vertical height spacer.
- `divider`: Subtle horizontal separator rule.
- `feature`: Icon + Title + Description value proposition card.
- `testimonial`: Quote + Author + Star Rating (1-5) + Verified Buyer badge.
- `faq_item`: Collapsible question and answer pair.
- `social_link`: Social media profile links.
- `product`: Single product highlight card (plugs into Phase 6 catalog).
- `product_list`: Horizontal or vertical product list.
- `collection`: Collection reference banner.
- `rating`: Star rating indicator.

---

## 5. Dynamic Data Binding Engine (Zero-Eval Security)

The customizer supports safe dynamic tokens evaluated at render time:

$$\mathbf{Syntax: } \{\{\mathbf{ scope.key }\}\}$$

### 5.1 Whitelisted Path Dictionary
- `store`: `name`, `subdomain`, `customDomain`, `currency`, `logoUrl`, `description`, `phone`
- `product`: `title`, `description`, `price`, `compareAtPrice`, `sku`, `primaryImageUrl`
- `collection`: `title`, `description`, `productsCount`

### 5.2 Zero-Trust Security Safeguards
1. **No Code Execution:** The binding evaluator never invokes `eval()`, `Function()`, or arbitrary JavaScript.
2. **Prototype Pollution Immunization:** All path lookups strictly verify `Object.prototype.hasOwnProperty`. Traversal attempts on `__proto__`, `constructor`, or `prototype` return `undefined`.
3. **Truthful Empty States:** When Phase 6 commerce data is not yet present, tokens display truthful, styled empty states rather than mocked or fake data.
4. **Missing Field Resilience:** Unrecognized or missing tokens gracefully fall back without throwing runtime errors or disrupting page rendering.

---

## 6. Draft vs. Published Isolation & Atomic Versioning

```
+--------------------------------------------------------------------+
| 1. Merchant visual edits in Customizer                             |
|    - Draft AST stored in pages.draft_content                       |
|    - Draft settings stored in store_themes.draft_settings          |
+--------------------------------------------------------------------+
                               │
                       "Publish Theme"
                               │
                               ▼
+--------------------------------------------------------------------+
| 2. Atomic Server Action (publishThemeAction):                      |
|    - pages.content = pages.draft_content                           |
|    - store_themes.settings_schema = store_themes.draft_settings    |
|    - store_themes.version = version + 1                            |
|    - INSERT INTO theme_versions (snapshot_ast, version_number)     |
|    - Revalidate Next.js cache (revalidatePath)                     |
+--------------------------------------------------------------------+
                               │
                               ▼
+--------------------------------------------------------------------+
| 3. Customer Storefront:                                            |
|    - Strictly queries pages.content                                |
|    - Consumes ONLY published theme settings                        |
|    - Completely isolated from in-progress draft edits              |
+--------------------------------------------------------------------+
```

### 6.1 One-Click Rollback Architecture
- The `theme_versions` table maintains immutable snapshots of previous published states.
- Selecting "Rollback" loads the targeted snapshot, restores it into `pages.content`, and writes a **new** revision record representing the rollback event (`v4 -> v5 (Rollback to v2)`).
- Historical revision records are **never mutated or deleted**.

---

## 7. In-Memory 50-Step Undo / Redo Stack

- Dedicated history manager maintaining up to 50 previous states in client memory.
- Every section/block mutation (add, delete, reorder, update setting, duplicate) records a state snapshot.
- Pushing a new mutation from an undone state cleanly evicts the redo stack to prevent invalid state branching.
- **Keyboard Shortcuts:**
  - `Ctrl + Z` / `Cmd + Z`: Undo
  - `Ctrl + Y` / `Cmd + Shift + Z`: Redo
  - `Escape`: Deselect active inspector element

---

## 8. Multi-Tenant Security & RBAC Guarantees

All customizer operations enforce the canonical Phase 2 security model:

```typescript
// Enforced in all Server Actions:
const ctx = await requirePermission("builder:write"); // or "builder:publish" / "builder:read"
```

### 8.1 RBAC Permission Matrix
- `builder:read`: Permission to view the customizer and preview templates.
- `builder:write`: Permission to add/reorder/edit sections, edit blocks, and save drafts.
- `builder:publish`: Permission to publish draft themes to the live storefront and trigger rollbacks.

### 8.2 Cross-Tenant Boundary Invariant
- Tenant context is resolved strictly from verified server-side session cookies via `getTenantContext()`.
- Client-supplied `store_id`, `theme_id`, or `version_id` values are never trusted without cross-verifying that `target.store_id === ctx.store.id`.
- Merchant A cannot read, edit, publish, or rollback Merchant B's theme under any circumstances.

---

## 9. Performance, Accessibility & Mobile Usability

1. **Server Components:** Route loaders and permission verifiers execute as Next.js Server Components. Client components are restricted strictly to interactive editor canvas features.
2. **Shared Rendering:** Using `SectionRenderer` across both customizer preview and storefront eliminates redundant rendering logic and prevents visual bugs.
3. **Accessibility:**
   - Keyboard accessible navigation across section tree and inspector controls.
   - Screen-reader labels on all icon buttons.
   - Accessible alternative controls (Up/Down buttons) alongside drag-and-drop.
4. **Mobile Usability:** The customizer adapts its workspace on mobile viewports with collapsible side drawers so merchants can manage sections on mobile devices.

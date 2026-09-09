# STOREFY — Visual Storefront Builder Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Subsystem:** Visual Storefront Builder & Dynamic Theme Engine  
**Module Directory:** `src/modules/builder`

---

## 1. Builder Architecture & Schema Model

The STOREFY visual builder is a schema-driven, headless page construction engine. Pages are modeled as an immutable Abstract Syntax Tree (AST) stored as JSONB in PostgreSQL. The builder never produces brittle, ad-hoc HTML strings; instead, it outputs structured data rendered deterministically by the storefront engine.

### 1.1 Structural Hierarchy

The builder model enforces an eight-tier structural hierarchy:

```
[Theme] (Global Tokens: typography, color palette, spacing, component styles)
  └── [Template] (Structural archetype: Fashion, Beauty, One-Product, Dropship)
       └── [Page] (Routed document: Home, Product Detail, Collection, Custom)
            └── [Section] (Major page block: Hero, Product Grid, Reviews, Footer)
                 └── [Container] (Responsive layout wrapper: Flex, Grid, Stack)
                      └── [Block] (Compound visual grouping: Feature Card, Testimonial)
                           └── [Element] (Atomic UI node: Heading, Button, Price, Image)
                                └── [Dynamic Binding] (Safe schema-driven token: Product.price)
```

### 1.2 JSON AST Specification

```typescript
// Complete Page AST Root
interface PageAst {
  id: string;
  themeId: string;
  slug: string;
  pageType: "HOME" | "PRODUCT" | "COLLECTION" | "CART" | "CHECKOUT" | "CUSTOM";
  sections: SectionNode[];
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
}

// Section Node Structure
interface SectionNode {
  id: string; // UUID
  type: SectionType; // e.g. "hero_split", "product_grid"
  name: string; // User-defined label (e.g. "Spring Promo Hero")
  isHidden: boolean;
  isLocked: boolean;
  sortOrder: number;
  settings: Record<string, any>; // Section-level options (padding, background)
  containers: ContainerNode[];
}

// Container & Element Node Structure
interface ContainerNode {
  id: string;
  layout: "flex" | "grid" | "stack";
  responsiveStyles: ResponsivePropertyMap;
  elements: ElementNode[];
}

interface ElementNode {
  id: string;
  type: ElementType; // e.g. "heading", "add_to_cart", "price"
  content: Record<string, any>; // Static text or image URLs
  styles: ResponsivePropertyMap; // Typography, colors, borders, shadows, spacing
  bindings?: Record<string, string>; // Dynamic bindings (e.g. {"text": "Product.title"})
  children?: ElementNode[]; // Nested child elements
}
```

---

## 2. Builder Workspace UI Layout

The builder workspace is designed for high-efficiency visual customization:

```
+-----------------------------------------------------------------------------------------+
| [Back] Store: Acme  | Viewport: [Desktop | Tablet | Mobile] | [Undo] [Redo] | [Publish] |
+-----------------------------------------------------------------------------------------+
| LEFT PANEL (320px)  | CANVAS (Center Scrollable Workspace)      | RIGHT PANEL (360px)   |
| ------------------  | ----------------------------------------- | --------------------- |
| Tabs:               | Interactive Iframe or Sandboxed DOM       | Tabs:                 |
| - Elements          | - Drag target highlights                  | - Content             |
| - Sections          | - Hover outline & action pill             | - Layout / Spacing    |
| - Templates         | - Real-time responsive resize             | - Typography          |
| - Pages             | - Direct text inline-editing              | - Colors & Background |
| - Layers (Tree)     | - Safe placeholder fallbacks              | - Borders & Shadows   |
| - Media Library     |                                           | - Responsive Settings |
| - Dynamic Data      |                                           | - Advanced / Binding  |
+-----------------------------------------------------------------------------------------+
```

### 2.1 Left Panel Capabilities

- **Elements Tab:** Categorized palette of atomic elements ready for drag-and-drop insertion.
- **Sections Tab:** Pre-configured section blocks with live visual previews.
- **Templates Tab:** Switch or duplicate baseline templates without losing underlying store data.
- **Pages Tab:** Create, rename, duplicate, delete, and configure SEO for store pages.
- **Layers (Tree View):** Full hierarchical DOM tree showing nested sections, containers, and elements with drag-to-reorder, lock, hide, and rename controls.
- **Media Library:** Direct access to store media assets with search, folders, and immediate upload.
- **Dynamic Data:** Visual browser of available dynamic fields for data-bound pages.

### 2.2 Canvas & Viewport Modes

- **Desktop Viewport:** 100% fluid width (min 1280px).
- **Tablet Viewport:** 768px bounded width with device frame indicator.
- **Mobile Viewport:** 375px bounded width simulating modern smartphone screens.

### 2.3 Required Canvas Operations

1. **Drag & Drop:** Precision drop-indicators showing target insert position (before, after, or nested).
2. **Reorder & Move:** Drag via tree handle or canvas element header.
3. **Resize:** Interactive handles for width, columns, and container padding.
4. **Duplicate / Copy / Paste:** Hotkey support (`Ctrl+C`, `Ctrl+V`, `Ctrl+D`) preserving all nested element styles and bindings.
5. **Delete:** With confirmation protection if element contains bindings.
6. **Multi-Select:** Group styling across multiple elements.
7. **Lock & Hide:** Lock prevents accidental edits; hide toggles storefront visibility without deleting.
8. **Undo / Redo Stack:** In-memory immutable history capturing up to 50 operations.
9. **Publish & Rollback:** Atomic promotion of draft AST to active storefront; instant rollback to any historical `theme_versions` snapshot.

---

## 3. Builder Element Catalog (Section 9 Compliance)

All 8 categories and required elements must be implemented with dedicated schemas:

| Category      | Elements                                                                                                                                                                                                                                                                              | Supported Customization Properties                                                                                                      |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**     | `Heading`, `Text`, `Rich Text`, `Button`, `Link`, `Icon`, `Divider`, `Spacer`                                                                                                                                                                                                         | Tag (`h1`-`h6`, `p`), Font Family, Weight, Line Height, Color, Alignment, Link URL, Icon Picker, Border Style, Height                   |
| **Media**     | `Image`, `Image Gallery`, `Video`, `Video Background`, `Image Comparison`, `Slider`, `Carousel`                                                                                                                                                                                       | Media URL, Aspect Ratio, Object Fit, Autoplay, Loop, Controls, Overlay Color, Transition Speed, Navigation Dots                         |
| **Layout**    | `Container`, `Row`, `Column`, `Grid`, `Stack`, `Flex`                                                                                                                                                                                                                                 | Columns (1-12), Gap (X/Y), Justify Content, Align Items, Flex Direction, Max Width, Padding, Margin                                     |
| **Commerce**  | `Product`, `Product Grid`, `Product Carousel`, `Collection`, `Collection Grid`, `Price`, `Compare-at Price`, `Rating`, `Reviews`, `Product Options`, `Variant Selector`, `Quantity Selector`, `Add to Cart`, `Buy Now`, `Wishlist`, `Cart`, `Search`, `Filters`, `Sort`, `Pagination` | Dynamic Product Source, Grid Columns, Button Style, Variant Pill/Dropdown mode, Badge Display, Inventory Counter, Out-of-Stock behavior |
| **Marketing** | `Announcement Bar`, `Countdown`, `Coupon`, `Sale Banner`, `Promo Banner`, `Newsletter`, `Testimonials`, `Trust Badges`, `Feature Cards`, `Logo Carousel`                                                                                                                              | Sticky option, Target Date/Time, Coupon Code copy action, Form Action, Auto-scroll, Avatar display, Star ratings                        |
| **Social**    | `Instagram`, `Facebook`, `YouTube`, `Social Icons`                                                                                                                                                                                                                                    | Social Profile URLs, Embed Feed URLs, Icon Size, Hover Effects, Spacing                                                                 |
| **Business**  | `Contact`, `Phone`, `Email`, `Address`, `Opening Hours`, `Map`, `Contact Form`, `WhatsApp`                                                                                                                                                                                            | Address text, Google Maps embed coords, Business hours schedule, WhatsApp pre-filled message, Form field builder                        |

---

## 4. Builder Section Catalog (Section 10 Compliance)

Pre-assembled, production-grade sections ready for one-click insertion:

1. **Hero Sections:**
   - `image_hero`: High-impact banner with overlay heading, subheading, and dual CTA buttons.
   - `video_hero`: Looping background video with dark gradient scrim and centered headline.
   - `split_hero`: 50/50 desktop split with lifestyle photography on one side and product value prop on the other.
   - `full_screen_hero`: 100vh viewport hero with animated scroll indicator.
   - `product_hero`: Showcases a hero product with variant selector and immediate "Buy Now" button.
   - `cta_hero`: Minimalist conversion banner focusing on email collection or sale launch.
2. **Product Sections:**
   - `featured_products`: Curated manual product carousel or grid.
   - `best_sellers`: Dynamically populated by sales volume.
   - `new_arrivals`: Automatically populated by latest creation date.
   - `trending`: High-traffic items based on analytics events.
   - `sale`: Products with active `compare_at_price > price`.
   - `recommended`: Contextual related products on product pages.
   - `recently_viewed`: Client-side cookie/local storage tracking.
3. **Category Sections:**
   - `category_grid`: Card grid with category image, name, and product count.
   - `category_carousel`: Horizontal scrolling circular category icons.
   - `shop_by_category`: Tabbed section switching active category products without page reload.
4. **Marketing Sections:**
   - `flash_sale`: Prominent countdown timer alongside discounted collection grid.
   - `coupon_banner`: Click-to-copy discount code bar with minimum spend terms.
   - `promotion_grid`: Multi-tile promo banners with seasonal discount badges.
5. **Brand & Trust Sections:**
   - `about_story`: Editorial layout with brand founder portrait, signature, and story copy.
   - `why_choose_us`: 3-4 feature cards highlighting benefits (Free Shipping, 100% Authentic, COD Available).
   - `testimonials_slider`: Customer quotes with star ratings and verified buyer tags.
   - `trust_badges`: Bank payment icons, SSL certificates, and return guarantee badges.
6. **Content & Contact Sections:**
   - `faq_accordion`: Collapsible question-and-answer pairs with schema.org FAQ microdata.
   - `image_text_split`: Alternate zig-zag layout for brand storytelling.
   - `contact_form`: Validated inquiry form dispatching to merchant email and dashboard notifications.
   - `whatsapp_connect`: Prominent callout card initiating WhatsApp support chat.
7. **Footer Sections:**
   - `multi_column_footer`: 4-column layout with brand bio, navigation links, policy links, newsletter signup, and copyright.

---

## 5. Dynamic Data Binding Engine

Dynamic data binding enables elements to connect to live database properties on dynamic templates (Product Detail Page, Collection Page, Customer Account Page).

### 5.1 Safe Evaluation Engine

- The browser never executes arbitrary JavaScript expressions or raw SQL.
- Tokens are specified using double-curly syntax: `{{ Object.field | filter }}`.
- The evaluation engine parses paths against a strictly defined schema dictionary:

```typescript
const BINDING_SCHEMA = {
  Product: [
    "title",
    "description",
    "shortDescription",
    "price",
    "compareAtPrice",
    "sku",
    "rating",
    "reviewCount",
    "vendor",
    "brand",
    "categoryName",
    "primaryImageUrl",
  ],
  Collection: ["title", "description", "productsCount", "imageUrl"],
  Store: [
    "name",
    "logoUrl",
    "contactEmail",
    "contactPhone",
    "address",
    "whatsappPhone",
    "currency",
  ],
};
```

### 5.2 Supported Token Modifiers (Pipes)

- `| currency`: Formats number as store currency (e.g. `19900` -> `₹199.00`).
- `| uppercase` / `| lowercase`: Text transformation.
- `| truncate(length)`: Ellipsis truncation.
- `| default(fallback)`: Safe fallback when database field is NULL.

---

## 6. Theme Token System & Responsive Rules

### 6.1 Global Theme Tokens (`settings_schema`)

Themes expose global tokens that compile to CSS custom properties:

- **Colors:** `--store-primary`, `--store-secondary`, `--store-accent`, `--store-bg`, `--store-surface`, `--store-text`, `--store-text-muted`, `--store-border`, `--store-success`, `--store-error`.
- **Typography:** `--font-heading` (Google Font), `--font-body`, `--text-h1-size`, `--text-body-size`, `--line-height-body`.
- **Shapes & Elevation:** `--store-radius` (e.g. `0px`, `4px`, `8px`, `9999px`), `--store-shadow` (sm, md, lg), `--container-max-width` (1280px).

### 6.2 Responsive Property Inheritance

Every element style property supports device-specific overrides:

```typescript
interface ResponsivePropertyMap {
  desktop: ElementStyles;
  tablet?: Partial<ElementStyles>;
  mobile?: Partial<ElementStyles>;
}
```

- At render time, styles cascade: `Mobile overrides Tablet overrides Desktop`.
- Allows device-specific visibility: `hideOnMobile: true`, `hideOnDesktop: false`.

---

## 7. Template System & Data Preservation Invariant

1. **Complete Data Independence:** Templates define visual layouts and AST sections, completely decoupled from business data.
2. **Preservation Guarantee:** Switching, editing, or deleting a theme/template **NEVER** deletes:
   - Products or Product Variants
   - Orders, Invoices, or Transactions
   - Customer records
   - Inventory counts or movements
3. **Atomic Publishing & Rollback:** Publishing creates a new entry in `theme_versions`. If a merchant makes an erroneous visual change, a single click on "Rollback" restores the exact previous AST without affecting pending orders or customer checkouts.

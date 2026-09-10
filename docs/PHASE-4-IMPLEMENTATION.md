# Phase 4 — Storefront Engine Implementation Report

**Document Version:** 1.0.0  
**Phase:** 4 — Storefront Engine  
**Deployment Target:** Vercel Preview & Hosted Supabase PostgreSQL  
**Repository Branch:** `develop`

---

## 1. Executive Summary

Phase 4 delivers the production-grade, multi-tenant public storefront rendering engine for STOREFY. The engine dynamically resolves any incoming request (whether via platform subdomain, store subdomain, or custom merchant domain) to its verified database-backed store configuration.

### Architectural Flow

```
Customer Request
      ↓
Host / Domain (Normalized)
      ↓
Storefront Domain Resolver (Zero-Trust)
      ↓
Tenant Context & Store Status Check (ACTIVE | MAINTENANCE | SUSPENDED)
      ↓
Active Store Theme & Compiled CSS Variables
      ↓
Dynamic Page Configuration & Layout (Announcement, Header, Content, Footer)
      ↓
Public Storefront (Zero hardcoded merchant data)
```

---

## 2. Storefront Routing & Domain Resolution

### 2.1 Route Architecture
Storefront pages are rendered via the App Router route group:
```
src/app/(storefront)/[domain]/
├── layout.tsx              # Root storefront shell, theme injection, header & footer
├── not-found.tsx           # Storefront-aware branded 404 page
├── page.tsx                # Dynamic homepage (hero, value props, WhatsApp, catalog preview)
├── products/page.tsx       # Products catalog shell (honest empty state for Phase 6)
├── collections/page.tsx    # Curated collections shell (honest empty state for Phase 6)
└── pages/
    ├── about/page.tsx      # Merchant story, values, brand bio
    └── contact/page.tsx    # Merchant contact channels, WhatsApp click-to-chat, inquiry form
```

### 2.2 Host Resolution Strategy (`src/modules/storefront/store-resolver.ts`)
The server-side resolver executes a multi-tier lookup:
1. **Normalization**: Trims whitespace, forces lowercase, strips proxy/port numbers, and removes trailing dots.
2. **Platform Subdomain**: Extracts candidate prefix for `*.storefy.shop` or `*.localhost` (e.g., `acme.storefy.shop` → `acme`). Queries `stores` by `subdomain`.
3. **Custom Domain**: Queries `store_domains` table where `domain = normalizedHost`, joining `stores`.
4. **Fallback Slugs**: Checks `stores.customDomain` and `stores.subdomain` directly.
5. **Zero-Trust Security**: Never trusts query parameters (e.g. `?storeId=...`), client cookies, or request headers for tenant identity.

---

## 3. Store Lifecycle States

The storefront engine strictly enforces merchant lifecycle states:

| Status | Condition | Storefront Behavior |
|---|---|---|
| **ACTIVE** | `isActive = true` AND `status = 'ACTIVE'` | Full dynamic storefront rendered with active theme and content |
| **MAINTENANCE** | `status = 'MAINTENANCE'` | Branded maintenance notice with customer reassurance |
| **SUSPENDED** | `isActive = false` OR `status = 'SUSPENDED'` | Unavailable notice; store operations and catalog hidden |
| **NOT_FOUND** | Domain unassigned / store absent | Honest Store Not Found page with return-to-platform action |

---

## 4. Theme Engine & CSS Security (`src/modules/storefront/theme-engine.ts`)

Themes compile to standard CSS custom properties passed via React `style` attributes to the root layout wrapper. **Zero `dangerouslySetInnerHTML` is used.**

### Supported Tokens
- **Colors**: `--store-primary`, `--store-secondary`, `--store-accent`, `--store-bg`, `--store-surface`, `--store-text`, `--store-text-muted`, `--store-border`
- **Typography**: `--font-heading`, `--font-body`
- **Layout & Elevation**: `--store-radius`, `--container-max-width`

### Injection Protection
- **Colors**: Strictly validated against Hex (`#fff`, `#ffffff`, `#ffffffff`), RGB/RGBA, and HSL/HSLA regex patterns. Injection vectors (semicolons, `url()`, `expression()`, `<script>`) fall back safely.
- **Dimensions**: Strictly validated for numeric values with valid CSS units (`px`, `rem`, `em`, `%`, `vh`, `vw`, `ch`).
- **Font Families**: Quotes, semicolons, brackets, and HTML characters are stripped, restricting families to safe alphanumeric tokens.

---

## 5. Dynamic SEO & OpenGraph Metadata (`src/modules/storefront/seo.ts`)

Every public storefront route implements dynamic Next.js `generateMetadata`:
- **Title**: Dynamic template `${pageTitle} | ${storeName}` (e.g. `Acme Apparel — Official Online Store`).
- **Description**: Dynamically loaded from page SEO records or store settings.
- **Canonical URL**: Dynamic `https://${domain}` canonicalization.
- **OpenGraph**: OpenGraph title, description, image, and `siteName` matching the resolved store.
- **Twitter**: `summary_large_image` card with tenant branding.
- **Robots Directives**: `index: false, follow: false` automatically enforced on maintenance, suspended, or not-found states.
- **Tenant Isolation Invariant**: Metadata for Store A never contains metadata from Store B.

---

## 6. Baseline Storefront Pages

### 6.1 Home Page (`/`)
- Branded hero section with store name and customized call-to-action.
- 4 merchant value propositions: Express Delivery, Cash on Delivery (with dynamically formatted limits from `store_settings`), Authenticity Guarantee, and Direct Support.
- Honest empty state for featured catalog with clear roadmap indicator for Phase 6.
- Direct WhatsApp click-to-chat banner if enabled in merchant settings.

### 6.2 Catalog Page (`/products`)
- Search bar and filter controls shell architecturally prepared for Phase 6.
- Honest empty state: "No Products Currently Published. Merchandise will appear here dynamically as items are uploaded in Phase 6."

### 6.3 Collections Page (`/collections`)
- Collections grid shell with honest empty state for curated groupings.

### 6.4 About Page (`/pages/about`)
- Merchant story and brand bio loaded dynamically from theme footer/about configuration.
- Core values and authenticity assurances.

### 6.5 Contact Page (`/pages/contact`)
- Support channels, operational hours, and merchant warehouse fulfillment region.
- **WhatsApp Click-to-Chat**: Generates safe `https://wa.me/...` URL with pre-filled greeting. Does not fake automated bots or fake checkout.
- Direct inquiry form with honest submission feedback.

### 6.6 Storefront 404 (`not-found.tsx`)
- Customized 404 page maintaining the store navigation shell and linking back to the store homepage.

---

## 7. Database Migration & Canonical Schema (Domain 2)

Drizzle migration `0002_moaning_toxin.sql` was generated and applied to hosted Supabase PostgreSQL:

```sql
CREATE TABLE "store_themes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "name" varchar(255) NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "settings_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "theme_id" uuid REFERENCES "store_themes"("id") ON DELETE cascade,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "page_type" varchar(50) DEFAULT 'CUSTOM' NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "seo_title" varchar(255),
  "seo_description" text,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "navigation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "name" varchar(100) NOT NULL,
  "handle" varchar(100) NOT NULL,
  "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "stores" ADD COLUMN "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL;
```

---

## 8. Verification Results

| Check | Command | Result |
|---|---|---|
| **Unit & Security Tests** | `npm test` | **PASS (106/106 tests across 16 test suites)** |
| **TypeScript Strict Check** | `npm run typecheck` | **PASS (0 errors)** |
| **ESLint Quality** | `npm run lint` | **PASS (0 errors, 0 warnings)** |
| **Production Build** | `npm run build` | **PASS** |
| **Hosted Database Connectivity** | `npm run db:verify` | **PASS** |
| **Database Migrations** | `npm run db:migrate` | **PASS** |

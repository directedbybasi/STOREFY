# STOREFY — Project Structure & Code Organization Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Architecture Style:** Modular Clean Monolith with Domain-Driven Design (DDD)  
**Framework:** Next.js 15 (App Router) + TypeScript (Strict) + Drizzle ORM + Tailwind CSS

---

## 1. Directory Layout Overview

The codebase is organized to enforce strict separation of concerns, modular domain encapsulation, and clear boundaries between public storefronts, merchant management tools, and platform administration.

```
c:\atigravity\STOREFY\
├── docs/                               # Architectural & Engineering Specifications
│   ├── ARCHITECTURE.md
│   ├── DATABASE-SPECIFICATION.md
│   ├── API-SPECIFICATION.md
│   ├── BUILDER-SPECIFICATION.md
│   ├── SECURITY-SPECIFICATION.md
│   ├── PLAN-FEATURE-MATRIX.md
│   ├── DEVELOPMENT-ROADMAP.md
│   └── PROJECT-STRUCTURE.md
├── .env.development                    # Development configuration (Hosted Supabase Dev & Vercel)
├── .env.staging                        # Staging configuration (Hosted Supabase Staging)
├── .env.production                     # Production configuration (Hosted Supabase Prod)
├── .env.example                        # Template of required environment variables
├── src/
│   ├── app/                            # Next.js App Router (Routes & Route Groups)
│   │   ├── (auth)/                     # Authentication Routes (Login, Signup, Reset)
│   │   ├── (dashboard)/                # Merchant Dashboard Workspace
│   │   ├── (storefront)/               # Dynamic Customer Storefront Engine
│   │   ├── (supplier)/                 # Platform Dropship Supplier Portal
│   │   ├── (admin)/                    # Platform Superadmin Governance Portal
│   │   ├── api/                        # Next.js Route Handlers (/api/v1/...)
│   │   ├── layout.tsx                  # Global HTML Root Layout
│   │   └── globals.css                 # Global CSS Variables & Tailwind Directives
│   ├── components/                     # Shared UI Components
│   │   ├── ui/                         # shadcn/ui Headless Primitives (Button, Dialog, Table)
│   │   ├── layout/                     # Reusable Navbars, Sidebars, Shells
│   │   ├── shared/                     # Modals, Datatables, File Uploaders, Status Badges
│   │   └── builder/                    # Visual Storefront Builder Canvas & Panels
│   ├── core/                           # System-Wide Infrastructure & Primitives
│   │   ├── config/                     # Environment Validation & App Settings
│   │   ├── errors/                     # Centralized AppError Classes & RFC 7807 Handlers
│   │   ├── logger/                     # Structured Logger (Pino / Server Console)
│   │   └── constants/                  # System Invariants, Currencies, Enums
│   ├── database/                       # Data Persistence Layer
│   │   ├── client.ts                   # Pooled PostgreSQL Connection (Drizzle ORM)
│   │   ├── migrations/                 # Automated Drizzle SQL Migration Files
│   │   ├── schema/                     # Modular Drizzle Schema Definitions
│   │   └── seeds/                      # Initial System Seeds (Plans, Permissions, Roles)
│   ├── lib/                            # Third-Party Clients & Utilities
│   │   ├── supabase/                   # Supabase Auth & Storage Clients (Server & Client)
│   │   ├── encryption/                 # AES-256-GCM Secret Vault Utilities
│   │   ├── utils/                      # Formatting, Currency (Paise to INR), Math, ClassNames
│   │   └── validators/                 # Shared Zod Validation Primitives
│   ├── middleware.ts                   # Edge Host Routing & Tenant Resolution Middleware
│   └── modules/                        # Encapsulated Business Domain Modules (DDD)
│       ├── analytics/
│       ├── auth/
│       ├── billing/
│       ├── builder/
│       ├── cart/
│       ├── catalog/
│       ├── checkout/
│       ├── customers/
│       ├── dropshipping/
│       ├── inventory/
│       ├── marketing/
│       ├── meesho/
│       ├── media/
│       ├── orders/
│       ├── payments/
│       ├── reviews/
│       ├── shipping/
│       ├── staff/
│       └── stores/
├── tests/                              # Automated Testing Suite
│   ├── unit/                           # Domain Logic & Unit Tests (Vitest)
│   ├── integration/                    # Database, Repository & RLS Tests
│   └── e2e/                            # End-to-End User Journeys (Playwright)
├── public/                             # Static Assets (Logos, Icons, Fallback Placeholders)
├── drizzle.config.ts                   # Drizzle ORM Config
├── next.config.mjs                     # Next.js Build Configuration
├── package.json                        # Project Dependencies & Scripts
├── tailwind.config.ts                  # Tailwind Design Tokens
└── tsconfig.json                       # TypeScript Strict Configuration
```

---

## 2. Route Groups & App Routing Topology (`src/app`)

Next.js route groups `(...)` are utilized to apply distinct layout trees without polluting the URL structure:

### 2.1 `(auth)` — Authentication Flow

- `app/(auth)/login/page.tsx`: Merchant & staff login.
- `app/(auth)/register/page.tsx`: New merchant signup with organization and store creation.
- `app/(auth)/forgot-password/page.tsx`: Password reset trigger.
- `app/(auth)/reset-password/page.tsx`: Secure password renewal.

### 2.2 `(dashboard)` — Merchant SaaS Dashboard

Scoped with authenticated merchant layout, navigation sidebar, and store switcher:

- `app/(dashboard)/dashboard/page.tsx`: Real-time store metric overview.
- `app/(dashboard)/dashboard/products/`: Product list, creation wizard, variant editor, categories.
- `app/(dashboard)/dashboard/inventory/`: Stock tracking matrix, manual adjustments, movement audit ledger.
- `app/(dashboard)/dashboard/orders/`: Order queue, fulfillment drawer, shipment tracking, GST invoices.
- `app/(dashboard)/dashboard/customers/`: Customer CRM, segment rules, order history.
- `app/(dashboard)/dashboard/builder/`: Visual storefront builder full-screen workspace.
- `app/(dashboard)/dashboard/dropshipping/`: Supplier catalog browser, imported products, margin manager.
- `app/(dashboard)/dashboard/meesho/`: Meesho product importer, profit calculator, fulfillment tracker.
- `app/(dashboard)/dashboard/marketing/`: Promotional coupons, discount rules, product reviews moderation.
- `app/(dashboard)/dashboard/analytics/`: Detailed sales charts, conversion funnel, location heatmap.
- `app/(dashboard)/dashboard/media/`: Store asset manager, folder hierarchy, multi-file uploader.
- `app/(dashboard)/dashboard/settings/`: Store settings, custom domains, payment providers, shipping rules, staff RBAC, billing subscription.

### 2.3 `(storefront)` — Customer-Facing Storefront

Rewritten dynamically by `middleware.ts` based on domain context:

- `app/(storefront)/[domain]/page.tsx`: Dynamic homepage resolved from theme AST.
- `app/(storefront)/[domain]/products/page.tsx`: Searchable, filterable catalog grid.
- `app/(storefront)/[domain]/products/[slug]/page.tsx`: Product detail page (PDP) with variant selector, image gallery, reviews, and WhatsApp order button.
- `app/(storefront)/[domain]/collections/[slug]/page.tsx`: Collection showcase.
- `app/(storefront)/[domain]/cart/page.tsx`: Responsive cart drawer/page with coupon application.
- `app/(storefront)/[domain]/checkout/page.tsx`: Server-validated checkout and payment gateway modal.
- `app/(storefront)/[domain]/order-confirmation/[orderNumber]/page.tsx`: Receipt and tracking status.
- `app/(storefront)/[domain]/pages/[slug]/page.tsx`: Custom merchant content pages (About, FAQ, Contact).

### 2.4 `(supplier)` — Dropship Supplier Portal

Dedicated portal for verified inventory holders:

- `app/(supplier)/portal/catalog/`: Supplier inventory listings and wholesale price management.
- `app/(supplier)/portal/orders/`: Assigned fulfillment orders, packing slip downloads, tracking number submissions.

### 2.5 `(admin)` — Platform Superadmin Portal

Restricted strictly to platform operators (`is_platform_admin = TRUE`):

- `app/(admin)/admin/users/`: Platform user directory.
- `app/(admin)/admin/stores/`: Merchant stores audit, domain approvals, store suspension.
- `app/(admin)/admin/suppliers/`: Supplier onboarding verification.
- `app/(admin)/admin/subscriptions/`: Platform ARR/MRR metrics, churn logs, subscription events.
- `app/(admin)/admin/ai-audit/`: Global AI tool token consumption and latency metrics.

---

## 3. Domain Module Structure (`src/modules/*`)

To maintain clean code boundaries and prevent giant, monolithic files, each business domain encapsulates its logic in a standardized package layout:

```
src/modules/[domain-name]/
├── types.ts            # Domain TypeScript interfaces and Data Transfer Objects (DTOs)
├── schemas.ts          # Zod validation schemas for input/mutation payloads
├── service.ts          # Pure business logic and orchestration (framework-agnostic)
├── repository.ts       # Database queries and mutations via Drizzle ORM
├── actions.ts          # Next.js Server Actions callable from UI components
├── components/         # Domain-specific React components (forms, modals, cards)
└── errors.ts           # Domain-specific error definitions
```

### Module Boundary Guidelines:

1. **Repository Isolation:** Controllers and Server Actions never execute raw SQL or Drizzle queries directly; they invoke functions in `repository.ts`.
2. **Strict Validation:** All incoming input to `service.ts` or `actions.ts` must pass through a Zod schema defined in `schemas.ts`.
3. **Cross-Module Communication:** Modules import services from other modules (e.g. `orders` calls `inventory.reserveStock()`), never manipulating another module's database tables directly.

---

## 4. Database Schema Structure (`src/database/schema/*`)

Drizzle ORM schemas are split by domain for maintainability and aggregated in `src/database/schema/index.ts`:

- `tenancy.ts`: `organizations`, `stores`, `store_domains`, `store_settings`, `staff`, `roles`, `permissions`.
- `builder.ts`: `store_themes`, `theme_versions`, `templates`, `pages`, `page_sections`, `page_elements`, `navigation`.
- `catalog.ts`: `categories`, `collections`, `products`, `product_variants`, `product_images`, `product_metafields`.
- `inventory.ts`: `inventory`, `inventory_movements`.
- `customers.ts`: `customers`, `customer_addresses`, `customer_segments`, `carts`, `cart_items`.
- `orders.ts`: `orders`, `order_items`, `order_status_history`, `shipments`, `shipment_tracking`, `invoices`, `returns`, `refunds`.
- `payments.ts`: `payment_accounts`, `payments`, `payment_transactions`.
- `dropshipping.ts`: `suppliers`, `supplier_products`, `supplier_inventory`, `dropshipping_orders`.
- `meesho.ts`: `meesho_imports`, `meesho_products`, `meesho_orders`.
- `marketing.ts`: `coupons`, `discounts`, `reviews`.
- `billing.ts`: `subscription_plans`, `plan_features`, `plan_feature_limits`, `subscriptions`, `subscription_events`.
- `ai.ts`: `ai_generations`.
- `platform.ts`: `analytics_events`, `audit_logs`, `notifications`, `webhooks`.

---

## 5. Coding Standards & Architectural Invariants

### 5.1 Code Quality Rules (Section 48 Compliance)

1. **TypeScript Strict Mode:** `"strict": true`, no `any` types permitted in domain logic.
2. **Centralized Error Handling:** Throw structured domain errors (`NotFoundError`, `ValidationError`, `InsufficientStockError`) derived from `AppError`.
3. **No Magic Values:** Numeric values (e.g., maximum file sizes, grace periods, plan limits) reside in `src/core/constants/` or database plan tables.
4. **No Temporary Mocks in Production Logic:** Mock services must implement the real domain interface and be isolated strictly to testing environments.
5. **No Client Pricing Logic:** Price subtotals, discounts, and order totals calculated exclusively in `src/modules/checkout/service.ts`.

### 5.2 UI/UX Engineering Rules (Section 49 Compliance)

1. **Clean Visual Hierarchy:** Standardized spacing, elevation, typography tokens via Tailwind and shadcn/ui.
2. **Accessible by Default:** Radix UI primitives with full keyboard navigation and ARIA attributes.
3. **Optimized Media Delivery:** Next.js `<Image />` component with automated WebP compression and responsive `srcset`.
4. **Zero Layout Shifts:** Skeleton loaders and reserved aspect ratios for all dynamic sections and products.

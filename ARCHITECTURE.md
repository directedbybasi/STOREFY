# STOREFY — Platform Architecture Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Status:** Canonical Reference Architecture

---

## 1. Executive Architecture Summary

STOREFY is a multi-tenant, production-grade Software-as-a-Service (SaaS) e-commerce operating platform designed to empower merchants to build, customize, and operate online storefronts from a unified dashboard ecosystem.

The platform natively supports three distinct commerce paradigms through a single unified engine:

1. **Normal E-Commerce:** Merchant owns inventory, manages fulfillment, connects direct payment gateways, and handles fulfillment.
2. **Platform Dropshipping:** Internal marketplace connecting verified platform suppliers with merchant resellers. Suppliers maintain inventory and fulfill orders; resellers set custom markup and sell under their own brand.
3. **Meesho Reselling:** Dedicated integration/importer pipeline allowing merchants to ingest Meesho product listings, normalize catalog schemas, customize pricing/profit margins, and route downstream order fulfillment via supported workflows without circumventing security or access controls.

### Core Architectural Invariants

- **Zero Platform Transaction Fees:** 100% of merchant sales revenue belongs to the merchant. Platform monetization is strictly subscription-based (Starter ₹199/month, Business ₹599/month, ₹50 first-month launch promotion).
- **Zero Inventory/Logistics Liability:** STOREFY is neither an inventory holder nor a carrier. All physical movement of goods is operated either by merchants or verified suppliers.
- **Strict Multi-Tenant Isolation:** Complete logical isolation across organizations and stores at database, application, routing, and asset layers.
- **Server-Authoritative Commerce Core:** Pricing, discounts, inventory reservations, order calculations, and payment validations are strictly computed server-side. The client/storefront is treated as an untrusted presentation layer.

---

## 2. High-Level System Architecture

The system is structured as a modular monolithic Next.js application leveraging modern edge routing, server-authoritative API handlers, background task queues, and managed persistence primitives.

```
                                  +-------------------------------------------------+
                                  |            Cloudflare Edge Network              |
                                  |     DNS, DDoS, Global CDN, SSL Termination      |
                                  |      Custom Hostname Routing (Cloudflare SaaS)  |
                                  +-------------------------------------------------+
                                                           |
                                                           v
                                  +-------------------------------------------------+
                                  |           Next.js Edge Middleware               |
                                  |   - Subdomain & Custom Domain Resolution        |
                                  |   - Tenant Context Extraction (store_id)        |
                                  |   - Session & Auth Verification                 |
                                  +-------------------------------------------------+
                                                           |
                      +------------------------------------+-----------------------------------+
                      |                                    |                                   |
                      v                                    v                                   v
+-------------------------------+  +--------------------------------+  +-------------------------------+
|     Storefront Subsystem      |  |   Merchant Dashboard Subsystem |  |    Platform Admin Subsystem   |
| (Dynamic SSR/ISR Engine, Cart,|  |  (Store Management, Catalog,   |  |   (Superadmin, Governance,    |
|  Checkout, Theme Components)  |  |   Orders, Visual Builder, AI)  |  |    Tenant & Plan Auditing)    |
+-------------------------------+  +--------------------------------+  +-------------------------------+
                      |                                    |                                   |
                      +------------------------------------+-----------------------------------+
                                                           |
                                                           v
                                  +-------------------------------------------------+
                                  |          Domain Services & Core Engine          |
                                  |  - Catalog & Inventory Engine                   |
                                  |  - Cart & Server-Side Checkout Engine           |
                                  |  - Order Orchestration & State Machine          |
                                  |  - Payment Gateway Abstraction (Razorpay/Cashfree)|
                                  |  - Shipping Carrier Abstraction (Shiprocket)    |
                                  |  - Visual Builder Schema & Binding Engine       |
                                  |  - Dropship Routing & Meesho Normalizer         |
                                  |  - AI Generation Gateway (7 Strict Tools)       |
                                  +-------------------------------------------------+
                                                           |
                      +------------------------------------+-----------------------------------+
                      |                                    |                                   |
                      v                                    v                                   v
+-------------------------------+  +--------------------------------+  +-------------------------------+
|      PostgreSQL Database      |  |         Supabase Auth          |  |       Supabase Storage        |
|  (Multi-Tenant Schema, RLS,   |  |   (JWT, Multi-Factor Auth,     |  | (Encrypted Buckets, CDN URLs, |
|    Drizzle ORM, Migrations)   |  |      RBAC Token Claims)        |  |    Media Asset Management)    |
+-------------------------------+  +--------------------------------+  +-------------------------------+
```

---

## 3. Technology Stack & Runtime Topology

| Layer                 | Selected Technology                                             | Architectural Justification                                                                                                                                                                      |
| :-------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**         | Next.js 15 (App Router, Node.js runtime for API/Server Actions) | Unified full-stack TypeScript environment, React Server Components (RSC) for high-performance storefront SSR, incremental static regeneration (ISR).                                             |
| **Language**          | TypeScript (Strict Mode)                                        | End-to-end type safety across database schemas, domain models, APIs, and UI components.                                                                                                          |
| **Styling**           | Tailwind CSS + shadcn/ui                                        | Radix UI headless accessible primitives paired with utility-first CSS for deterministic styling and theme token propagation.                                                                     |
| **Database**          | Hosted PostgreSQL 16+ (Supabase)                                | Managed cloud PostgreSQL with connection pooling (PgBouncer/Supavisor), ACID compliance, robust indexing, JSONB support for builder ASTs, native full-text search, and Row Level Security (RLS). |
| **ORM / Data Access** | Drizzle ORM                                                     | Zero-overhead type-safe SQL query builder, fine-grained control over query performance, native relational joins, automated migration engine targeting hosted PostgreSQL.                         |
| **Auth & Identity**   | Supabase Auth (GoTrue Hosted)                                   | Battle-tested JWT sessions, OAuth providers, multi-tenant user mapping, and native integration with Postgres RLS.                                                                                |
| **Asset Storage**     | Supabase Storage (Hosted S3-compatible)                         | Scalable object storage with fine-grained access control, pre-signed upload URLs, and CDN image transformation.                                                                                  |
| **Edge & Ingress**    | Cloudflare for SaaS                                             | Dynamic SSL provisioning, apex/subdomain CNAME routing for custom merchant domains, WAF, rate-limiting, and global CDN caching.                                                                  |
| **Hosting & CI/CD**   | Vercel & GitHub Actions                                         | Zero-config hosted deployments, atomic previews, edge caching, and automated testing pipelines.                                                                                                  |

### 3.1 Target Environment & Deployment Topology

STOREFY uses a **Hosted-First Development Architecture** from Phase 1 onward. Localhost is **NOT** the primary development environment or deployment target.

```
Developer PC / Antigravity
        │ (git push)
        ▼
   GitHub Repository
        │ (webhook / CI trigger)
        ▼
   Vercel Hosted Platform
        │
        ├── Development Environment (Targeted branch: `develop` / feature previews)
        │     ├── Vercel Preview Deployments (`storefy-dev.vercel.app` / `dev.storefy.shop`)
        │     ├── Hosted Supabase Dev Project (`storefy-dev` DB, Auth, Storage)
        │     └── Cloudflare Dev Routing (`*.dev.storefy.shop`)
        │
        ├── Staging Environment (Targeted branch: `staging`)
        │     ├── Vercel Staging Deployments (`staging.storefy.shop`)
        │     ├── Hosted Supabase Staging Project (`storefy-staging` DB, Auth, Storage)
        │     └── Cloudflare Staging Routing (`*.staging.storefy.shop`)
        │
        └── Production Environment (Targeted branch: `main`)
              ├── Vercel Production Deployments (`app.storefy.shop`, `admin.storefy.shop`)
              ├── Hosted Supabase Production Project (`storefy-prod` DB, Auth, Storage)
              └── Cloudflare for SaaS (`*.storefy.shop` + Custom Domains)
```

#### Development Environment Constraints

- **Primary Development Ingress:** Hosted Vercel deployments and hosted Supabase backend instances.
- **No Local Backend Dependencies:** Local PostgreSQL, local Supabase, and Docker Compose are **NOT** required or designed as primary development prerequisites.
- **Local Engineering Fallback:** The codebase is structured to permit local execution (`next dev`) strictly for offline debugging, step-through diagnostics, or isolated script execution when technically useful, connecting directly to the hosted Supabase Development database.

---

## 4. Multi-Tenancy & Domain Routing Architecture

STOREFY enforces strict hierarchical multi-tenancy:

```
Platform (STOREFY)
  └── Organization (`organizations`) — Represents legal entity / merchant billing account
       ├── Staff Memberships (`organization_members`, `staff`) — RBAC association
       ├── Subscription (`subscriptions`) — Starter / Business plan tier
       └── Store (`stores`) — Online storefront instance
            ├── Domains (`store_domains`) — *.storefy.shop and custom domains (e.g., brand.com)
            ├── Theme & Pages (`store_themes`, `pages`, `page_sections`)
            ├── Catalog (`products`, `categories`, `collections`)
            ├── Inventory (`inventory_items`, `inventory_movements`)
            ├── Orders & Shipments (`orders`, `shipments`)
            └── Customers (`customers`)
```

### Domain & Subdomain Resolution Pipeline

1. **Incoming Request:** Cloudflare terminates TLS and proxies request to Next.js middleware with `Host` header.
2. **Middleware Host Inspection (Environment-Aware):**
   - **Production:**
     - `app.storefy.shop` -> Routes to Merchant Dashboard (`src/app/(dashboard)`) or Auth (`src/app/(auth)`).
     - `admin.storefy.shop` -> Routes to Platform Superadmin (`src/app/(admin)`).
     - `supplier.storefy.shop` -> Routes to Supplier Portal (`src/app/(supplier)`).
     - `*.storefy.shop` or custom domain (e.g. `shop.merchant.com`) -> Resolves active `store_domains` record and rewrites to Storefront (`src/app/(storefront)/[domain]/...`).
   - **Development (Hosted):**
     - `app-dev.storefy.shop` or `dev.storefy.shop` / `storefy-dev.vercel.app` -> Routes to Merchant Dashboard or Auth.
     - `admin-dev.storefy.shop` -> Routes to Platform Superadmin.
     - `*.dev.storefy.shop` -> Resolves development tenant storefront.
   - **Local Engineering Fallback (Secondary Debugging Only):**
     - `localhost:3000` / `app.localhost:3000` -> Dashboard/Auth fallback.
     - `[subdomain].localhost:3000` -> Storefront fallback.
3. **Tenant Context Injection:**
   - Middleware queries cache / DB for active `store_domains` record.
   - Resolves `store_id`, `organization_id`, and `is_active` status.
   - Injects `x-store-id`, `x-store-slug`, and `x-tenant-context` headers into downstream request.
   - Rewrites URL internally to `src/app/(storefront)/[domain]/...`.

### Data Isolation Guarantees

- Every tenant-owned database table includes non-nullable `store_id UUID` (and `organization_id UUID` where applicable).
- **Application-Level Scoping:** Drizzle ORM repositories enforce mandatory `eq(table.storeId, context.storeId)` filters across all read/write operations.
- **Database-Level Scoping (RLS):** Supabase PostgreSQL RLS policies validate `current_setting('app.current_store_id')` or JWT token claims (`app_metadata.store_ids`), completely preventing cross-tenant leakage even in raw queries.

---

## 5. Subsystem & Domain Architecture

### 5.1 Storefront Engine (`src/modules/storefront`)

- **Dynamic Page Resolver:** Converts route URLs (`/`, `/products/[slug]`, `/collections/[slug]`, `/pages/[slug]`) to page records from the database.
- **Schema-Driven Section Renderer:** Recursively renders the page's section and element JSON Abstract Syntax Tree (AST).
- **Global Theme Provider:** Compiles `store_themes` JSON tokens into CSS variables injected at document root (`--store-primary`, `--store-radius`, `--font-heading`).
- **Storefront Cart:** Client-side cart state synchronized and validated against server-side session endpoints (`/api/v1/storefront/cart`).

### 5.2 Visual Store Builder (`src/modules/builder`)

- **Decoupled Architecture:** Visual editing canvas runs in an isolated frame or synchronized canvas communicating via postMessage / React context.
- **Component Model:** Follows strict hierarchy: `Theme` -> `Template` -> `Page` -> `Section` -> `Container` -> `Block` -> `Element` -> `Dynamic Binding`.
- **State Management:** Immutable page AST tree with full Undo/Redo stack, draft versioning (`theme_versions`), and one-click atomic publishing.
- **Dynamic Data Resolvers:** Safe variable evaluation engine replacing tokens (`{{ Product.title }}`, `{{ Product.price | currency }}`) without executing arbitrary JavaScript.

### 5.3 Catalog & Inventory Subsystem (`src/modules/catalog` & `src/modules/inventory`)

- **Product Catalog:** Multi-variant matrix (`product_options`, `product_variants`) with individual SKU, barcode, inventory, weight, and pricing.
- **Taxonomy:** Unlimited recursive hierarchical categories (`parent_id`) and arbitrary manual/automated collections.
- **Inventory State Machine:** Real-time stock tracking across four distinct states:
  - `on_hand`: Physical items present.
  - `reserved`: Held in active checkouts/pending orders.
  - `available`: `on_hand - reserved`.
  - `incoming`: Expected from suppliers/purchase orders.
- **Stock Movement Ledger:** All quantity modifications produce an immutable `inventory_movements` record with reason code (`ORDER_RESERVE`, `ORDER_FULFILL`, `RETURN_RESTOCK`, `MANUAL_ADJUST`, `IMPORT`).

### 5.4 Cart & Checkout Subsystem (`src/modules/checkout`)

- **Zero Client Trust:** Pricing, coupons, taxes, and shipping rates are strictly calculated server-side.
- **Checkout Pipeline:**
  1. _Validation:_ Verify active items, variant options, and stock availability.
  2. _Reservation:_ Atomic lock/reservation of stock for 15 minutes.
  3. _Pricing Engine:_ Apply coupon hierarchy, tiered discounts, location-based tax, and shipping method rates.
  4. _Payment Initialization:_ Create provider payment order (Razorpay / Cashfree) server-side.
  5. _Order Creation:_ Write `orders` record in `pending` state awaiting payment verification or COD confirmation.

### 5.5 Orders, Fulfillment & Invoices (`src/modules/orders`)

- **Order Status State Machine:** `pending` -> `confirmed` -> `processing` -> `packed` -> `shipped` -> `delivered` (terminal) | `cancelled` | `returned` | `refunded` | `rto`.
- **Multi-Fulfillment Routing:** Distinguishes `MERCHANT`, `PLATFORM_DROPSHIP`, and `MEESHO_RESELLING`.
- **Automated Invoicing:** Server-rendered PDF and HTML invoices with tax breakdowns, seller GST/details, customer address, and unique sequential numbering (`INV-YYYY-XXXXX`).

### 5.6 Payment Gateway Abstraction (`src/modules/payments`)

- **Interface-Driven Adapter Pattern:**
  ```typescript
  interface PaymentProvider {
    createPaymentOrder(params: CreatePaymentParams): Promise<PaymentOrderResult>;
    verifyPaymentSignature(params: VerifySignatureParams): Promise<boolean>;
    processWebhook(event: WebhookEvent): Promise<WebhookResult>;
    createRefund(params: RefundParams): Promise<RefundResult>;
  }
  ```
- **Supported Adapters:** Razorpay, Cashfree, PayU, COD (Cash on Delivery).
- **Credential Vault:** Merchant API keys (`key_id`, `key_secret`) are encrypted at rest using AES-256-GCM before storage in `payment_accounts`.

### 5.7 Shipping Carrier Abstraction (`src/modules/shipping`)

- **Interface-Driven Carrier Adapter:**
  ```typescript
  interface ShippingProvider {
    calculateRates(params: RateParams): Promise<ShippingRate[]>;
    createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
    generateLabel(shipmentId: string): Promise<string>; // PDF URL
    getTracking(trackingNumber: string): Promise<TrackingInfo>;
  }
  ```
- **Supported Adapters:** Shiprocket, Delhivery, Custom Manual Merchant Rates.

### 5.8 Platform Dropshipping Subsystem (`src/modules/dropshipping`)

- **Role Separation:**
  - `Supplier`: Sets base cost (`supplier_price`), maintains bulk inventory, receives routed fulfillment orders, provides dispatch tracking.
  - `Reseller (Merchant)`: Imports products into store, sets customer selling price (`selling_price`), markets to buyers.
- **Automated Routing:** Storefront orders containing dropship items automatically spawn associated child `dropshipping_orders` assigned to corresponding suppliers.
- **Privacy Firewall:** Reseller store branding is preserved; supplier identity is completely abstracted from end customers on packing slips and labels.

### 5.9 Meesho Reselling Subsystem (`src/modules/meesho`)

- **Replaceable Ingestion Adapter:** Implements `ProductSourceAdapter` interface to ingest and normalize external catalog data without coupling external website quirks into the core product schema.
- **Normalized Product Pipeline:**
  `Meesho URL / ID` -> `Scraper / API Parser Adapter` -> `Normalized Product DTO` -> `Merchant Review & Markup` -> `Core Product Record`.
- **Integrated Profit Calculator:** Computes real-time net earnings before import:
  $$\text{Net Profit} = \text{Selling Price} - \text{Meesho Cost} - \text{Estimated Gateway Fee} - \text{Ad Cost} - \text{Discounts}$$
- **Order Processing Workflow:** Reseller receives customer order -> system prepares normalized fulfillment dispatch sheet -> merchant places order via approved Meesho flow -> updates STOREFY order tracking.

### 5.10 AI Product Intelligence Gateway (`src/modules/ai`)

- **Strict Seven Tools Restriction:**
  1. `AI Product Title`
  2. `AI Product Description`
  3. `AI SEO Description`
  4. `AI Product Features`
  5. `AI Product Specifications`
  6. `AI Product Tags`
  7. `AI Category Suggestion`
- **Human-in-the-Loop Constraint:** AI generation outputs are never committed directly to live storefront records. Outputs are delivered to dashboard review state for explicit merchant approval.
- **Quota & Metering Engine:** Validates organization plan limits (Starter: 50 gens/mo, Business: 500 gens/mo) prior to dispatching upstream model calls. Logs token usage, model identifiers, and generation latency.

### 5.11 Event-Driven Analytics Engine (`src/modules/analytics`)

- **High-Throughput Ingestion:** Non-blocking tracking endpoint `/api/v1/analytics/collect` logging conversion funnel events:
  `visitor` -> `product_view` -> `add_to_cart` -> `checkout_start` -> `purchase`.
- **Aggregation Pipelines:** Background rollups calculating Real-Time Sales, AOV, Conversion Rate, Best Sellers, Return/RTO Rates, COD vs Online Ratios, and Geographic Heatmaps.

---

## 6. Observability, Logging & Error Handling

- **Centralized Error Handling:** Standardized `AppError` class hierarchy mapping domain errors to RFC 7807 Problem Details HTTP responses.
- **Audit Trail:** Immutable `audit_logs` table tracking critical merchant actions (price changes, role assignments, refund disbursements, theme publication).
- **Health Checks:** Liveness and readiness probes exposed at `/api/health` monitoring PostgreSQL connectivity, Supabase storage access, and cache health.

# PHASE 16 IMPLEMENTATION — POS, OMNICHANNEL, B2B, GLOBAL COMMERCE, SALES CHANNELS, CMS & DEVELOPER PLATFORM

## Executive Overview
Phase 16 transforms **STOREFY** from an advanced commerce operating system into an open, multi-channel, multi-market, B2B-ready global commerce and developer platform. All newly introduced subsystems extend the clean monolith without duplicating existing commerce primitives (Orders, Inventory Ledger, Customers, Locations, Payments, Risk, Audit, Entitlements).

---

## Architectural Principles & Strict Invariants
1. **Unified Authoritative Primitives**:
   - `orders` table unified across channels with `sales_channel: "ONLINE" | "POS" | "B2B" | "MARKETPLACE" | "SOCIAL"`.
   - Inventory consumption across all channels resolves against the canonical multi-location inventory ledger (`SELECT FOR UPDATE`).
   - All monetary values remain server-authoritative integer minor units (`bigint` Paise / Cents).
2. **Deterministic Multi-Currency & Precision**:
   - Exchange rates use integer scaled factor arithmetic (`SCALE_FACTOR = 1,000,000` for 6-decimal precision). Floating-point conversions are prohibited in authoritative financial ledgers.
3. **Cryptographic Security & Secret Protection**:
   - API keys (`sfy_live_...`), OAuth client secrets (`sec_...`), and Webhook signing secrets (`whsec_...`) are hashed using SHA-256 at rest and presented in plaintext strictly once upon generation.
   - Webhook payloads are signed via HMAC-SHA256 (`X-Storefy-Signature = t=<timestamp>,v1=<hash>`) preventing spoofing and replay attacks.
4. **Tenant Isolation & Zero Privilege Escalation**:
   - Public Developer API requests (`/api/v1/public/*`) strictly enforce store boundary scoping and granular scopes (e.g. `read_products`, `write_orders`). No public API key or OAuth token can ever infer or escalate to service-role administrative privileges.

---

## Subsystems Implemented

### A. Point of Sale (POS) & In-Store Cashier Terminal
- **Cash Workshifts & Sessions**: `pos_sessions` records opening float, cash sales, payouts, expected cash, counted cash, and cash variance.
- **In-Store Checkout**:
  - Staff selects location and adds items.
  - Server recalculates line item prices and applies permitted discounts.
  - Decrements physical inventory atomically at the specified location via `inventoryMovements` (`type: "SALE"`).
  - Tags order with `salesChannel = "POS"`, status = `"CONFIRMED"`, paymentStatus = `"CAPTURED"`.
  - Generates immutable `PosReceiptSnapshot` with itemized breakdown, tender amount, and change due.
- **UI Route**: `/dashboard/pos`

### B. Omnichannel Commerce
- **Channel Field**: Added `salesChannel` to `orders` schema with default `"ONLINE"`.
- **Shared Catalog & Inventory**: POS, Online, and B2B orders share the same catalog, customer CRM identities, and location-based inventory pools.

### C. B2B & Wholesale Commerce
- **Wholesale Companies**: `b2b_companies` captures company profile, tax identification (GSTIN/VAT), credit limits, and payment terms (`PREPAID`, `NET_7`, `NET_15`, `NET_30`, `NET_60`).
- **Company Roles**: `b2b_company_users` supports `COMPANY_ADMIN`, `APPROVER`, and `BUYER`.
- **Volume & Custom Price Lists**: `b2b_price_lists` and `b2b_price_list_items` override base prices when minimum quantity thresholds are satisfied.
- **Approval Workflow**: `b2b_orders` manages purchase orders through `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `APPROVED` $\rightarrow$ `REJECTED`, enforcing payment terms and credit limits.
- **UI Route**: `/dashboard/b2b`

### D, E, F, G, H & I. Global Commerce, Multi-Currency, Multi-Language & Tax
- **Regional Markets**: `markets` and `market_countries` define regional boundaries with assigned default currencies and languages.
- **Deterministic Currency Conversion**: `exchange_rates` and `currency-service` perform integer scaled factor math (`convertMinorUnits`).
- **Multi-Language Content**: `localized_content` manages translations for product titles, descriptions, categories, and CMS pages.
- **Regional Tax & Customs Duties**:
  - `tax_configs`: Configures country/region tax rates in basis points (`1800` = 18.00%), inclusive/exclusive tax calculation.
  - `duty_configs`: Configures import duty rates and handling fees.
- **Sales Channel Framework**: `sales_channels` registers and manages channel types and allocation policies.
- **UI Route**: `/dashboard/settings/markets`

### J. Content Management System (CMS & Blog)
- **Custom Pages**: `cms_pages` supports title, slug, contentHtml, SEO metadata, status (`DRAFT`, `PUBLISHED`, `ARCHIVED`), and publication dates.
- **Editorial Blog**: `blog_posts` supports category, author, tags, featured image, SEO, and status.
- **Content Security**: `sanitizeHtml` strips `<script>`, `onerror=`, `onload=`, and `javascript:` URIs to block stored XSS attacks.
- **Storefront Public Routes**: `/[domain]/blog` (listing) and `/[domain]/blog/[slug]` (article reader with dynamic SEO metadata).
- **UI Route**: `/dashboard/content`

### K, L, M, N, O & P. Public Developer Platform, API Keys, OAuth & Webhooks
- **Public API Policy**: Exposes controlled endpoints under `/api/v1/public/*`:
  - `GET /api/v1/public/products` (`read_products`)
  - `GET /api/v1/public/orders` (`read_orders`)
  - `GET /api/v1/public/customers` (`read_customers`)
  - `GET /api/v1/public/inventory` (`read_inventory`)
- **API Keys**: `api_keys` manages `sfy_live_...` keys with SHA-256 hashed storage, prefix previews, expiration, revocation, and least-privilege scope checks.
- **OAuth 2.0**: `developer_apps` and `oauth_authorizations` support client registration, authorization code grants, and token exchange (`atk_...`, `rtk_...`).
- **Outbound Webhooks**:
  - `merchant_webhook_endpoints`: Registration with signing secrets (`whsec_...`).
  - `merchant_webhook_deliveries`: Delivery tracking with HMAC-SHA256 signatures, retry counts, and status tracking.
- **Apps Foundation**: `app_installations` supports scoped application installations and configs.
- **UI Route**: `/dashboard/settings/developer`

### R, S, T & U. Data Portability, Imports, Exports & Backups
- **Secure Data Export**: `data_export_jobs` generates JSON/CSV exports for products, customers, orders, inventory, and content with expiring cryptographic download tokens. Platform secrets and password hashes are strictly stripped.
- **Two-Stage Import Pipeline**: `data_import_jobs` pre-validates files for schema conformity and tenant boundary isolation before modifying persistent tables.
- **Platform Migration Jobs**: `migration_jobs` provides mapping and transform foundations for Shopify, WooCommerce, and custom imports.
- **Store Backups**: `backup_jobs` manages metadata snapshots with 30-day retention.
- **UI Route**: `/dashboard/settings/data`

---

## Database Schemas Added
- `orders.ts`: Added `sales_channel` column and `idx_orders_sales_channel` index.
- `pos.ts`: `pos_sessions`, `pos_transactions`.
- `b2b.ts`: `b2b_companies`, `b2b_company_users`, `b2b_price_lists`, `b2b_price_list_items`, `b2b_orders`.
- `markets.ts`: `sales_channels`, `markets`, `market_countries`, `exchange_rates`, `localized_content`, `tax_configs`, `duty_configs`.
- `cms.ts`: `cms_pages`, `blog_posts`.
- `developer.ts`: `developer_apps`, `api_keys`, `oauth_authorizations`, `merchant_webhook_endpoints`, `merchant_webhook_deliveries`, `app_installations`.
- `portability.ts`: `data_export_jobs`, `data_import_jobs`, `migration_jobs`, `backup_jobs`.

---

## Verification & Test Results
- **Vitest Unit & Integration Tests**: **61 test files, 418 tests passing (100%)**.
  - All Phase 0–15 regression tests pass cleanly.
  - Dedicated Phase 16 test suites in `tests/unit/platform-expansion/`:
    - `pos-and-omnichannel.test.ts`
    - `b2b-commerce.test.ts`
    - `markets-currency-localization.test.ts`
    - `cms-and-blog.test.ts`
    - `developer-api-keys-oauth.test.ts`
    - `webhooks-and-apps.test.ts`
    - `data-portability.test.ts`
    - `phase16-security-cross-tenant.test.ts`
- **Hosted Supabase Migration**: Applied `0013_ambiguous_annihilus.sql` successfully.

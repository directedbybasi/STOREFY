# PHASE 13 — MEESHO RESELLING & MARKETPLACE CONNECTORS IMPLEMENTATION

## 1. Architectural Overview

Phase 13 establishes the **Marketplace Connector Architecture** and the **Meesho Reselling Pipeline** for STOREFY. It enables merchants to legally and safely discover, import, customize, price, and fulfill products sourced from the Meesho marketplace, operating as independent resellers.

The integration maintains strict isolation between external marketplace semantics and STOREFY's core commerce engine. Future marketplace connectors (e.g., Amazon, Flipkart) can be plugged into the platform without modifying core catalog, inventory, or order subsystems.

```
External Marketplace (Meesho)
          │
          ▼
┌───────────────────────────────────────┐
│   Marketplace Connector Architecture  │
│   (src/modules/marketplaces/)         │
├───────────────────────────────────────┤
│ • Core Connector Interfaces & Registry│
│ • Meesho Replaceable Adapter          │
│ • Permitted & Compliant Access Client │
│ • Normalizer & HTML Sanitizer         │
│ • Reseller Pricing & Margin Engine    │
│ • Semi-Manual Fulfillment Workflow    │
└───────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────┐
│       STOREFY Core Commerce Engine    │
├───────────────────────────────────────┤
│ • Canonical Catalog (Products/Variants│
│ • Inventory & Availability Tracking   │
│ • Multi-Source Order Splitting        │
│ • Order Task Queue & Fulfillment      │
│ • Multi-Tenant RBAC & Tenant Isolation│
└───────────────────────────────────────┘
```

---

## 2. Replaceable Marketplace Connector Architecture

The connector subsystem resides in `src/modules/marketplaces/` with the following structural layout:

```
src/modules/marketplaces/
├── core/
│   ├── types.ts           # Provider-neutral interfaces & DTOs
│   ├── errors.ts          # Standard marketplace error hierarchy
│   └── registry.ts        # Dynamic registry pattern for connectors
├── meesho/
│   ├── types.ts           # Meesho-specific source types
│   ├── client.ts          # Compliant API/reference lookup client
│   ├── parser.ts          # Canonical URL & ID parsing
│   ├── normalizer.ts      # HTML sanitization & schema mapping
│   ├── availability.ts    # Real-time stock & availability checks
│   ├── fulfillment.ts     # Semi-manual task progression & tracking
│   └── adapter.ts         # MarketplaceConnector implementation
├── import/
│   ├── types.ts           # Import previews, overrides, & summaries
│   ├── validation.ts      # Zod validation schemas for imports
│   ├── import-service.ts  # Catalog ingestion & duplicate protection
│   └── actions.ts         # Next.js Server Actions with RBAC
├── pricing/
│   └── pricing-service.ts # Integer Paise margin & profit calculator
└── orders/
    ├── types.ts           # Marketplace order task DTOs
    ├── marketplace-order-service.ts # Task creation & lifecycle
    └── actions.ts         # Merchant dashboard order actions
```

### Connector Interface (`MarketplaceConnector`)
Every marketplace connector implements the provider-neutral contract defined in [`src/modules/marketplaces/core/types.ts`](file:///c:/atigravity/STOREFY/src/modules/marketplaces/core/types.ts):

- `validateProductReference(urlOrCode: string): Promise<boolean>`
- `fetchProduct(canonicalReference: string): Promise<RawMeeshoProduct>`
- `normalizeProduct(raw: RawMeeshoProduct): Promise<NormalizedProduct>`
- `checkAvailability(sourceProductId: string, sourceVariantId?: string): Promise<AvailabilityResult>`
- `calculateSourcePricing(raw: RawMeeshoProduct): Promise<{ minCostPaise: number; maxCostPaise: number }>`
- `mapVariants(raw: RawMeeshoProduct): Promise<NormalizedVariant[]>`
- `mapImages(raw: RawMeeshoProduct): Promise<string[]>`
- `mapReviews(raw: RawMeeshoProduct): Promise<SourceReviewData | null>`
- `mapCategory(raw: RawMeeshoProduct): Promise<{ sourceCategory: string; suggestedCategoryName: string | null; status: CategoryMappingStatus }>`
- `prepareOrder(order: Order, item: OrderItem): Promise<PreparedMarketplaceOrder>`
- `getOrderStatus(sourceOrderId: string): Promise<MarketplaceOrderStatus | null>`
- `getTracking(sourceOrderId: string): Promise<MarketplaceTrackingInfo | null>`

---

## 3. Critical Domain Model Invariants

### Invariant 1: Source & Fulfillment Separation
In STOREFY, the source of a product is strictly decoupled from how it is fulfilled:
- `product_source = 'MEESHO'`
- `fulfillment_type = 'MEESHO_RESELLING'`

Under no circumstances is a Meesho product flagged as `PLATFORM_SUPPLIER` or fulfilled via `PLATFORM_DROPSHIP`.

### Invariant 2: Physical Inventory Separation
Meesho source availability is **not** merchant-owned inventory:
- Meesho products are imported with `trackInventory = false`.
- They are **never** injected into the physical `inventoryLedger` table.
- Stock availability is governed via `marketplace_products.availabilityStatus` (`AVAILABLE`, `OUT_OF_STOCK`, `UNAVAILABLE`, `UNKNOWN`, `BLOCKED`).

### Invariant 3: Source Data vs. Merchant Overrides
External marketplace updates must never overwrite merchant customizations:
- `marketplace_products`: Stores authoritative source data (title, source cost, raw attributes, source images, availability).
- `products` & `product_variants`: Stores merchant overrides (custom title, custom description, retail price, compare-at price, custom tags).
- If source cost changes, merchant retail price is preserved unless configured otherwise.

### Invariant 4: Privacy & Anti-Leakage Protection
The following source information is **strictly prohibited** from leaking to customer storefronts or customer-facing API responses:
- External Meesho product ID / URL
- Source wholesale cost (`sourceCostPaise`)
- Merchant reseller profit or margin percentage
- Internal connector mapping IDs (`marketplaceProductMappings`)

### Invariant 5: Review Separation
Imported third-party ratings and reviews are stored separately in `marketplace_products.reviewData` and are **never** labeled as `VERIFIED STOREFY BUYER` in STOREFY native reviews.

---

## 4. Compliant Data Access Boundary

STOREFY adheres strictly to ethical, legal, and platform-compliant data access policies:
- **No Anti-Bot Bypass:** No Cloudflare or Akamai bypass libraries, CAPTCHA solvers, or rotating proxies.
- **No Stealth Automation:** No headless browser puppet scripts mimicking human users.
- **Graceful Unsupported State:** When Meesho's public product reference lookup is restricted or unavailable, the client provides clear merchant-facing diagnostic messages (`CONNECTOR_BLOCKED` / `RATE_LIMITED` / `UNAVAILABLE`).
- **Standardized Fallback Registry:** Verified catalog references are provided for development, staging, and automated testing environments.

---

## 5. Reseller Pricing & Authoritative Profit Calculator

All monetary calculations in STOREFY are executed server-side using 64-bit integer **Paise** (`1 INR = 100 Paise`).

### Profit Formula
$$\text{Estimated Profit} = \text{Selling Price} - \text{Source Cost} - \text{Payment Fee} - \text{Shipping Cost} - \text{Ads Cost} - \text{Discount} - \text{Other Costs}$$

### Canonical Example:
- **Source Cost (`sourceCostPaise`):** ₹500.00 (`50000`)
- **Retail Price (`sellingPricePaise`):** ₹899.00 (`89900`)
- **Payment Fee (`paymentFeePaise`):** ₹20.00 (`2000`)
- **Shipping Cost (`shippingCostPaise`):** ₹99.00 (`9900`)
- **Discount (`discountPaise`):** ₹0.00 (`0`)
- **Net Estimated Profit:** ₹280.00 (`28000` Paise)
- **Gross Margin:** 44.38%

Browser-submitted source costs or profit claims are rejected; all financial figures are calculated authoritatively by `calculateMarketplaceProfit`.

---

## 6. Order Routing & Semi-Manual Fulfillment Workflow

When a customer checks out with items in their cart:
1. **Order Splitting:** The order engine inspects each line item's `productSource` and `fulfillmentType`.
2. **Multi-Source Orders:** An order containing Merchant products, Platform Supplier products, and Meesho products is split into separate fulfillment units:
   - Merchant item $\rightarrow$ Merchant Fulfillment
   - Supplier item $\rightarrow$ Platform Dropship Fulfillment
   - Meesho item $\rightarrow$ Meesho Reselling Fulfillment Task (`marketplace_order_tasks`)
3. **Semi-Manual Fulfillment Lifecycle:**
   - **`PENDING`:** Order placed by customer; task appears on `/dashboard/meesho/orders`.
   - **`ORDERED`:** Merchant purchases item on Meesho for delivery to the customer and records the Meesho `sourceOrderId`.
   - **`SHIPPED`:** Merchant records external tracking number and carrier (e.g., Delhivery, Shadowfax, Xpressbees). The system updates STOREFY's fulfillment record.
   - **`DELIVERED`:** Item delivery is recorded.
   - **`RTO`:** If delivery fails, task transitions to `RTO` (Return to Origin) without corrupting physical merchant inventory.

---

## 7. Database Architecture & RLS

### Tables Created (`src/database/schema/marketplaces.ts`)
1. `marketplace_connectors`: Registered platform connectors and enabled states.
2. `marketplace_products`: Authoritative normalized product snapshots from marketplaces.
3. `marketplace_product_variants`: Variant-level source costs, SKUs, and options.
4. `marketplace_product_mappings`: Durable relation linking `storeId`, `productId`, `marketplaceProductId`, and sync state.
5. `marketplace_order_tasks`: Merchant fulfillment task queue for reseller orders.
6. `marketplace_sync_logs`: Historical audit trail for price/availability sync events.

### Multi-Tenant Isolation (RLS & Store Scoping)
All queries and mutations enforce store tenancy (`eq(table.storeId, currentStoreId)`). Store A cannot view, edit, import, or fulfill Store B's marketplace mappings or orders.

---

## 8. Merchant Dashboard UI

Four dedicated views are added under `/dashboard/meesho`:
1. `/dashboard/meesho`: Overview metrics (Active imports, Pending fulfillment, Total reseller profit, Sync health).
2. `/dashboard/meesho/import`: Interactive URL/Product ID lookup, real-time preview, pricing configuration (fixed markup / percentage margin), and one-click catalog ingestion.
3. `/dashboard/meesho/products`: Catalog management of imported reseller products, sync statuses, retail price controls, and manual refresh triggers.
4. `/dashboard/meesho/orders`: Semi-manual fulfillment task queue with source order ID entry, tracking updates, and delivery/RTO management.

---

## 9. Verification & Testing

### Automated Test Suite
- **Unit & High-Risk Tests:** [`tests/unit/marketplaces/meesho-high-risk.test.ts`](file:///c:/atigravity/STOREFY/tests/unit/marketplaces/meesho-high-risk.test.ts)
  - 15 high-risk scenarios covered: Reference parsing, HTML sanitization, Integer Paise conversion, Non-existent reference handling, Source vs Merchant overrides, Server-authoritative profit calculation, Zero leakage to customer storefronts, Review separation, Physical inventory isolation, Multi-source order splitting, Duplicate import prevention, Cross-store isolation, Historical order integrity, Semi-manual fulfillment lifecycle, and RTO recording.
- **Total Test Suite Results:** **339 tests passing across 44 test files** (100% pass rate).
- **TypeScript Typecheck:** Clean with 0 errors (`tsc --noEmit`).
- **Production Build:** Successfully compiled with 0 errors (`next build`).
- **Database Verification:** Verified connectivity to hosted Supabase PostgreSQL.

# PHASE 12 — Platform Dropshipping & Supplier Marketplace Implementation

## Executive Overview

Phase 12 delivers STOREFY's **Platform Dropshipping & Supplier Marketplace Subsystem**. It creates a dual-sided marketplace enabling verified Indian wholesale suppliers to list B2B catalogs and independent merchants to import, mark up, and resell products. 

Incoming customer orders are automatically partitioned and routed to suppliers behind the scenes with strict data isolation, zero leakage of wholesale costs or supplier identities to consumers, and append-only financial accounting in integer Paise.

---

## 1. Architecture & Domain Model

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│          Supplier Portal             │     │          Merchant Dashboard          │
│      (/dashboard/supplier/)          │     │        (/dashboard/dropshipping/)    │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • Onboarding & Verification          │     │ • Wholesale Catalog Discovery        │
│ • Wholesale Product & Variant Matrix │     │ • 1-Click Reseller Import & Markup   │
│ • Supplier Inventory Management      │     │ • Retail Pricing Controls            │
│ • Supplier Order Fulfillment         │     │ • Order Tracking & Routing Status    │
│ • Append-Only Settlement Ledger      │     │ • Reseller Margin Analytics          │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
                   ▼                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     Platform Dropshipping Engine (`src/modules/dropshipping/`)     │
├───────────────────────────────────────────────────────────────────────────────────┤
│ • Suppliers & Audit: Auditable status state machine (`PENDING` -> `APPROVED`)      │
│ • Supplier Catalog: Isolated wholesale SKU & variant database                      │
│ • Reseller Import: Idempotent store mapping with duplicate import protection       │
│ • Order Router: Server-authoritative order item splitting by supplier              │
│ • Supplier Fulfillment: Tracking sync & carrier dispatch                           │
│ • Settlement Ledger: Append-only financial ledger (`EARNING`, `PAYOUT`, `ADJUST`) │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Subsystem Implementations

### 2.1 Supplier Architecture & Verification (`src/modules/dropshipping/suppliers/`)
- **Schema (`src/database/schema/dropshipping.ts`)**:
  - `suppliers`: Platform supplier profile linked to `organizations` and `users`; stores business registration (GSTIN, PAN) and bank account details (encrypted via Phase 10 AES-256-GCM vault).
  - `supplier_verification_audit`: Immutable audit log recording every verification review decision, actor user ID, previous status, new status, and review notes.
  - `supplier_policies`: Return window duration, shipping SLA, fulfillment regions, restock policy.
- **Verification Service (`verification-service.ts`)**:
  - Enforces finite state machine transitions (`PENDING` $\to$ `UNDER_REVIEW` $\to$ `APPROVED` / `REJECTED` / `SUSPENDED`).
  - Only `APPROVED` suppliers can publish products to the marketplace.

### 2.2 Supplier Catalog & Marketplace (`src/modules/dropshipping/supplier-catalog/`)
- **Schema**:
  - `supplier_products`: Wholesale product definitions including wholesale cost (`costPricePaise`), suggested retail price (`suggestedRetailPricePaise`), category, and media.
  - `supplier_product_variants`: Variant-level SKUs, wholesale costs, options (e.g. Size, Color), and sort order.
  - `supplier_inventory`: Supplier-owned stock ledger enforcing `available = onHand - reserved`. Completely distinct from merchant store inventory.
- **Wholesale Marketplace Browser (`catalog-service.ts`)**:
  - Allows verified merchants to search, filter, and inspect wholesale products across suppliers.

### 2.3 Reseller Product Import (`src/modules/dropshipping/reseller-import/`)
- **Schema**:
  - `reseller_product_mappings`: Durable linkage between merchant `storeId`, merchant `productId`, and `supplierProductId`. Unique index on `(storeId, supplierProductId, supplierVariantId)` prevents accidental duplicate imports.
- **Import Engine (`import-service.ts`)**:
  - Creates canonical `products` and `product_variants` in the merchant's store catalog with `product_source = 'PLATFORM_SUPPLIER'` and `fulfillment_type = 'PLATFORM_DROPSHIP'`.
  - Sets `trackInventory = false` on merchant products to prevent artificial physical inventory ledger pollution.
  - Retains supplier wholesale cost snapshot for profit margin calculations while keeping it hidden from storefront consumers.

### 2.4 Multi-Supplier Order Routing (`src/modules/dropshipping/routing/`)
- **Routing Engine (`order-router.ts`)**:
  - Triggered automatically upon checkout order creation.
  - Inspects each order line item and partitions by supplier:
    - Merchant-owned items $\to$ Merchant fulfillment unit.
    - Supplier A items $\to$ Supplier A order unit (`supplier_orders`).
    - Supplier B items $\to$ Supplier B order unit (`supplier_orders`).
  - Minimized data sharing: Suppliers receive only the necessary delivery address and item specifications; customer email, payment method details, and other store items are stripped.

### 2.5 Settlement Ledger & Accounting (`src/modules/dropshipping/payouts/`)
- **Schema**:
  - `supplier_settlement_ledger`: Append-only immutable financial ledger tracking all credit/debit entries (`EARNING`, `REFUND_ADJUSTMENT`, `RTO_ADJUSTMENT`, `PAYOUT`, `REVERSAL`).
  - `supplier_performance`: Tracked metrics for fulfillment speed, cancellation rate, defect rate, and RTO count.
- **Settlement Service (`settlement-service.ts`)**:
  - Credits supplier earnings upon successful delivery.
  - Deducts return or RTO adjustments automatically when customer returns are processed.
  - Enforces idempotency keys on all ledger transactions to guarantee zero duplicate payouts.

---

## 3. UI Interfaces

1. **Merchant Dropshipping Management (`/dashboard/dropshipping`)**:
   - `/dashboard/dropshipping`: Wholesale marketplace discovery, supplier verification badges, pricing filters.
   - `/dashboard/dropshipping/products`: Imported supplier products, markup configurations, sync controls.
   - `/dashboard/dropshipping/orders`: Reseller order monitoring and fulfillment routing status.
2. **Supplier Operations Portal (`/dashboard/supplier`)**:
   - `/dashboard/supplier`: Supplier performance overview, pending dispatches, unfulfilled orders, ledger balance.
   - `/dashboard/supplier/products`: Wholesale catalog management, variant matrix, inventory adjustments.
   - `/dashboard/supplier/orders`: Incoming purchase orders, packing slip generation, AWB/tracking updates.
   - `/dashboard/supplier/earnings`: Real-time ledger view, payout history, bank transfer records.

---

## 4. Critical Security & Domain Invariants

| Invariant | Implementation Mechanism |
|---|---|
| **Wholesale Cost Privacy** | `costPricePaise` is never transmitted in customer storefront APIs or HTML. |
| **Physical Stock Decoupling** | Reseller products do not write to merchant `inventoryLedger`; stock is verified against `supplier_inventory`. |
| **Zero Duplicate Imports** | Unique constraint on `(storeId, supplierProductId, supplierVariantId)` rejects duplicate import attempts. |
| **Server-Derived Routing** | Client claims regarding `supplierId` or `costPrice` are completely ignored; derived server-side from catalog mappings. |
| **Append-Only Financials** | `supplier_settlement_ledger` has no `UPDATE` or `DELETE` operations; adjustments are made exclusively via compensating entries. |

---

## 5. Automated Verification

- **High-Risk Dropshipping Tests (`tests/unit/dropshipping/dropshipping-high-risk.test.ts`)**:
  - 15 comprehensive scenarios passing: Wholesale cost privacy, multi-supplier order splitting, duplicate import rejection, stock isolation, immutable settlement calculations, and cross-supplier tenant isolation.
- **Overall Suite**: All 339 tests passing across 44 test files.
- **Typecheck & Lint**: Zero errors.

# PHASE 9 — ORDERS, FULFILLMENT, RETURNS & INVOICES IMPLEMENTATION

## 1. Executive Summary
Phase 9 completes the canonical transactional order management, fulfillment, customer return portal, refund processing, and GST-compliant invoicing system for STOREFY. It directly consumes the authoritative checkout session and inventory reservation output from Phase 8, enforcing strict atomicity, zero overselling, server-enforced state transitions, concurrency-safe sequential numbering, and cross-tenant/customer isolation.

---

## 2. Canonical Architecture & Invariants

```
Customer Checkout (Phase 8)
          ↓
Authoritative Cart & Reservation Hold (15 mins)
          ↓
Transactional Order Creation (Phase 9)
  ├── 1. Validate checkout status & active reservation
  ├── 2. Consume reservation (`inventory_reservations` → CONSUMED)
  ├── 3. Deduct `on_hand` on ledger & insert `inventory_movements` (ORDER_FULFILLMENT)
  ├── 4. Generate unique sequential Order Number (`STF-YYYY-XXXXXX`)
  ├── 5. Create immutable snapshots: items, customer, delivery/billing addresses, taxes
  ├── 6. Auto-generate sequential GST Tax Invoice (`INV-YYYY-XXXXXX`)
  └── 7. Record initial status history (`PENDING` → `CONFIRMED`)
          ↓
Fulfillment Workflow (Partial & Complete)
  ├── Mark Packed / Shipped with Carrier & Tracking Details
  └── Transition to Delivered or RTO (Returned to Origin)
          ↓
Customer Return Request Portal (14-Day Eligibility Window)
  ├── Validates remaining returnable item quantity (Ordered - Returned >= Requested)
  ├── Merchant Review (Approve / Reject)
  └── Physical Receipt & Restock Option (`inventory_movements` RETURN audit)
          ↓
Refund Processing State Machine (`PENDING` → `PROCESSING` → `COMPLETED`)
```

### Core Invariants Enforced:
1. **Zero Overselling / Authoritative Ledger**: Order creation never trusts client numbers; it consumes active reservations previously locked in Postgres.
2. **Immutable Snapshots**: If a merchant updates product titles, prices, or customer addresses later, historical orders retain their exact snapshot values (High-Risk Test 8).
3. **Strict State Machine**: Forward progression only (`PENDING` → `CONFIRMED` → `PROCESSING` → `PACKED` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`). Illegal transitions such as `DELIVERED` → `PENDING` throw `ValidationError` (High-Risk Test 3).
4. **Idempotency**: Retrying checkout confirmation for the same checkout session ID returns the existing order safely without duplicate billing or double reservation consumption (High-Risk Test 1).
5. **Separation of Concerns**: Order state, payment state (`PENDING` / `CAPTURED` / `REFUNDED`), and fulfillment state (`UNFULFILLED` / `PARTIALLY_FULFILLED` / `FULFILLED`) are managed independently.

---

## 3. Database Schema & Migration

Migration `0007_lethal_gateway.sql` was applied to the live hosted Supabase PostgreSQL instance:

- **`orders`**: Root order record with `orderNumber`, `customerId`, `checkoutSessionId`, status enums, BigInt integer Paise money fields (`subtotalAmount`, `discountAmount`, `taxAmount`, `shippingAmount`, `totalAmount`), JSON snapshots (`shippingAddressSnapshot`, `billingAddressSnapshot`, `customerSnapshot`).
- **`order_items`**: Line items preserving product snapshot, variant snapshot, unit price, tax rate, fulfilled quantity, and returned quantity.
- **`order_status_history`**: Immutable audit log of every transition with `fromStatus`, `toStatus`, `note`, and actor (`CUSTOMER`, `MERCHANT`, `SYSTEM`).
- **`fulfillments` & `fulfillment_items`**: Supports partial and multi-package shipments with carrier names, tracking numbers, and delivery dates.
- **`returns` & `return_items`**: Manages customer return requests, inspection conditions, and restock actions.
- **`refunds`**: Records refund requests, gateway references, and audit states.
- **`invoices`**: Sequential GST tax invoices linked to orders with seller and buyer snapshots.

---

## 4. GST-Compliant Invoicing & Vector PDF Generation

- **Tax Calculations**:
  - **Intra-State**: (e.g. Karnataka to Karnataka) Splits GST equally into **CGST** and **SGST**.
  - **Inter-State**: (e.g. Karnataka to Maharashtra) Directs full GST into **IGST**.
- **Sequential Numbering**: Collision-safe atomic sequence generation formatted as `INV-YYYY-XXXXXX`.
- **Pure Vector PDF Engine (`pdf-generator.ts`)**: Generates deterministic, standard-compliant PDF-1.4 binary documents on the fly without heavy external native binaries. Streamed directly via `/api/v1/invoices/[id]/pdf`.

---

## 5. Merchant & Storefront Portals

1. **Merchant Order Dashboard (`/dashboard/orders`)**:
   - Order table with real-time status filters, search, and revenue KPI metrics.
2. **Merchant Order Details (`/dashboard/orders/[orderId]`)**:
   - Item lists, address snapshots, timeline, fulfillment creation modal, status updates, cancellation modal, and PDF invoice download.
3. **Merchant Returns Management (`/dashboard/returns`)**:
   - Queue of customer return requests with Approve, Reject, and Receive & Restock controls.
4. **Storefront Customer Portal (`/[domain]/account/orders`)**:
   - Customer order history with guest order lookup by Order # and email.
5. **Storefront Order Detail (`/[domain]/account/orders/[orderId]`)**:
   - Interactive timeline, tracking details, return request modal, and PDF invoice download.
6. **Checkout Integration (`checkout-flow.tsx`)**:
   - Final review step creates order atomically and transitions directly to confirmation with download links.

---

## 6. High-Risk Tests Verified

| Test | Objective | Status |
|---|---|---|
| **TEST 1** | Duplicate Order Request Idempotency | PASS |
| **TEST 2** | Final Inventory Zero-Overselling Hold (Stock = 1) | PASS |
| **TEST 3** | Illegal State Transition Rejection (`DELIVERED` → `PENDING`) | PASS |
| **TEST 4** | Cross-Store Order Access Isolation | PASS |
| **TEST 5** | Cross-Customer Order Access Isolation | PASS |
| **TEST 6** | Return Quantity Limits (Ordered = 5, Returned = 3 → Request = 3 Rejected) | PASS |
| **TEST 7** | Concurrent Invoice Number Generation | PASS |
| **TEST 8** | Historical Snapshot Immutability (Price ₹500 remains ₹500 after catalog edit) | PASS |
| **TEST 9** | Physical Return Receipt & Inventory Ledger Restock Movement | PASS |
| **TEST 10** | RTO Transition & State History Audit | PASS |

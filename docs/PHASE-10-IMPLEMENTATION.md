# PHASE 10 — Payments & Shipping Integrations: Implementation Documentation

## Executive Overview
Phase 10 delivers production-ready, provider-agnostic external integrations for both **Payments** (Razorpay, Cashfree, COD) and **Shipping & Logistics** (Shiprocket, Delhivery) across STOREFY. In strict accordance with the Zero-Trust security invariants, client-side claims regarding payment status, amount, and shipping rates are never trusted. All state transitions are strictly governed by server cryptographic verification and durable, append-only webhook ledgers.

---

## 1. Architectural Model & Domain Boundaries

```
                         [ Customer / Storefront ]
                                     │
                                     ▼
                          [ Checkout & Orders ]
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
      [ Payment Service ]                         [ Shipping Service ]
               │                                           │
       PaymentProvider                             ShippingProvider
     ├── Razorpay                                ├── Shiprocket
     ├── Cashfree                                └── Delhivery
     └── COD                                     (Live Rates / Manifests)
               │                                           │
               ▼                                           ▼
    [ AES-256-GCM Vault ]                       [ AES-256-GCM Vault ]
 (Encrypted Merchant Keys)                   (Encrypted Carrier Tokens)
               │                                           │
               ▼                                           ▼
    [ Webhook Event Ledger ]                   [ Webhook Event Ledger ]
   (HMAC SHA-256 Idempotency)                 (Carrier Status / Tracking)
```

---

## 2. Core Modules & Provider Abstractions

### 2.1 Payment Providers (`src/modules/payments/`)
- `PaymentProvider`: Universal provider interface defining:
  - `createPaymentOrder(params)`: Initiates provider order returning server-controlled client payload.
  - `verifyPayment(params)`: Cryptographically validates payment signatures using provider secrets.
  - `processRefund(params)`: Executes partial or full refunds against the payment gateway.
  - `verifyWebhookSignature(rawBody, headers)`: Timing-safe HMAC SHA-256 validation of raw unparsed bodies.
  - `parseWebhookEvent(rawBody, headers)`: Normalizes provider-specific payloads into canonical events.
- Adapters:
  - `RazorpayPaymentProvider` (`src/modules/payments/adapters/razorpay.ts`): Live API and test sandbox simulation; `HMAC-SHA256(order_id + "|" + payment_id, secret)` signature verification.
  - `CashfreePaymentProvider` (`src/modules/payments/adapters/cashfree.ts`): Live API and test sandbox; `HMAC-SHA256(timestamp + rawBody, secret)` webhook verification.
  - `CODPaymentProvider` (`src/modules/payments/adapters/cod.ts`): Store-level eligibility checking against minimum/maximum thresholds; preserves `PENDING` payment state until delivery collection.
- `PaymentService` (`src/modules/payments/payment-service.ts`):
  - Enforces authoritative order total validation (rejects amount mismatches).
  - Enforces monotonic out-of-order state transitions (once `CAPTURED`, never regresses to `AUTHORIZED` or `PENDING`).
  - Idempotent payment order creation via unique `idempotencyKey`.

### 2.2 Shipping Carriers (`src/modules/shipping/`)
- `ShippingProvider`: Universal carrier interface defining:
  - `calculateRates(params)`: Queries live carrier serviceability rates.
  - `createShipment(params)`: Generates external carrier shipment, assigning AWB tracking identifiers.
  - `trackShipment(awb)`: Fetches tracking events and checkpoints.
  - `cancelShipment(shipmentId)`: Cancels parcel pickup.
  - `verifyWebhookSignature` & `parseWebhookEvent`: Handles carrier webhook tracking updates.
- Adapters:
  - `ShiprocketShippingProvider` (`src/modules/shipping/adapters/shiprocket.ts`): Surface & Air rates, multi-carrier AWB assignment, webhook parsing.
  - `DelhiveryShippingProvider` (`src/modules/shipping/adapters/delhivery.ts`): Surface & Express rates, CMU waybills, tracking checkpoints.
- `ShippingService` (`src/modules/shipping/shipping-service.ts`):
  - In-memory short-lived rate cache (5 minutes TTL).
  - Double-click idempotency guard preventing duplicate shipment creation.
  - Automatic `RTO_DELIVERED` handling: updates order status to `RTO` and restocks inventory to the immutable `inventory_movements` ledger per Phase 9 canonical rules.

---

## 3. Database Schema & RLS Migrations

Migration `0008_nosy_lila_cheney.sql` applied to hosted Supabase PostgreSQL:
1. `payment_accounts`: Merchant credentials encrypted via AES-256-GCM with unique index on `(store_id, provider)`.
2. `payments`: Authoritative transaction records with BigInt integer Paise money fields.
3. `payment_attempts`: Granular audit log of payment attempts supporting customer retries without duplicate orders.
4. `webhook_events`: Durable webhook ledger with unique index on `(provider, event_id)` guaranteeing deduplication.
5. `shipping_accounts`: Merchant carrier API tokens and default origin dispatch address.
6. `shipments`: Carrier parcels linked to Phase 9 `fulfillments`.
7. `shipment_tracking_events`: Append-only carrier tracking history.

Full Row-Level Security (RLS) policies enabled across all tables, ensuring strict multi-tenant store isolation and zero plaintext credential leakage to anonymous or customer roles.

---

## 4. Webhook Engine & Raw-Body Cryptographic Security

Endpoints:
- `/api/v1/webhooks/razorpay`
- `/api/v1/webhooks/cashfree`
- `/api/v1/webhooks/shiprocket`
- `/api/v1/webhooks/delhivery`

Invariants Enforced:
1. **Raw Body Capture**: Request bodies are read via `await req.text()` before any JSON parsing to guarantee byte-exact HMAC calculation.
2. **Timing-Safe Comparison**: HMAC digests are compared using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
3. **Idempotency Guard**: Every webhook event is registered in `webhook_events` under `(provider, event_id)`. Replayed webhooks return HTTP 200 immediately without re-executing state updates.
4. **Monotonic Progression**: State transitions verify that high-precedence terminal states (`CAPTURED`) are never overwritten by delayed out-of-order events (`AUTHORIZED`).

---

## 5. Verification & High-Risk Test Results

All 11 High-Risk tests verified across 42 test suites (309 tests passing):
- **TEST 1 — Fake Payment Success**: Client sends forged success without valid provider signature; rejected immediately.
- **TEST 2 — Wrong Amount**: Client or provider claims ₹10 for ₹1500 order; detected and rejected with amount mismatch error.
- **TEST 3 — Forged Razorpay Signature**: Signature payload tampering detected via timing-safe HMAC check; rejected.
- **TEST 4 — Duplicate Webhook**: Replayed webhook recognized in `webhook_events`; state transition applied once.
- **TEST 5 — Out-of-Order Webhook**: `payment.captured` arrives before `payment.authorized`; monotonic state preserves `CAPTURED`.
- **TEST 6 — Duplicate Refund**: Excess refund beyond captured amount prevented; idempotent refund tracking.
- **TEST 7 — Cross-Store Payment**: Store A attempting Store B payment verification or refund rejected with authorization error.
- **TEST 8 — Duplicate Shipment Creation**: Double-click fulfillment creation returns existing shipment without creating second AWB.
- **TEST 9 — Forged Tracking**: Arbitrary tracking numbers without server carrier validation rejected.
- **TEST 10 — Duplicate Carrier Webhook**: Carrier delivery webhook processed once; duplicate event ignored.
- **TEST 11 — Cross-Store Shipment**: Store A attempting Store B shipment cancellation or retrieval rejected.

# Phase 15 — Advanced Commerce, Automation, Analytics, Retention, Inventory & Risk Implementation

## Executive Summary
Phase 15 transforms STOREFY from a robust transactional e-commerce engine into a comprehensive, enterprise-grade commerce operating system. Built strictly as an extension of the existing monolithic architecture (Phases 0–14), Phase 15 introduces 21 advanced commerce subsystems covering deep financial analytics, event-driven automations, cart abandonment recovery, multi-channel notifications, customer retention (loyalty, gift cards, store credit, wallet, referrals, dynamic segments), storefront merchandising (search, recommendations, bundles, cross-sells), operational multi-location inventory (warehouses, transfers, purchase orders), deterministic risk assessment, immutable audit trails, and centralized plan entitlements.

All financial balances and inventory movements remain strictly server-authoritative, recorded in integer Paise (`bigint`), enforced via append-only ledgers, and protected against concurrency race conditions and double-spending via transactional row-level locking.

---

## 1. Advanced Analytics & Reporting (Domain A)
- **Authoritative Metrics**: Financial KPIs (Gross Sales, Net Sales, Discounts, Refunds, Shipping, Taxes, AOV) are computed directly from authoritative PostgreSQL records (`orders`, `order_items`, `refunds`), never trusting client-side telemetry.
- **Reporting Intervals**: Supports `today`, `yesterday`, `7d`, `30d`, `90d`, and `custom` ranges with exact-matching previous period durations for comparative growth calculations.
- **Product & Customer Intelligence**: Aggregates top-performing products, new vs. returning customers, repeat purchase rates, and observed historical LTV ($\frac{\text{Total Spent}}{\text{Total Customers}}$).
- **Cohort Retention**: Groups customer cohorts by month of first purchase and tracks retention rates across successive months.

---

## 2. Event-Driven Automation Engine (Domain B & U)
- **Architecture**: `EVENT` $\to$ `TRIGGER` $\to$ `CONDITIONS` $\to$ `ACTIONS` $\to$ `EXECUTION` $\to$ `AUDIT LOG`.
- **Condition Evaluator**: Supports `equals`, `not_equals`, `greater_than`, `less_than`, `contains`, and `in`.
- **Action Dispatcher**: Dispatches `send_email`, `send_sms`, `send_push`, `create_store_credit`, `add_loyalty_points`, `apply_customer_tag`, `send_in_app_notification`.
- **Infinite Loop Defense**: Enforces a strict execution call stack depth limit (`MAX_EXECUTION_DEPTH = 3`) to prevent recursive execution loops (e.g. customer update triggering customer update).
- **Audit Logging**: Every execution records execution status (`SUCCESS`, `FAILED`, `SKIPPED`), execution traces, and errors in `automation_runs`.

---

## 3. Abandoned Cart & Checkout Recovery (Domain C)
- **Inactivity Detection**: Background scanning identifies checkout sessions in `RESERVED` state inactive beyond configured thresholds (e.g., 30 minutes).
- **Cryptographic Recovery Tokens**: Tokens are signed using HMAC-SHA256 containing store ID, checkout session ID, and expiration timestamp.
- **Tamper & Expiry Protection**: Tokens cannot be forged or reused across stores. Expired tokens are rejected.
- **Lifecycle Tracking**: States transition through `ABANDONED` $\to$ `RECOVERY_SENT` $\to$ `RECOVERED` or `EXPIRED`.

---

## 4. Multi-Channel Notification Center (Domain D)
- **Provider-Neutral Abstraction**: Dispatches across `EMAIL`, `SMS`, `PUSH`, and `IN_APP` channels via `NotificationProvider`. Includes `MockNotificationProvider` for deterministic unit testing.
- **Customer Consent & Preferences**: Verifies `notification_preferences` before sending. Customers can opt-in/opt-out of marketing communications, while transactional notifications are preserved.
- **In-App Notification Feed**: Merchant and staff alerts are accessible at `/dashboard/notifications` with unread badges and real-time read/unread status management.

---

## 5. Retention & Loyalty Systems (Domains E, F, G, H, I, J)

### E. Loyalty & Rewards
- **Authoritative Calculations**: Points earning based on integer Paise (e.g., 1 point per ₹10 spent) and redemption discounts (e.g., 1 point = ₹1 discount).
- **Append-Only Ledger**: All transactions are written to `loyalty_ledger` (`EARN`, `REDEEM`, `EXPIRE`, `ADJUST`, `REVERSE`).
- **Refund Safety**: Points earned on refunded or cancelled orders are automatically reversed, preventing negative balances or reward abuse.

### F. Gift Cards
- **Secure Hashing**: Plaintext 16-character alphanumeric codes (`XXXX-XXXX-XXXX-XXXX`) are displayed once upon issuance and stored solely as SHA-256 hashes (`codeHash`) and masked previews (`••••-••••-••••-1234`).
- **Double-Spending Defense**: Redemptions execute within database transactions with row-level locks. Supports partial redemptions until balance reaches zero (`REDEEMED`).

### G & H. Store Credit & Customer Wallet
- **Immutable Ledger**: Store credit and customer wallets maintain strict append-only audit ledgers (`store_credit_ledger`, `wallet_ledger`).
- **Refund Conversion**: Allows merchants to convert order refunds directly into customer store credit.
- **Multi-Balance Priority**: Wallet debiting deducts from standard balances first before promotional balances.

### I. Referrals & Affiliates
- **Referral Tracking**: Generates unique customer referral codes (`referral_codes`) and records attributions upon visiting/purchasing.
- **Fraud Prevention**: Self-referrals (same customer ID, email, phone, IP) are strictly blocked.
- **Qualified Rewards**: Rewards are granted upon qualified order completion and reversed if the order is cancelled or refunded.

### J. Advanced Customer Segments
- **Dynamic Rule Engine**: Evaluates customers against multi-condition filters (total spent, order count, AOV, days since last order, days since first order, refund count).
- **Cohort Membership**: Calculates dynamic segment size without duplicating database records.

---

## 6. Storefront Merchandising & Search (Domains K, L, M)

### K. Search & Merchandising
- **Merchandising Rules**: Merchant controls for specific queries via `search_merchandising_rules`:
  - `pinProductIds`: Placed strictly at the top of results.
  - `boostProductIds`: Receives artificial ranking weight boosts.
  - `excludeProductIds`: Stripped from search results.
- **Explainable Ranking**: Ranking score = base relevance + boost + pinning. Strictly scoped to current store.

### L. Product Recommendations
- **Deterministic Rules**: `RELATED` (same category/collection), `FREQUENTLY_BOUGHT_TOGETHER` (historical order co-occurrence), `CROSS_SELL` (configured PDP/Cart/Checkout add-ons).
- **Visibility Invariants**: Excludes unpublished, draft, out-of-stock, or cross-tenant products.

### M. Product Bundles & Kits
- **Inventory Constraint**: Bundle availability is constrained by the minimum available component sets:
  $$\text{Available Bundles} = \min_{i} \left( \left\lfloor \frac{\text{available}_i}{\text{required\_qty}_i} \right\rfloor \right)$$
- **Pricing Modes**: Supports `FIXED` bundle pricing or `COMPONENT_DERIVED` dynamic sums.
- **Order Snapshots**: Embeds component breakdown into order line snapshots to guarantee accurate multi-item fulfillment.

---

## 7. Multi-Location Inventory & Operations (Domains N, O, P)

### N. Locations & Warehouses
- `locations` table supports warehouses, retail storefronts, and fulfillment centers with explicit `fulfillmentEnabled` and `pickupEnabled` toggles.

### O. Stock Transfers
- **Lifecycle**: `DRAFT` $\to$ `REQUESTED` $\to$ `IN_TRANSIT` $\to$ `RECEIVED` $\to$ `CANCELLED`.
- **Atomic Movement**: Shipping deducts stock from source location and writes `TRANSFER_OUT` in `inventory_movements`. Receiving increments destination location stock and writes `TRANSFER_IN`.

### P. Purchase Orders (Merchant Purchasing)
- **Supplier Purchasing**: Separate from dropshipping/Meesho; tracks merchant inventory purchases with line items, quantities, and unit costs.
- **Receiving Workflow**: Receiving PO lines directly increments physical stock at destination warehouse and records `PURCHASE_RECEIPT` in the immutable inventory ledger.

---

## 8. Risk Engine & Audit Center (Domains Q, R, S)

### Q. Fraud & Risk Engine
- **Deterministic Signals**: Evaluates factual signals without black-box ML:
  - High order value (> ₹50,000)
  - Order velocity (> 3 orders in 1 hour)
  - High-value COD (> ₹15,000 on COD)
- **Explainable Scores**: Maps numerical score to `LOW` (Allow), `MEDIUM` (Review), `HIGH` (Hold), `BLOCKED` (Block).
- **Decoupled Operation**: Evaluates post-payment state without interfering with gateway payment verification.

### R. Audit Center
- **Immutable Log**: `audit_logs` records all critical business events across products, orders, refunds, inventory, transfers, automations, loyalty, store credit, and staff changes.
- **Merchant UI**: Accessible at `/dashboard/settings/audit` with filterable timeline view.

### S. Centralized Entitlements & Subscription Foundation
- **Entitlement Service**: `getStoreEntitlements` and `hasFeatureEntitlement` centralize feature access based on store plan tier (`STARTER`, `GROWTH`, `PRO`, `ENTERPRISE`), eliminating scattered inline plan checks.

---

## 9. Verification & Regression Results

```
==================================================
PHASE 15 VERIFICATION STATUS
==================================================
✓ Tests:                 388 / 388 passed (53 test files)
  - Unit Phase 15 Tests: 26 / 26 passed (7 test files)
  - Regression Tests:    Phases 0–14 all passing
✓ Typecheck:             0 errors (tsc --noEmit)
✓ ESLint:                0 errors (eslint --quiet "src" "tests")
✓ PostgreSQL Migration:  0012_good_the_anarchist.sql applied to Supabase
✓ Next.js Build:         Compiled successfully (all static + dynamic routes)
✓ Documentation:         docs/PHASE-15-IMPLEMENTATION.md created
==================================================
```

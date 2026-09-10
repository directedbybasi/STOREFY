# STOREFY — Phase 7: Inventory & Customers Implementation

## Overview

Phase 7 implements the production-grade Inventory and Customer Management engines for STOREFY:
- **Inventory Ledger**: An append-only, auditable movement ledger tracking all stock changes with strict concurrency controls (`FOR UPDATE` row-level locks).
- **Stock Math**: Canonical relationships (`available = on_hand - reserved`).
- **Reservation Architecture**: Complete server-side APIs for reservation, release, and consumption ready for Phase 8/9 checkout integration.
- **Low-Stock Alerts**: Out-of-stock and low-stock warning thresholds evaluated server-side per variant.
- **Customer CRM**: Store-scoped customer profiles, multi-address book, canonical customer segmentation (`NEW`, `RETURNING`, `HIGH_VALUE`, `INACTIVE`), and lifetime spend calculations in integer Paise.
- **Multi-Tenant Security**: Tenant isolation enforced across Drizzle queries, RBAC (`inventory:read`, `inventory:write`, `inventory:adjust`, `customers:read`, `customers:write`, `customers:delete`), and PostgreSQL Row-Level Security (RLS) policies.

---

## 1. Inventory Architecture & Data Model

### 1.1 Tables (`src/database/schema/inventory.ts`)

#### `inventory`
Represents the current inventory state for a specific variant at a location:
- `id`: UUID (Primary Key)
- `store_id`: UUID (Foreign Key -> `stores.id`, CASCADE)
- `product_id`: UUID (Foreign Key -> `products.id`, CASCADE)
- `variant_id`: UUID (Foreign Key -> `product_variants.id`, CASCADE)
- `location_id`: UUID (Default warehouse UUID)
- `on_hand`: Integer (Physical stock count)
- `reserved`: Integer (Committed stock for active checkouts)
- `available`: Integer (Calculated: `on_hand - reserved`)
- `incoming`: Integer (Pending purchase orders / restocks)
- `low_stock_threshold`: Integer (Default: 5)
- `updated_at`: Timestamp with timezone
- **Constraints & Indexes**:
  - Unique Index: `(store_id, variant_id, location_id)`
  - Indexes on `store_id`, `product_id`, `variant_id`, and `(store_id, available)`

#### `inventory_movements`
Append-only immutable movement ledger:
- `id`: UUID (Primary Key)
- `store_id`: UUID (Foreign Key -> `stores.id`, CASCADE)
- `product_id`: UUID (Foreign Key -> `products.id`, CASCADE)
- `variant_id`: UUID (Foreign Key -> `product_variants.id`, CASCADE)
- `quantity_delta`: Integer (Change in stock; + for additions, - for reductions)
- `quantity_before`: Integer (Stock balance before mutation)
- `quantity_after`: Integer (Stock balance after mutation)
- `reason`: Varchar(50) (Canonical reasons: `INITIAL_STOCK`, `SALE`, `RESERVATION`, `RELEASE`, `ADJUSTMENT`, `RETURN`, `RESTOCK`, `DAMAGE`, `TRANSFER`, `OTHER`)
- `reference_id`: Varchar(100) (e.g. PO number, checkout session ID, order ID)
- `reference_type`: Varchar(50) (e.g. `MANUAL_ADJUSTMENT`, `CHECKOUT`, `ORDER_FULFILLMENT`, `BULK_ADJUSTMENT`)
- `created_by`: UUID (Foreign Key -> `users.id`)
- `created_at`: Timestamp with timezone (Immutable audit timestamp)

---

## 2. Inventory Calculations & Concurrency Protection

### 2.1 Canonical Stock Relationship
$$\text{available} = \text{on\_hand} - \text{reserved}$$

- Calculated strictly server-side.
- Browsers cannot pass or manipulate calculated values.
- Invariant: $\text{on\_hand} \ge 0$, and stock reductions cannot reduce $\text{on\_hand} < \text{reserved}$.

### 2.2 Concurrency & Transactional Row Locks
Every stock mutation executes inside a PostgreSQL database transaction (`db.transaction`) with an explicit row-level lock:
```sql
SELECT * FROM inventory
WHERE store_id = $store_id AND variant_id = $variant_id
FOR UPDATE;
```
This guarantees race-condition immunity, preventing overselling or conflicting parallel adjustments.

### 2.3 Reservation Architecture (Phase 8/9 Integration Ready)
- `reserveInventoryAction`: Checks `available >= quantity`. Increases `reserved` by $Q$, decreases `available` by $Q$. Inserts `RESERVATION` movement record.
- `releaseReservationAction`: Decreases `reserved` by $Q$, increases `available` by $Q$. Inserts `RELEASE` movement record.
- `consumeReservationAction`: Order confirmed/fulfilled. Decreases `on_hand` by $Q$ and decreases `reserved` by $Q$. Available remains `on_hand - reserved`. Inserts `SALE` movement record.

---

## 3. Customer CRM Architecture & Data Model

### 3.1 Tables (`src/database/schema/customers.ts`)

#### `customers`
Store-scoped customer profile:
- `id`: UUID (Primary Key)
- `store_id`: UUID (Foreign Key -> `stores.id`, CASCADE)
- `first_name`: Varchar(100)
- `last_name`: Varchar(100)
- `email`: Varchar(255)
- `phone`: Varchar(32)
- `status`: Varchar(50) (`ACTIVE`, `INACTIVE`, `ARCHIVED`)
- `notes`: Text (Merchant internal notes)
- `total_spent`: BigInt in integer Paise (`mode: "number"`)
- `orders_count`: Integer
- `last_order_at`: Timestamp with timezone
- `created_at`, `updated_at`: Timestamps with timezone
- Unique constraint on `(store_id, email)`.

#### `customer_addresses`
Store-scoped customer address book:
- `id`: UUID (Primary Key)
- `store_id`: UUID (Foreign Key -> `stores.id`, CASCADE)
- `customer_id`: UUID (Foreign Key -> `customers.id`, CASCADE)
- `name`: Varchar(255)
- `phone`: Varchar(32)
- `address_line1`: Text
- `address_line2`: Text
- `city`, `state`, `postal_code`, `country`: Varchar
- `is_default`: Boolean (Single default per customer enforced via transactions)
- `type`: Varchar(20) (`SHIPPING`, `BILLING`)

---

## 4. Canonical Customer Segmentation & Financial Metrics

### 4.1 Segmentation Rules
Segments are pure, deterministic derivations based on real customer records:
1. `HIGH_VALUE`:
   - $\text{total\_spent} \ge 1,000,000\text{ Paise}$ (₹10,000.00) OR $\text{orders\_count} \ge 5$.
2. `INACTIVE`:
   - Last order $> 90$ days ago, OR account created $> 30$ days ago with $0$ orders.
3. `RETURNING`:
   - $\text{orders\_count} > 1$.
4. `NEW`:
   - $\text{orders\_count} \le 1$ and account created within the last $30$ days.

### 4.2 Monetary Storage & Precision
All monetary calculations use integer Paise to prevent IEEE-754 floating-point inaccuracies:
$$\text{Rupees} = \frac{\text{Paise}}{100}$$
$$\text{Average Order Value} = \begin{cases} \lfloor \frac{\text{total\_spent}}{\text{orders\_count}} \rfloor, & \text{orders\_count} > 0 \\ 0, & \text{orders\_count} = 0 \end{cases}$$

---

## 5. Security, RBAC & Row-Level Security (RLS)

### 5.1 RBAC Permissions
- `inventory:read`: Staff can view stock balances, detail pages, and movement history.
- `inventory:write` / `inventory:adjust`: Staff can perform stock adjustments, bulk changes, threshold edits, and reservations.
- `customers:read`: Staff can view customer profiles, metrics, and address book.
- `customers:write`: Staff can create, update, and manage customer profiles and addresses.
- `customers:delete`: Staff can archive customer profiles.

### 5.2 RLS Policies
Hosted Supabase PostgreSQL enforces database-level tenant isolation:
- `tenant_isolation_inventory`: Authenticated staff can only access inventory rows belonging to their assigned store or platform admin.
- `tenant_isolation_inventory_movements`: Authenticated staff can only access movement ledger records for their active store.
- `tenant_isolation_customers`: Customer CRM data is strictly tenant-isolated. Public anonymous access is disabled.
- `tenant_isolation_customer_addresses`: Customer address book is strictly tenant-isolated. Public anonymous access is disabled.
- `public_read_active_inventory`: Anon public storefront can only view stock availability for active variants with `available > 0`.

---

## 6. Verification & Test Results

### Test Suite Execution
- **Unit Tests**: `tests/unit/inventory-ledger.test.ts` (10 tests)
- **CRM & Segmentation Tests**: `tests/unit/customer-crm.test.ts` (9 tests)
- **Cross-Tenant Security Tests**: `tests/unit/inventory-customer-cross-tenant.test.ts` (7 tests)
- **Total Test Suite**: 29 test files, 212 tests, 100% passing.
- **Typecheck**: `npm run typecheck` (0 errors).
- **Database Migrations**: `0005_serious_random.sql` applied cleanly to hosted Supabase PostgreSQL.
- **Database Connection**: Hosted Supabase verified active (1254ms latency).

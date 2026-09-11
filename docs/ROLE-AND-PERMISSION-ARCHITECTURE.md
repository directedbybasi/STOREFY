# STOREFY — Role and Permission Architecture Specification

**Version:** 2.0  
**Status:** Canonical & Enforced  
**Last Updated:** 2026-09-11  

---

## 1. Executive Summary: The Two-Tier Account Model

STOREFY strictly defines **only two top-level account domains**:

```
                    STOREFY PLATFORM
                           │
             ┌─────────────┴─────────────┐
             │                           │
      PLATFORM ADMIN                  MERCHANT
    (Platform Operations)                │
                               ┌─────────┴─────────┐
                               │                   │
                        STANDARD MERCHANT       SUPPLIER
                                                   │
                                        SAME MERCHANT RBAC
                                                   │
                                      OWNER / ADMIN / MANAGER /
                                      STAFF / EDITOR / VIEWER
```

> [!IMPORTANT]
> **Supplier is NOT a role and NOT a separate top-level account.**  
> Supplier is a **Merchant Account Capability/Type**. A Supplier is a merchant organization configured with the Supplier capability, utilizing the **exact same merchant staff RBAC** (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`, `EDITOR`, `VIEWER`).

---

## 2. Platform Admin Architecture

### 2.1 Scope & Purpose
Platform Admin is dedicated to STOREFY's internal administration and operating entity. It controls the STOREFY platform infrastructure, tenant verification, and compliance.

### 2.2 Responsibilities
- Merchant and organization oversight
- Storefront lifecycle and platform domain routing
- Supplier verification and compliance audit queue (Approve, Reject, Suspend)
- Platform user directory and access management
- Platform-wide security audit and event tracking
- System policies and developer platform settings

### 2.3 Security Invariants
1. **Server-Side Authoritative Verification:** Platform Admin access is governed strictly by `users.is_platform_admin = true`. It is verified server-side via `await requirePlatformAdmin()`.
2. **Zero Client Trust:** Browser inputs, headers (`admin=true`, `role=admin`), or client tokens are completely discarded.
3. **Decoupled Route Space:** Platform Admin operations are strictly isolated under `/admin`.
4. **No Self-Promotion:** Merchant profile updates and registration endpoints sanitize and reject any attempt to modify `isPlatformAdmin`.

---

## 3. Merchant Architecture

### 3.1 Account Hierarchy
The merchant account model follows the established multi-tenant structure:
```
USER ACCOUNT (Credentials & Identity)
    └── ORGANIZATION (Legal Business Entity / Billing / Tenant Root)
            └── STORES (Multi-Storefronts, Subdomains, Custom Domains)
                    └── STAFF MEMBERSHIPS (Scoped RBAC Role Assignment)
```

### 3.2 Merchant Types / Capabilities
Each merchant organization operates in one of two business modes:
- **`STANDARD`**: Standard e-commerce merchant (Direct-to-consumer catalog, inventory, orders, marketing, checkout).
- **`SUPPLIER`**: Catalog provider and fulfillment partner in the B2B Dropshipping & Reselling Network.

---

## 4. Merchant Staff RBAC Roles

All merchants—whether Standard or Supplier—use the canonical merchant RBAC roles:

| Role | Hierarchy Level | Primary Scope & Responsibilities |
| :--- | :---: | :--- |
| **`OWNER`** | 1 (Org-Wide) | Full legal, administrative, financial, and billing authority across all stores. Possesses all permissions (`*`). |
| **`ADMIN`** | 2 | Store administrator managing catalog, orders, settings, domain mapping, and staff memberships. |
| **`MANAGER`** | 3 | Operational supervisor managing day-to-day catalog, inventory stock adjustments, and order fulfillment. |
| **`STAFF`** | 4 | Operational fulfillment specialist handling picking, packing, shipping, and order status transitions. |
| **`EDITOR`** | 5 | Catalog specialist managing product listings, descriptions, collections, and visual builder layouts. |
| **`VIEWER`** | 6 | Read-only auditor or customer support staff with view access to orders and catalog without mutation rights. |

---

## 5. Supplier Capability Model

### 5.1 Capability vs Role Distinction
- **Role:** *Who you are and what authority you hold* (`OWNER`, `MANAGER`, `VIEWER`).
- **Capability:** *What business mode your merchant organization supports* (`SUPPLIER`).

### 5.2 Authorization Formula
All supplier actions are authorized according to the zero-trust formula:
$$\text{ACTUAL ACCESS} = \text{MERCHANT ROLE} + \text{ACCOUNT CAPABILITY} + \text{STORE SCOPE}$$

#### Examples:
1. **`OWNER` + `SUPPLIER` Capability:**
   Full supplier management: catalog publishing, variant inventory, order fulfillment, payout settings, and verification management.
2. **`MANAGER` + `SUPPLIER` Capability:**
   Supplier operational functions: update supplier catalog, adjust supplier stock, accept/fulfill incoming reseller orders. Cannot access payout account settings or verification reviews.
3. **`VIEWER` + `SUPPLIER` Capability:**
   Read-only supplier visibility: view supplier products, view fulfillment orders. Zero mutation rights.
4. **`OWNER` without `SUPPLIER` Capability (Standard Merchant):**
   Full standard store management. **Zero access** to supplier portal, supplier endpoints, or supplier fulfillment APIs (`HTTP 403 Forbidden`).

---

## 6. Supplier Permissions Matrix

Supplier-specific module permissions extend the merchant permission catalog:

| Permission Code | Module | Action | Description | Allowed Roles (When Supplier Enabled) |
| :--- | :--- | :--- | :--- | :--- |
| `supplier:read` | `supplier` | `read` | View supplier profile and analytics | `OWNER`, `ADMIN`, `MANAGER`, `STAFF`, `EDITOR`, `VIEWER` |
| `supplier:write` | `supplier` | `write` | Update supplier profile and business address | `OWNER`, `ADMIN` |
| `supplier:products` | `supplier` | `write` | Create and edit supplier catalog products | `OWNER`, `ADMIN`, `MANAGER`, `EDITOR` |
| `supplier:inventory`| `supplier` | `write` | Update supplier variant stock levels | `OWNER`, `ADMIN`, `MANAGER`, `EDITOR`, `STAFF` |
| `supplier:orders` | `supplier` | `read` | View orders routed to supplier for fulfillment | `OWNER`, `ADMIN`, `MANAGER`, `STAFF`, `VIEWER` |
| `supplier:fulfill` | `supplier` | `fulfill` | Accept/reject orders, generate labels, dispatch | `OWNER`, `ADMIN`, `MANAGER`, `STAFF` |
| `supplier:finance` | `supplier` | `finance` | View settlement ledgers, earnings, bank accounts | `OWNER`, `ADMIN` |
| `supplier:verify` | `supplier` | `verify` | Platform-level verification decision (Internal) | `PLATFORM_ADMIN` only |

---

## 7. Customer & B2B Authorization Boundaries

STOREFY strictly maintains distinct authorization domains outside of merchant staff RBAC:

### 7.1 Storefront Customers (`CUSTOMER`)
- Consumers purchasing on merchant storefronts.
- Bound to customer accounts table. Never assigned merchant staff roles or organization memberships.

### 7.2 B2B Customer Companies
Customer organization roles for wholesale purchasing:
- **`COMPANY_ADMIN`**: Manages B2B company account, locations, staff buyers, and payment terms.
- **`APPROVER`**: Reviews and approves order requisitions exceeding buyer order limits.
- **`BUYER`**: Places wholesale purchasing orders against custom B2B price lists.

> B2B roles are **customer-side** business roles and never grant access to the merchant administration dashboard.

---

## 8. Developer API & OAuth Authorization

Developer integrations do not use interactive staff sessions:
- Authenticated via cryptographic API keys (`sk_live_...`) or OAuth 2.0 Bearer tokens.
- Scoped to explicit permission grants (`products:read`, `orders:write`).
- Strictly isolated to the issuing merchant organization and store.

---

## 9. Server Authorization Guards Reference

All server-side code must use canonical authorization guards from `@/core/tenant/rbac`:

```typescript
// 1. Guard Platform Administration
const adminAccount = await requirePlatformAdmin();

// 2. Guard Merchant Operations
const merchantCtx = await requireMerchantPermission("catalog:write");

// 3. Guard Supplier Capability
const supplierCtx = await requireSupplierCapability();

// 4. Combined Supplier Action Authorization
const authorizedCtx = await authorizeSupplierAction("supplier:fulfill");
```

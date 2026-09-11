# STOREFY — Information Architecture

> **Architecture Target**: A unified, predictable hierarchy for the world-class professional Commerce OS.

---

## 1. Top-Level Account Hierarchy

STOREFY operates on a strict **Two-Tier Account Model**:

```
STOREFY
│
├── 1. PLATFORM ADMIN (/admin)
│   └── Internal operations, tenant oversight, supplier verification, audit
│
└── 2. MERCHANT (/dashboard)
    │
    ├── Standard Merchant Store
    │
    └── Supplier Merchant Capability
        └── Uses the SAME Merchant RBAC (OWNER, ADMIN, MANAGER, STAFF, VIEWER)
```

There is **NO** third top-level portal for suppliers. Supplier is an enabled capability within the merchant account.

---

## 2. Merchant Dashboard Architecture (`/dashboard`)

The merchant shell consists of 8 logical operational clusters:

| Cluster | Section | Route | Responsibilities |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | Dashboard Home | `/dashboard` | Gross revenue, order volume, catalog counts, store launch checklist |
| **COMMERCE** | Orders | `/dashboard/orders` | Order processing, payment states, fulfillment tracking |
| | Products | `/dashboard/products` | Catalog management, variant pricing, media uploads, AI assist |
| | Inventory | `/dashboard/inventory` | Multi-location stock on-hand, reserved units, low-stock warnings |
| | Customers | `/dashboard/customers` | CRM records, order frequency, total spend, customer segments |
| **GROWTH** | Marketing | `/dashboard/marketing` | Overview of promotions, WhatsApp click-to-chat, social proof |
| | Coupons | `/dashboard/marketing/coupons`| Promo codes, fixed/percentage discounts, usage caps |
| | Reviews | `/dashboard/reviews` | Verified buyer feedback, ratings moderation, approvals |
| | Analytics | `/dashboard/analytics` | Financial sales KPIs, conversion funnels, UTM attribution |
| **CHANNELS** | Online Store | `/dashboard/online-store` | Themes, customizer, navigation menus, domain mapping |
| | POS | `/dashboard/pos` | Counter checkout terminal, barcode search, cash tender |
| | B2B | `/dashboard/b2b` | Wholesale companies, custom price schedules, PO approvals |
| | Supplier | `/dashboard/supplier` | Warehouse catalog, fulfillment tasks, settlement earnings |
| | Meesho | `/dashboard/meesho` | Marketplace scraping & catalog import, margin markup rules |
| **CONTENT** | CMS & Blog | `/dashboard/content` | Custom storefront landing pages, policy documents, blog articles |
| **TOOLS** | AI Intelligence | `/dashboard/ai` | Generation quotas, token monitoring, tool telemetry |
| | Notifications | `/dashboard/notifications` | Merchant alerts, inventory triggers, order notifications |
| **DEVELOPER** | Developer | `/dashboard/settings/developer` | Scoped API keys, HMAC webhook endpoints, OAuth applications |
| **SETTINGS** | General & Store | `/dashboard/settings` | Store identity, currency, timezone, prefixes |
| | Payments | `/dashboard/settings/payments` | Payment gateways, COD rules, fee thresholds |
| | Shipping | `/dashboard/settings/shipping` | Delivery zones, shipping rates, carrier setups |
| | Domains | `/dashboard/settings/domains` | Custom domains, DNS verification, SSL status |
| | Staff & Roles | `/dashboard/settings/staff` | Team invites, RBAC permission assignment |

---

## 3. Platform Admin Architecture (`/admin`)

The internal administration shell provides global operational controls:

| Section | Route | Purpose |
| :--- | :--- | :--- |
| **Overview** | `/admin` | Tenant count, active stores, supplier queue, telemetry |
| **Merchants** | `/admin/merchants` | Organization management, tier upgrades, suspension |
| **Stores** | `/admin/stores` | Store discovery, domain mapping overrides, status controls |
| **Suppliers** | `/admin/suppliers` | Verification review queue, KYC documents, approval actions |
| **Support** | `/admin/support` | Merchant ticket escalation and operational assistance |
| **Billing** | `/admin/billing` | Subscription plans, billing dispute management |
| **Risk & Fraud** | `/admin/risk` | Order risk evaluation, chargeback prevention, fraud alerts |
| **Audit History** | `/admin/audit` | Immutable event stream of platform-level administrative changes |
| **System Settings** | `/admin/settings` | Global feature flags, cluster configurations, maintenance toggles |

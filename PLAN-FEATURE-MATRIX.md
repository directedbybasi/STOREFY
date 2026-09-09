# STOREFY — Plan & Feature Matrix Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Pricing Engine:** Monthly Subscription via Payment Provider Gateway (Razorpay/Cashfree)

---

## 1. Business Model & Financial Invariants

STOREFY's revenue model is strictly based on SaaS software subscriptions.

1. **No Platform Transaction Fees:** STOREFY takes **0%** commission on merchant orders or sales volume.
2. **No Shipping Commissions:** STOREFY charges no markup on carrier rates or shipping labels.
3. **No Inventory Ownership / Margin:** STOREFY never owns product inventory or takes product margins.
4. **No Free Plan:** Every merchant organization must have an active paid subscription (or active launch promotional month) to operate a public storefront and access dashboard tools.

### Subscription Pricing Structure

| Tier         | Standard Monthly Fee | Launch Promotional Offer (Month 1) | Billing Cadence   | Target Merchant Profile                                                                   |
| :----------- | :------------------- | :--------------------------------- | :---------------- | :---------------------------------------------------------------------------------------- |
| **STARTER**  | **₹199 / month**     | **₹50 for the first month**        | Monthly Recurring | Solo entrepreneurs, new D2C brands, boutique artisans, and beginning resellers.           |
| **BUSINESS** | **₹599 / month**     | **₹50 for the first month**        | Monthly Recurring | Established brands, high-volume dropshippers, multi-staff commerce teams, scaling stores. |

---

## 2. Comprehensive Feature Entitlement Matrix

The following matrix maps every platform capability to plan tiers:

| Domain / Feature Category   | Feature Capability                       | STARTER (₹199/mo)          | BUSINESS (₹599/mo)                    | Enforcement Mechanism                   |
| :-------------------------- | :--------------------------------------- | :------------------------- | :------------------------------------ | :-------------------------------------- |
| **Platform Fees**           | Transaction Fee on Sales                 | **0%**                     | **0%**                                | Hard architectural rule                 |
| **Storefront & Domains**    | Built-in Subdomain (`*.storefy.shop`)    | Included (1 Store)         | Included (1 Store)                    | Automatic at creation                   |
|                             | Custom Domain Connections (`brand.com`)  | **1 Domain**               | **Up to 5 Domains**                   | Plan Limit (`max_custom_domains`)       |
|                             | Automatic SSL Provisioning               | Included                   | Included                              | Cloudflare SaaS edge hook               |
| **Catalog & Products**      | Active Product Listings                  | **Up to 250 Products**     | **Unlimited Products**                | Plan Limit (`max_products`)             |
|                             | Product Variants per Product             | Up to 25 Variants          | Unlimited Variants                    | Plan Limit (`max_variants_per_product`) |
|                             | Digital / Physical Products              | Both Included              | Both Included                         | Feature Flag                            |
|                             | Unlimited Categories & Collections       | Included                   | Included                              | Unrestricted                            |
|                             | Bulk Product Import / Export (CSV)       | Basic CSV                  | Advanced CSV + JSON                   | Feature Flag                            |
| **Storefront Builder**      | Visual Drag-and-Drop Builder             | Full Access                | Full Access                           | Core Module                             |
|                             | Pre-Built Theme Templates                | Standard Templates (10)    | All Premium Templates (25+)           | Template Tier Filter                    |
|                             | Custom CSS / Advanced Styling            | Included                   | Included                              | Theme Settings Engine                   |
|                             | Section Library & Layout Blocks          | Full Access                | Full Access                           | Builder Section Registry                |
|                             | Dynamic Data Bindings                    | Standard Bindings          | Advanced Dynamic Bindings             | AST Resolver Filter                     |
|                             | Version History & Rollback               | Last 5 Versions            | Unlimited Version History             | Plan Limit (`theme_history_depth`)      |
| **Commerce & Checkout**     | Responsive One-Page Checkout             | Included                   | Included                              | Checkout Engine                         |
|                             | Guest Checkout & Customer Accounts       | Included                   | Included                              | Auth & Customer Modules                 |
|                             | Cash on Delivery (COD) Support           | Included                   | Included                              | Payment Module Setting                  |
|                             | Custom Merchant Payment Gateways         | 1 Connected Gateway        | Multiple Active Gateways              | Plan Limit (`max_payment_gateways`)     |
|                             | Automated GST Tax Invoices (PDF)         | Included                   | Included                              | Invoicing Service                       |
| **Inventory & Fulfillment** | Real-Time Stock Tracking                 | Included                   | Included                              | Inventory Ledger                        |
|                             | Low Stock Automated Alerts               | Included                   | Included                              | Notification Engine                     |
|                             | Multi-Location Inventory                 | 1 Location                 | Up to 5 Locations                     | Plan Limit (`max_inventory_locations`)  |
|                             | Shipping Carrier Integrations            | Manual + 1 Carrier         | All Integrated Carriers               | Plan Limit (`carrier_integrations`)     |
| **Platform Dropshipping**   | Access to Platform Supplier Catalog      | Included                   | Included                              | Feature Flag                            |
|                             | Supplier Product One-Click Import        | Included (up to 50)        | Unlimited Imports                     | Plan Limit (`max_dropship_imports`)     |
|                             | Automated Supplier Order Routing         | Included                   | Included                              | Order Routing Engine                    |
|                             | Supplier Masking / Neutral Packaging     | Included                   | Included                              | Shipping Label Engine                   |
| **Meesho Reselling**        | Meesho Product URL / Code Importer       | Included (up to 50)        | Unlimited Imports                     | Plan Limit (`max_meesho_imports`)       |
|                             | Product Schema Normalizer                | Included                   | Included                              | Normalization Engine                    |
|                             | Interactive Profit Calculator            | Included                   | Included                              | Pricing Engine                          |
|                             | Order Mirroring & Fulfillment Tracker    | Manual Linking             | Bulk Order Dispatch Sheet             | Feature Flag                            |
| **AI Product Intelligence** | 7 Dedicated AI Generation Tools          | **50 Generations / month** | **500 Generations / month**           | Plan Quota (`ai_monthly_generations`)   |
|                             | AI Generation History & Audit            | 30 Days                    | Unlimited History                     | Retention Policy                        |
| **Marketing & Growth**      | Coupon & Discount Engine                 | Basic (Percentage / Flat)  | Advanced (BOGO, Tiers, Auto)          | Feature Flag                            |
|                             | Product Ratings & Reviews Engine         | Included (Manual Mod)      | Included (Auto-Approval rules)        | Feature Flag                            |
|                             | Click-to-Chat WhatsApp (Order & Support) | Included                   | Included                              | Store Settings                          |
|                             | Advanced SEO & Schema Markup             | Standard Meta Tags         | Rich Snippets & Microdata             | SEO Renderer                            |
| **Analytics & Reporting**   | Dashboard Real-Time Overview             | Standard (Last 30 Days)    | Advanced (Custom Ranges, AOV, Funnel) | Analytics Aggregation Filter            |
|                             | Conversion Funnel Analytics              | Basic                      | Full Step-by-Step Funnel              | Feature Flag                            |
|                             | Exportable Sales & Tax Reports           | Monthly Summary            | Granular Transaction Logs             | Feature Flag                            |
| **Staff & Organization**    | Staff / Sub-Accounts                     | **2 Staff Accounts**       | **10 Staff Accounts**                 | Plan Limit (`max_staff_members`)        |
|                             | Role-Based Access Control (RBAC)         | Predefined Roles           | Custom Granular Roles                 | Feature Flag                            |
| **Media & Storage**         | Media Library Storage Limit              | **2 GB Storage**           | **20 GB Storage**                     | Plan Limit (`storage_bytes_limit`)      |
|                             | Max Single File Upload Size              | 10 MB                      | 50 MB                                 | Presigned Upload Guard                  |
| **Support & SLA**           | Customer Support SLA                     | Standard Email Support     | Priority WhatsApp & Email             | CRM Routing Tag                         |

---

## 3. Quota Enforcement Architecture

Plan features and limits are verified using a centralized, non-duplicative entitlement service. Plan limits are **never hardcoded** into individual business modules.

### 3.1 Centralized Service Layer (`src/modules/billing/entitlements.ts`)

```typescript
// Entitlement Verification Functions
export async function assertPlanFeature(storeId: string, featureKey: string): Promise<void> {
  const isEnabled = await getStoreFeatureState(storeId, featureKey);
  if (!isEnabled) {
    throw new PlanEntitlementError(
      `Feature "${featureKey}" is not available on your current plan. Please upgrade to BUSINESS.`
    );
  }
}

export async function checkPlanQuota(
  storeId: string,
  quotaKey: "max_products" | "max_staff_members" | "ai_monthly_generations" | "storage_bytes_limit",
  requestedIncrement: number = 1
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { currentUsage, limit } = await getQuotaMetrics(storeId, quotaKey);

  if (limit !== -1 && currentUsage + requestedIncrement > limit) {
    return { allowed: false, current: currentUsage, limit };
  }

  return { allowed: true, current: currentUsage, limit };
}
```

### 3.2 Database Plan Configuration Records (Seed State)

```sql
-- Seed Core Plans
INSERT INTO subscription_plans (id, name, monthly_price, launch_month_price, is_active)
VALUES
  ('STARTER', 'Starter Plan', 19900, 5000, true),
  ('BUSINESS', 'Business Plan', 59900, 5000, true);

-- Seed Plan Feature Limits
INSERT INTO plan_feature_limits (plan_id, limit_key, limit_value)
VALUES
  -- Starter Limits
  ('STARTER', 'max_products', 250),
  ('STARTER', 'max_custom_domains', 1),
  ('STARTER', 'max_staff_members', 2),
  ('STARTER', 'ai_monthly_generations', 50),
  ('STARTER', 'storage_bytes_limit', 2147483648), -- 2 GB
  ('STARTER', 'theme_history_depth', 5),

  -- Business Limits (-1 represents unlimited)
  ('BUSINESS', 'max_products', -1),
  ('BUSINESS', 'max_custom_domains', 5),
  ('BUSINESS', 'max_staff_members', 10),
  ('BUSINESS', 'ai_monthly_generations', 500),
  ('BUSINESS', 'storage_bytes_limit', 21474836480), -- 20 GB
  ('BUSINESS', 'theme_history_depth', -1);
```

---

## 4. Lifecycle State Machine for Subscriptions

```
                       [Merchant Selects Plan]
                                  |
                                  v
                       +----------------------+
                       |       TRIALING       | (First month @ ₹50 promotional rate)
                       +----------------------+
                                  |
                   (Successful Renewal @ Standard Rate)
                                  v
                       +----------------------+
                       |        ACTIVE        | <-------------------+
                       +----------------------+                     |
                                  |                                 |
                        (Payment Failed Event)            (Payment Recovered)
                                  v                                 |
                       +----------------------+                     |
                       |       PAST_DUE       | --------------------+
                       +----------------------+
                                  |
                    (Grace Period 7 Days Expired)
                                  v
                       +----------------------+
                       |      CANCELLED       |
                       +----------------------+
                                  |
              (Storefront Suspended, Dashboard Read-Only)
```

### Suspension Behavior

- If an organization subscription transitions to `CANCELLED` or `UNPAID`:
  - The public storefront displays a clean, branded "Store Under Maintenance" notice.
  - Customer checkout is disabled to protect consumers.
  - Merchant dashboard is placed into Read-Only mode with a prominent banner directing the owner to update payment details or reactivate subscription.
  - **Data is never destroyed:** Merchant products, orders, themes, and customer lists remain intact.

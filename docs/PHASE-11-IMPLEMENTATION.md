# PHASE 11 — Marketing, Reviews, SEO, WhatsApp & Analytics Foundation Implementation

## Executive Overview

Phase 11 delivers STOREFY's **Growth, Conversion & Visibility Subsystems**, covering promotional coupon mechanics, verified customer reviews & moderation, dynamic SEO & structured data generation, WhatsApp click-to-chat engagement, and privacy-first analytics aggregation.

All monetary discounts and financial reporting strictly adhere to STOREFY's authoritative integer Paise money model (`1 INR = 100 Paise`), and review buyer verification is cryptographically confirmed against historical order fulfillment records.

---

## 1. Architecture & Domain Boundaries

```
                             [ Customer Storefront ]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
     [ Coupon Engine ]          [ Review System ]           [ SEO & Schema ]
             │                          │                          │
    • PERCENTAGE               • 1-5 Star Ratings          • JSON-LD (Product, Org)
    • FIXED_AMOUNT             • Verified Buyer Checks     • Dynamic /sitemap.xml
    • BOGO                     • Moderation Queue          • Dynamic /robots.txt
    • FREE_SHIPPING            • Anti-Tamper Isolation     • Meta Tags & OpenGraph
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                                        ▼
                            [ Analytics Foundation ]
                                        │
                               • Event Ledger (Ingestion)
                               • Session & Funnel Tracking
                               • Server Aggregation & Rollups
                               • Conversion & Margin Metrics
```

---

## 2. Subsystem Implementations

### 2.1 Promotional Coupon Engine (`src/modules/marketing/coupons/`)
- **Schema (`src/database/schema/marketing.ts`)**:
  - `coupons`: Store-scoped coupon configuration (`storeId`, `code`, `type`, `value`, `minSpendAmount`, `maxDiscountAmount`, `usageLimit`, `perCustomerLimit`, `startDate`, `endDate`, `isActive`, `targetType`, `targetIds`, `bogoConfig`).
  - `coupon_usages`: Immutable usage tracking records (`couponId`, `orderId`, `customerId`, `discountAmountPaise`, `usedAt`).
- **Engine Logic (`coupon-engine.ts`)**:
  - Validates discount applicability against cart subtotal, specific product or collection targets, customer eligibility, and validity windows.
  - Caps maximum discount amount where configured.
  - Implements atomic usage counting to prevent race conditions during concurrent checkouts.
- **Server Actions & Dashboard UI**:
  - Management interface at `/dashboard/marketing/coupons` with live status filters, usage limits, and expiration tracking.

### 2.2 Customer Reviews & Moderation (`src/modules/marketing/reviews/`)
- **Schema (`src/database/schema/reviews.ts`)**:
  - `reviews`: Stores customer feedback (`storeId`, `productId`, `customerId`, `orderId`, `rating`, `title`, `comment`, `mediaUrls`, `isVerifiedBuyer`, `status`, `helpfulVotesCount`).
  - `review_votes`: Prevents duplicate voting on review helpfulness.
- **Buyer Verification (`review-service.ts`)**:
  - Automatically queries the `orders` and `order_items` tables to determine if the submitting customer actually purchased and received the product.
  - Sets `isVerifiedBuyer = true` only when an authoritative matching order in `DELIVERED` status exists.
  - Imported third-party marketplace reviews (e.g. from Meesho) are kept in isolated marketplace tables and **never** granted the native verified buyer status.
- **Moderation Workflow**:
  - Merchant dashboard at `/dashboard/reviews` allows approving, rejecting, or flagging reviews as spam.

### 2.3 SEO Engine & Structured Data (`src/modules/marketing/seo/`)
- **JSON-LD Generator (`json-ld.ts`)**:
  - Standard Schema.org schemas: `Product`, `AggregateRating`, `Offer`, `BreadcrumbList`, and `Organization`.
  - Injects canonical microdata into storefront product detail and collection pages for search engine rich snippets.
- **Dynamic Sitemaps & Robots (`sitemap.ts`, `robots.ts`)**:
  - Dynamic route handlers at `/[domain]/sitemap.xml` generating live XML sitemaps including products, collections, and custom pages.
  - Dynamic `/[domain]/robots.txt` directing crawlers to the respective sitemap while disallowing internal checkout and account paths.

### 2.4 WhatsApp Click-to-Chat (`src/modules/marketing/whatsapp/`)
- **Compliant Integration (`click-to-chat.ts`)**:
  - Generates safe `https://wa.me/` URLs pre-populated with store-customized contextual messages (product inquiry, order status inquiry, support).
  - Sanitizes international phone numbers and escapes message payloads.

### 2.5 Analytics Foundation (`src/modules/marketing/analytics/`)
- **Schema (`src/database/schema/analytics.ts`)**:
  - `analytics_events`: Ingestion ledger for high-volume storefront events (`PAGE_VIEW`, `PRODUCT_VIEW`, `COLLECTION_VIEW`, `ADD_TO_CART`, `REMOVE_FROM_CART`, `INITIATE_CHECKOUT`, `PURCHASE`, `SEARCH`).
  - `analytics_daily_aggregates`: Pre-computed rollups by store, date, channel, and device for responsive dashboard reporting.
- **Analytics Service (`analytics-service.ts`)**:
  - Computes total sessions, unique visitors, conversion rate, gross revenue, average order value (AOV), and top-performing products.
  - Dashboard analytics view at `/dashboard/analytics` with interactive metric cards, revenue trends, and funnel breakdown.

---

## 3. Security & Invariant Guarantees

1. **Integer Paise Throughout:** All discount calculations and analytics revenue rollups are computed in integer Paise, preventing floating-point rounding errors.
2. **Tenant Isolation:** All coupons, reviews, and analytics are strictly partitioned by `storeId`. Cross-tenant coupon application or review moderation is rejected.
3. **No Review Verification Spoofing:** Clients cannot self-declare `isVerifiedBuyer`; this flag is strictly server-derived.
4. **Privacy-Preserving Analytics:** No sensitive customer PII or raw payment credentials are stored in analytics events.

---

## 4. Verification & Testing

- Unit tests for coupon calculation logic, expiration checks, usage limits, and BOGO calculations.
- Verified review buyer verification against mock delivered orders.
- Typecheck (`tsc --noEmit`) and ESLint passing cleanly.

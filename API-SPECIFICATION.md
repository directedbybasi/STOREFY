# STOREFY — API Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Protocol:** HTTPS RESTful / JSON / Next.js Server Actions & Route Handlers  
**Base URL Prefix:** `/api/v1`

---

## 1. API Architecture & Conventions

### 1.1 Response Envelope Format

All REST API endpoints adhere to a standardized JSON response envelope:

```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// RFC 7807 Compliant Error Response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // e.g. "INSUFFICIENT_STOCK", "UNAUTHORIZED"
    message: string; // Human-readable summary
    details?: Array<{
      // Field-level validation breakdown
      field: string;
      message: string;
    }>;
    timestamp: string;
    traceId: string;
  };
}
```

### 1.2 Authentication & Authorization Schemes

1. **Public Storefront APIs:** Authenticated via request `Host` header and `x-store-id` tenant resolution header injected by edge middleware. Cart sessions utilize `x-cart-session-token`.
2. **Merchant Dashboard & Admin APIs:** Authenticated via Supabase Auth JWT transmitted in HTTP-only `sb-access-token` cookies or `Authorization: Bearer <JWT>` header. Server verifies role and module-level permissions via RBAC middleware.
3. **Webhook Ingress APIs:** Authenticated via provider-specific cryptographic signatures (`x-razorpay-signature`, `x-cashfree-signature`, `x-shiprocket-hmac`).

---

## 2. Storefront Public APIs (`/api/v1/storefront`)

These endpoints power the customer-facing storefront and are strictly scoped to the resolved tenant.

### 2.1 Theme & Page Rendering

- `GET /api/v1/storefront/theme`
  - **Summary:** Returns active theme configuration, CSS custom property tokens, and navigation tree.
  - **Response:** `{ theme: StoreThemeDto, tokens: CssTokensDto, navigation: NavigationMenuDto[] }`
- `GET /api/v1/storefront/pages/:slug`
  - **Summary:** Resolves page metadata, layout AST, sections, and element trees by slug (e.g., `home`, `about-us`).
  - **Response:** `{ page: PageAstDto }`

### 2.2 Catalog Browsing & Search

- `GET /api/v1/storefront/products`
  - **Query Params:** `category_slug`, `collection_slug`, `search`, `min_price`, `max_price`, `sort` (price_asc, price_desc, created_at, best_selling), `page`, `limit`.
  - **Response:** `{ products: ProductSummaryDto[], meta: PaginationMeta }`
- `GET /api/v1/storefront/products/:slug`
  - **Summary:** Returns detailed product record including variants, images, specifications, review score, and inventory status.
  - **Response:** `{ product: ProductDetailDto }`
- `GET /api/v1/storefront/categories`
  - **Summary:** Returns hierarchical category tree.
  - **Response:** `{ categories: CategoryTreeDto[] }`

### 2.3 Cart Engine

- `GET /api/v1/storefront/cart`
  - **Headers:** `x-cart-session-token`
  - **Response:** `{ cart: CartSummaryDto }`
- `POST /api/v1/storefront/cart/items`
  - **Body:** `{ variant_id: string, quantity: number }`
  - **Logic:** Validates active product and real-time inventory availability before adding.
  - **Response:** `{ cart: CartSummaryDto }`
- `PATCH /api/v1/storefront/cart/items/:id`
  - **Body:** `{ quantity: number }`
  - **Response:** `{ cart: CartSummaryDto }`
- `DELETE /api/v1/storefront/cart/items/:id`
  - **Response:** `{ cart: CartSummaryDto }`
- `POST /api/v1/storefront/cart/apply-coupon`
  - **Body:** `{ code: string }`
  - **Logic:** Evaluates coupon criteria (min order, expiration, limits) and returns calculated discount.
  - **Response:** `{ cart: CartSummaryDto }`

### 2.4 Checkout & Orders

- `POST /api/v1/storefront/checkout/initialize`
  - **Body:** `{ shipping_address: AddressDto, billing_address: AddressDto, email: string, phone: string }`
  - **Logic:** Atomically reserves inventory items for 15 minutes and returns server-calculated order breakdown (subtotal, discounts, shipping, tax, total).
  - **Response:** `{ checkout_token: string, summary: CheckoutSummaryDto }`
- `POST /api/v1/storefront/checkout/complete`
  - **Body:** `{ checkout_token: string, payment_method: "RAZORPAY" | "CASHFREE" | "PAYU" | "COD", payment_response?: object }`
  - **Logic:** Verifies payment signature (if online) or establishes COD order, transitions inventory to committed, writes immutable `orders` record, and clears cart session.
  - **Response:** `{ order_id: string, order_number: string, redirect_url: string }`
- `GET /api/v1/storefront/orders/:order_number/track`
  - **Query Params:** `phone` or `email` (verification check).
  - **Response:** `{ order: OrderTrackingDto, shipments: ShipmentTrackingDto[] }`

### 2.5 Reviews & WhatsApp Click-to-Chat

- `POST /api/v1/storefront/products/:id/reviews`
  - **Body:** `{ author_name: string, rating: number, title?: string, body: string }`
  - **Logic:** Persists review with `is_approved = FALSE` awaiting merchant moderation.
- `GET /api/v1/storefront/whatsapp-link`
  - **Query Params:** `type` ("ORDER" | "SUPPORT"), `product_id?`
  - **Logic:** Generates standard encoded `https://wa.me/{phone}?text={prefilled_message}` URL without server-side messaging bypasses.

---

## 3. Merchant Dashboard APIs (`/api/v1/dashboard`)

All dashboard routes require authentication and verify tenant permissions.

### 3.1 Store Configuration & Domains

- `GET /api/v1/dashboard/stores/current`
  - **Response:** `{ store: StoreDto, settings: StoreSettingsDto }`
- `PATCH /api/v1/dashboard/stores/current`
  - **Body:** Partial `StoreSettingsDto` (WhatsApp numbers, COD limits, currencies, logos).
- `POST /api/v1/dashboard/domains`
  - **Body:** `{ domain: string }`
  - **Logic:** Registers custom hostname with Cloudflare for SaaS, generates DNS CNAME/TXT verification records.
  - **Response:** `{ domain: StoreDomainDto, dns_records: DnsVerificationDto[] }`
- `POST /api/v1/dashboard/domains/:id/verify`
  - **Logic:** Queries DNS for TXT token and updates SSL verification state.

### 3.2 Visual Builder & Theme Management

- `GET /api/v1/dashboard/builder/theme`
  - **Response:** `{ theme_ast: FullThemeAstDto, versions: ThemeVersionSummaryDto[] }`
- `PUT /api/v1/dashboard/builder/pages/:id`
  - **Body:** `{ sections: SectionAstDto[], commit_message?: string }`
  - **Logic:** Saves draft changes to page sections and elements.
- `POST /api/v1/dashboard/builder/publish`
  - **Body:** `{ commit_message: string }`
  - **Logic:** Creates an immutable `theme_versions` snapshot and promotes current draft AST to live storefront cache.
- `POST /api/v1/dashboard/builder/rollback`
  - **Body:** `{ version_id: string }`
  - **Logic:** Reverts live storefront state to target version snapshot.

### 3.3 Products & Catalog Management

- `GET /api/v1/dashboard/products`
  - **Query Params:** `status`, `category_id`, `search`, `page`, `limit`.
  - **Response:** `{ products: ProductAdminListDto[], meta: PaginationMeta }`
- `POST /api/v1/dashboard/products`
  - **Body:** `CreateProductDto` (title, description, price, cost, variants, options, images, categories, tags, SEO).
  - **Logic:** Validates plan limits (`max_products`) and persists product + variant tree transactionally.
- `PUT /api/v1/dashboard/products/:id`
  - **Body:** `UpdateProductDto`
- `DELETE /api/v1/dashboard/products/:id`
  - **Logic:** Soft-deletes product (`deleted_at = NOW()`).
- `POST /api/v1/dashboard/products/bulk`
  - **Body:** `{ action: "PUBLISH" | "UNPUBLISH" | "DELETE" | "CHANGE_CATEGORY", ids: string[], payload?: any }`

### 3.4 Inventory Management

- `GET /api/v1/dashboard/inventory`
  - **Query Params:** `search`, `low_stock_only`, `page`, `limit`.
  - **Response:** `{ items: InventoryItemDto[] }`
- `POST /api/v1/dashboard/inventory/adjust`
  - **Body:** `{ variant_id: string, delta: number, reason: inventory_movement_reason, reference_id?: string }`
  - **Logic:** Mutates `inventory.on_hand` and appends immutable `inventory_movements` record.
- `GET /api/v1/dashboard/inventory/history/:variant_id`
  - **Response:** `{ movements: InventoryMovementDto[] }`

### 3.5 Orders, Fulfillment & Returns

- `GET /api/v1/dashboard/orders`
  - **Query Params:** `status`, `payment_status`, `fulfillment_type`, `date_from`, `date_to`, `page`, `limit`.
  - **Response:** `{ orders: OrderSummaryDto[], meta: PaginationMeta }`
- `GET /api/v1/dashboard/orders/:id`
  - **Response:** `{ order: OrderDetailDto, items: OrderItemDto[], history: OrderStatusHistoryDto[], shipments: ShipmentDto[] }`
- `POST /api/v1/dashboard/orders/:id/status`
  - **Body:** `{ status: order_status, note?: string }`
  - **Logic:** Enforces valid state machine transition and updates order history.
- `POST /api/v1/dashboard/orders/:id/fulfill`
  - **Body:** `{ carrier: string, tracking_number?: string, notify_customer: boolean }`
  - **Logic:** Creates shipment, transitions order to `SHIPPED`, and queues customer notification.
- `GET /api/v1/dashboard/orders/:id/invoice`
  - **Summary:** Generates or downloads GST tax invoice PDF.
- `POST /api/v1/dashboard/orders/:id/refund`
  - **Body:** `{ amount: number, reason: string, items?: Array<{ variant_id: string, quantity: number, restock: boolean }> }`
  - **Logic:** Triggers payment gateway refund via adapter, restocks inventory if requested, and writes ledger.

### 3.6 Media Asset Management

- `GET /api/v1/dashboard/media`
  - **Query Params:** `folder`, `search`, `page`, `limit`.
  - **Response:** `{ assets: MediaAssetDto[] }`
- `POST /api/v1/dashboard/media/presigned-upload`
  - **Body:** `{ file_name: string, mime_type: string, file_size: number, folder?: string }`
  - **Logic:** Validates MIME type against allowed list (PNG, JPEG, WEBP, MP4), verifies file size limit (max 25MB), checks plan storage limit, and issues pre-signed Supabase Storage upload URL.
  - **Response:** `{ upload_url: string, asset_id: string, final_public_url: string }`
- `DELETE /api/v1/dashboard/media/:id`
  - **Logic:** Deletes object from Supabase bucket and removes database record.

### 3.7 Analytics & Reporting

- `GET /api/v1/dashboard/analytics/overview`
  - **Query Params:** `range` (7d, 30d, 90d, 12m).
  - **Response:** `{ total_sales: number, total_orders: number, aov: number, conversion_rate: number, sales_chart: TimeSeriesDto[] }`
- `GET /api/v1/dashboard/analytics/funnel`
  - **Response:** `{ visitors: number, product_views: number, add_to_carts: number, checkouts: number, purchases: number }`

---

## 4. Platform Dropshipping APIs (`/api/v1/dropshipping`)

### 4.1 Supplier Network Operations

- `GET /api/v1/dropshipping/supplier/catalog`
  - **Query Params:** `category`, `search`, `min_margin`, `page`, `limit`.
  - **Response:** `{ supplier_products: SupplierProductDto[] }`
- `POST /api/v1/dropshipping/import-product`
  - **Body:** `{ supplier_product_id: string, retail_price: number, category_id?: string }`
  - **Logic:** Clones supplier product into merchant store's catalog with `source = 'PLATFORM_SUPPLIER'`, sets merchant selling price, and records supplier linkage.
  - **Response:** `{ product: ProductDto }`
- `GET /api/v1/dropshipping/supplier/orders`
  - **Summary:** Supplier Portal endpoint to inspect routed orders assigned to the authenticated supplier.
- `POST /api/v1/dropshipping/supplier/orders/:id/dispatch`
  - **Body:** `{ carrier: string, tracking_number: string }`
  - **Logic:** Supplier submits tracking; updates reseller order state to `SHIPPED` while masking supplier contact information.

---

## 5. Meesho Ingestion & Order Flow APIs (`/api/v1/meesho`)

- `POST /api/v1/meesho/fetch`
  - **Body:** `{ url_or_code: string }`
  - **Logic:** Routes query through `MeeshoSourceAdapter`. Extracts title, description, gallery images, wholesale price, variants, and specifications.
  - **Response:** `{ preview: MeeshoProductPreviewDto }`
- `POST /api/v1/meesho/calculate-profit`
  - **Body:** `{ meesho_cost: number, selling_price: number, ad_cost?: number, gateway_fee_percent?: number }`
  - **Response:** `{ net_profit: number, margin_percentage: number }`
- `POST /api/v1/meesho/import`
  - **Body:** `{ source_url: string, normalized_product: CreateProductDto, profit_margin: number }`
  - **Logic:** Stores raw import audit log, instantiates core `products` record with `source = 'MEESHO'`, and registers `meesho_products` mapping.
  - **Response:** `{ product: ProductDto }`
- `POST /api/v1/meesho/orders/:order_id/link-fulfillment`
  - **Body:** `{ meesho_order_id: string, tracking_number?: string }`
  - **Logic:** Associates manual Meesho dispatch confirmation with customer order.

---

## 6. AI Intelligence APIs (`/api/v1/ai`)

Strictly implements the 7 designated tools with human-in-the-loop validation:

- `POST /api/v1/ai/generate`
  - **Body:**
    ```typescript
    interface AiGenerateRequest {
      tool_type:
        | "PRODUCT_TITLE"
        | "PRODUCT_DESCRIPTION"
        | "SEO_DESCRIPTION"
        | "PRODUCT_FEATURES"
        | "PRODUCT_SPECIFICATIONS"
        | "PRODUCT_TAGS"
        | "CATEGORY_SUGGESTION";
      context: {
        raw_title?: string;
        keywords?: string[];
        category?: string;
        current_attributes?: Record<string, string>;
      };
    }
    ```
  - **Enforcement:**
    1. Validates organization plan quota against `ai_monthly_generations`.
    2. Invokes backend LLM service with strict grounded prompts (no hallucinated specifications).
    3. Logs generation payload and token metrics to `ai_generations`.
  - **Response:** `{ generation_id: string, output: string | string[], quota_remaining: number }`
- `POST /api/v1/ai/generations/:id/apply`
  - **Summary:** Confirms merchant accepted and applied the generated content. Updates `is_applied = TRUE`.

---

## 7. Subscriptions, Payments & Webhooks APIs

### 7.1 SaaS Subscriptions (`/api/v1/billing`)

- `GET /api/v1/billing/plans`
  - **Response:** `{ plans: SubscriptionPlanDto[] }` (Starter ₹199/mo, Business ₹599/mo, Launch ₹50).
- `POST /api/v1/billing/checkout`
  - **Body:** `{ plan_id: "STARTER" | "BUSINESS" }`
  - **Logic:** Generates Razorpay Subscription Checkout session.
  - **Response:** `{ subscription_id: string, checkout_options: object }`
- `POST /api/v1/billing/upgrade` / `POST /api/v1/billing/cancel`

### 7.2 Webhook Ingress (`/api/v1/webhooks`)

- `POST /api/v1/webhooks/razorpay`
  - **Logic:** Verifies `x-razorpay-signature` against merchant secret or platform billing secret. Handles `payment.captured`, `payment.failed`, `subscription.charged`, `subscription.cancelled`.
- `POST /api/v1/webhooks/cashfree`
  - **Logic:** Verifies signature and processes payment events.
- `POST /api/v1/webhooks/payu`
  - **Logic:** Verifies hash reverse-calculation signature and updates payment status.
- `POST /api/v1/webhooks/shiprocket`
  - **Logic:** Ingests carrier shipment status updates and updates `shipment_tracking`.

---

## 8. Platform Admin APIs (`/api/v1/admin`)

Restricted strictly to users with `is_platform_admin = TRUE`.

- `GET /api/v1/admin/users`: Search, filter, and inspect registered users.
- `GET /api/v1/admin/stores`: Monitor tenant stores, suspend abusive stores, inspect domain mappings.
- `GET /api/v1/admin/suppliers`: Approve/reject onboarding suppliers and inspect supplier orders.
- `GET /api/v1/admin/subscriptions`: Audit platform subscription revenues, churn metrics, and active tiers.
- `GET /api/v1/admin/ai-audit`: Monitor global AI token consumption, latency, and error rates across tenants.

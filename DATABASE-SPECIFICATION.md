# STOREFY — Database Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Database Engine:** PostgreSQL 16+ (Managed via Supabase)  
**ORM:** Drizzle ORM (TypeScript-First Schema Definition)

---

## 1. Data Architecture Principles

1. **Strict Multi-Tenant Scoping:** Every merchant-owned record contains a non-nullable `store_id UUID` referencing `stores(id) ON DELETE CASCADE` and `organization_id UUID` referencing `organizations(id) ON DELETE CASCADE`.
2. **Financial Precision:** All monetary amounts are stored as `BIGINT` representing the smallest currency denomination (e.g. Paise for INR, where ₹199.00 = `19900`) or `NUMERIC(12, 2)` to eliminate floating-point rounding errors.
3. **Auditability & Immutability:** Sensitive state transitions (inventory movements, order status changes, payment transactions, subscription events) are logged into append-only ledger tables.
4. **Soft Deletes vs Cascades:** Catalog and configuration items (products, collections, pages) support soft-deletes via `deleted_at TIMESTAMP WITH TIME ZONE`. Critical commerce history (orders, transactions, invoices) are permanent and never deleted.
5. **JSONB for Unstructured ASTs:** Storefront builder page trees, section configs, and dynamic themes utilize validated JSONB columns with GIN indexing.

---

## 2. Global Custom Enums & Types

```sql
-- Core Status Enums
CREATE TYPE subscription_tier AS ENUM ('STARTER', 'BUSINESS');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'UNPAID');
CREATE TYPE product_source AS ENUM ('MERCHANT', 'PLATFORM_SUPPLIER', 'MEESHO');
CREATE TYPE fulfillment_type AS ENUM ('MERCHANT', 'PLATFORM_DROPSHIP', 'MEESHO_RESELLING');
CREATE TYPE order_status AS ENUM (
  'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED',
  'RETURNED', 'REFUNDED', 'RTO'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE payment_gateway AS ENUM ('RAZORPAY', 'CASHFREE', 'PAYU', 'COD');
CREATE TYPE shipment_status AS ENUM ('PENDING', 'MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y');
CREATE TYPE inventory_movement_reason AS ENUM (
  'ORDER_RESERVATION', 'ORDER_FULFILLMENT', 'ORDER_CANCELLATION_RESTOCK',
  'RETURN_RESTOCK', 'MANUAL_ADJUSTMENT', 'INITIAL_STOCK', 'SUPPLIER_RESTOCK'
);
CREATE TYPE ai_tool_type AS ENUM (
  'PRODUCT_TITLE', 'PRODUCT_DESCRIPTION', 'SEO_DESCRIPTION',
  'PRODUCT_FEATURES', 'PRODUCT_SPECIFICATIONS', 'PRODUCT_TAGS', 'CATEGORY_SUGGESTION'
);
```

---

## 3. Database Domain Schemas

### 3.1 Domain 1: Multi-Tenancy, Users & Access Control (RBAC)

#### `users`

Syncs with `auth.users` of Supabase Auth.

- `id`: `UUID PRIMARY KEY` (Matches Supabase `auth.users.id`)
- `email`: `VARCHAR(255) NOT NULL UNIQUE`
- `full_name`: `VARCHAR(255)`
- `avatar_url`: `TEXT`
- `phone`: `VARCHAR(32)`
- `is_platform_admin`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `organizations`

Tenant grouping / legal merchant entity.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name`: `VARCHAR(255) NOT NULL`
- `slug`: `VARCHAR(100) NOT NULL UNIQUE`
- `billing_email`: `VARCHAR(255) NOT NULL`
- `phone`: `VARCHAR(32)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `stores`

Individual storefront operated by an organization.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `name`: `VARCHAR(255) NOT NULL`
- `slug`: `VARCHAR(100) NOT NULL UNIQUE`
- `subdomain`: `VARCHAR(100) NOT NULL UNIQUE` (e.g., `brand` for `brand.storefy.shop`)
- `custom_domain`: `VARCHAR(255) UNIQUE`
- `currency`: `VARCHAR(3) NOT NULL DEFAULT 'INR'`
- `timezone`: `VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata'`
- `logo_url`: `TEXT`
- `favicon_url`: `TEXT`
- `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `store_domains`

Handles custom domain lifecycle, SSL, and verification.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `domain`: `VARCHAR(255) NOT NULL UNIQUE`
- `is_primary`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `ssl_status`: `VARCHAR(50) NOT NULL DEFAULT 'PENDING'` -- PENDING, ACTIVE, FAILED
- `verification_token`: `VARCHAR(255) NOT NULL`
- `verified_at`: `TIMESTAMPTZ`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `store_settings`

Merchant store-specific operational configurations.

- `store_id`: `UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE`
- `whatsapp_order_phone`: `VARCHAR(32)`
- `whatsapp_order_enabled`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `whatsapp_support_phone`: `VARCHAR(32)`
- `whatsapp_support_enabled`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `cod_enabled`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `cod_min_amount`: `BIGINT DEFAULT 0`
- `cod_max_amount`: `BIGINT DEFAULT 5000000` -- ₹50,000 max for COD
- `tax_inclusive`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `order_id_prefix`: `VARCHAR(10) NOT NULL DEFAULT 'ORD-'`
- `invoice_prefix`: `VARCHAR(10) NOT NULL DEFAULT 'INV-'`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `roles` & `permissions` & `staff`

Module-level granular RBAC.

- `roles`: `id UUID PRIMARY KEY`, `name VARCHAR(50)`, `description TEXT` (Pre-seeded: OWNER, ADMIN, MANAGER, PRODUCT_MANAGER, ORDER_MANAGER, MARKETING_MANAGER, SUPPORT).
- `permissions`: `id UUID PRIMARY KEY`, `module VARCHAR(50) NOT NULL`, `action VARCHAR(50) NOT NULL`, `code VARCHAR(100) UNIQUE NOT NULL` (e.g., `catalog:write`, `orders:view`, `settings:manage`).
- `role_permissions`: `role_id UUID REFERENCES roles(id)`, `permission_id UUID REFERENCES permissions(id)`.
- `staff`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `organization_id`: `UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
  - `store_id`: `UUID REFERENCES stores(id) ON DELETE CASCADE` (NULL implies all stores in org)
  - `user_id`: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `role_id`: `UUID NOT NULL REFERENCES roles(id)`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE(organization_id, user_id, store_id)`

---

### 3.2 Domain 2: Theme Engine & Visual Storefront Builder

#### `store_themes`

Active and saved themes for a store.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `name`: `VARCHAR(255) NOT NULL`
- `is_active`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `settings_schema`: `JSONB NOT NULL DEFAULT '{}'` -- Global tokens: colors, typography, spacing
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `theme_versions`

Audit trail and rollback history for theme updates.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `theme_id`: `UUID NOT NULL REFERENCES store_themes(id) ON DELETE CASCADE`
- `version_number`: `INTEGER NOT NULL`
- `snapshot_ast`: `JSONB NOT NULL` -- Full JSON state of templates, pages, and sections
- `created_by`: `UUID REFERENCES users(id)`
- `commit_message`: `VARCHAR(255)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `templates`

Pre-packaged or custom templates (Fashion, Electronics, One-Product, etc.).

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID REFERENCES stores(id) ON DELETE CASCADE` (NULL for system templates)
- `category`: `VARCHAR(100) NOT NULL`
- `title`: `VARCHAR(255) NOT NULL`
- `thumbnail_url`: `TEXT`
- `is_system`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `default_content`: `JSONB NOT NULL`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `pages`

Pages within a store theme.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `theme_id`: `UUID NOT NULL REFERENCES store_themes(id) ON DELETE CASCADE`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `title`: `VARCHAR(255) NOT NULL`
- `slug`: `VARCHAR(255) NOT NULL` (e.g., `home`, `about`, `contact`, `privacy-policy`)
- `page_type`: `VARCHAR(50) NOT NULL` -- HOME, PRODUCT, COLLECTION, CART, CHECKOUT, CUSTOM
- `is_published`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `seo_title`: `VARCHAR(255)`
- `seo_description`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(theme_id, slug)`

#### `page_sections` & `page_elements`

Schema-driven section hierarchy.

- `page_sections`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `page_id`: `UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE`
  - `section_type`: `VARCHAR(100) NOT NULL` -- hero_banner, product_grid, reviews, faq, etc.
  - `sort_order`: `INTEGER NOT NULL DEFAULT 0`
  - `is_hidden`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `settings`: `JSONB NOT NULL DEFAULT '{}'` -- Section-level styling and content options
- `page_elements`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `section_id`: `UUID NOT NULL REFERENCES page_sections(id) ON DELETE CASCADE`
  - `parent_element_id`: `UUID REFERENCES page_elements(id) ON DELETE CASCADE` -- Tree nesting
  - `element_type`: `VARCHAR(100) NOT NULL` -- heading, button, product_price, image, etc.
  - `content`: `JSONB NOT NULL DEFAULT '{}'`
  - `styles`: `JSONB NOT NULL DEFAULT '{}'` (responsive width, height, margin, padding)
  - `bindings`: `JSONB NOT NULL DEFAULT '{}'` (e.g. `{"text": "Product.title"}`)
  - `sort_order`: `INTEGER NOT NULL DEFAULT 0`

#### `navigation` & `media_assets`

- `navigation`: `id UUID PRIMARY KEY`, `store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`, `name VARCHAR(100)`, `handle VARCHAR(100)`, `items JSONB NOT NULL DEFAULT '[]'` (Hierarchical menu links).
- `media_assets`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
  - `storage_path`: `TEXT NOT NULL`
  - `public_url`: `TEXT NOT NULL`
  - `file_name`: `VARCHAR(255) NOT NULL`
  - `mime_type`: `VARCHAR(100) NOT NULL`
  - `file_size`: `BIGINT NOT NULL`
  - `alt_text`: `TEXT`
  - `folder`: `VARCHAR(100) DEFAULT '/'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.3 Domain 3: Catalog, Categories & Multi-Variant Architecture

#### `categories`

Unlimited hierarchical product classification.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `parent_id`: `UUID REFERENCES categories(id) ON DELETE SET NULL`
- `name`: `VARCHAR(255) NOT NULL`
- `slug`: `VARCHAR(255) NOT NULL`
- `description`: `TEXT`
- `image_url`: `TEXT`
- `sort_order`: `INTEGER NOT NULL DEFAULT 0`
- `is_featured`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `seo_title`: `VARCHAR(255)`
- `seo_description`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(store_id, slug)`

#### `collections` & `product_collections`

Curated groupings (New Arrivals, Flash Sale).

- `collections`: `id UUID PRIMARY KEY`, `store_id UUID NOT NULL REFERENCES stores(id)`, `title VARCHAR(255)`, `slug VARCHAR(255)`, `description TEXT`, `image_url TEXT`, `is_automatic BOOLEAN DEFAULT FALSE`, `rules JSONB DEFAULT '[]'`.
- `product_collections`: `product_id UUID REFERENCES products(id) ON DELETE CASCADE`, `collection_id UUID REFERENCES collections(id) ON DELETE CASCADE`, `PRIMARY KEY (product_id, collection_id)`.

#### `products`

The core commerce merchandise unit.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `source`: `product_source NOT NULL DEFAULT 'MERCHANT'`
- `fulfillment_type`: `fulfillment_type NOT NULL DEFAULT 'MERCHANT'`
- `supplier_id`: `UUID` -- References suppliers(id) if dropshipped
- `supplier_product_id`: `UUID`
- `title`: `VARCHAR(500) NOT NULL`
- `slug`: `VARCHAR(500) NOT NULL`
- `description`: `TEXT`
- `short_description`: `TEXT`
- `product_type`: `VARCHAR(100)`
- `vendor`: `VARCHAR(255)`
- `brand`: `VARCHAR(255)`
- `category_id`: `UUID REFERENCES categories(id) ON DELETE SET NULL`
- `tags`: `TEXT[] DEFAULT '{}'`
- `base_price`: `BIGINT NOT NULL` -- in Paise
- `compare_at_price`: `BIGINT`
- `cost_price`: `BIGINT` -- Merchant's purchase or supplier base cost
- `sku`: `VARCHAR(100)`
- `barcode`: `VARCHAR(100)`
- `track_inventory`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `allow_backorders`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `low_stock_threshold`: `INTEGER NOT NULL DEFAULT 5`
- `is_physical`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `weight`: `DECIMAL(8, 2)` -- in grams or kg
- `dimensions`: `JSONB` -- {length, width, height, unit}
- `status`: `VARCHAR(50) NOT NULL DEFAULT 'DRAFT'` -- DRAFT, PUBLISHED, ARCHIVED
- `seo_title`: `VARCHAR(255)`
- `seo_description`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `deleted_at`: `TIMESTAMPTZ`
- `UNIQUE(store_id, slug)`

#### `product_variants`

Multi-attribute variant matrix (Color, Size, Material).

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `product_id`: `UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `title`: `VARCHAR(255) NOT NULL` -- e.g., "Red / XL"
- `sku`: `VARCHAR(100) UNIQUE`
- `barcode`: `VARCHAR(100)`
- `price`: `BIGINT NOT NULL`
- `compare_at_price`: `BIGINT`
- `cost_price`: `BIGINT`
- `option1`: `VARCHAR(100)` -- e.g., "Red"
- `option2`: `VARCHAR(100)` -- e.g., "XL"
- `option3`: `VARCHAR(100)`
- `image_url`: `TEXT`
- `weight`: `DECIMAL(8, 2)`
- `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `product_images` & `product_metafields`

- `product_images`: `id UUID PRIMARY KEY`, `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`, `image_url TEXT NOT NULL`, `alt_text TEXT`, `sort_order INTEGER DEFAULT 0`.
- `product_metafields`: `id UUID PRIMARY KEY`, `product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`, `namespace VARCHAR(100) NOT NULL`, `key VARCHAR(100) NOT NULL`, `value_type VARCHAR(50) NOT NULL`, `value TEXT NOT NULL`.

---

### 3.4 Domain 4: Inventory Management & Stock Movements

#### `inventory`

Stock state tracked per variant and location.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `product_id`: `UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `variant_id`: `UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`
- `location_id`: `UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'` -- Extensible for multi-location
- `on_hand`: `INTEGER NOT NULL DEFAULT 0`
- `reserved`: `INTEGER NOT NULL DEFAULT 0`
- `available`: `INTEGER GENERATED ALWAYS AS (on_hand - reserved) STORED`
- `incoming`: `INTEGER NOT NULL DEFAULT 0`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(store_id, variant_id, location_id)`

#### `inventory_movements`

Append-only stock ledger.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `variant_id`: `UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`
- `quantity_delta`: `INTEGER NOT NULL` (positive for restock, negative for fulfillment)
- `reason`: `inventory_movement_reason NOT NULL`
- `reference_id`: `VARCHAR(100)` (Order ID, Transfer ID, or Manual Note)
- `created_by`: `UUID REFERENCES users(id)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.5 Domain 5: Customers, Addresses & Carts

#### `customers`

Store-specific customer entity.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `first_name`: `VARCHAR(100)`
- `last_name`: `VARCHAR(100)`
- `email`: `VARCHAR(255)`
- `phone`: `VARCHAR(32)`
- `notes`: `TEXT`
- `total_spent`: `BIGINT NOT NULL DEFAULT 0`
- `orders_count`: `INTEGER NOT NULL DEFAULT 0`
- `last_order_at`: `TIMESTAMPTZ`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(store_id, email)`

#### `customer_addresses`

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `customer_id`: `UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE`
- `name`: `VARCHAR(255) NOT NULL`
- `phone`: `VARCHAR(32) NOT NULL`
- `address_line1`: `TEXT NOT NULL`
- `address_line2`: `TEXT`
- `city`: `VARCHAR(100) NOT NULL`
- `state`: `VARCHAR(100) NOT NULL`
- `postal_code`: `VARCHAR(20) NOT NULL`
- `country`: `VARCHAR(100) NOT NULL DEFAULT 'India'`
- `is_default`: `BOOLEAN NOT NULL DEFAULT FALSE`

#### `customer_segments`

- `id`: `UUID PRIMARY KEY`, `store_id UUID NOT NULL REFERENCES stores(id)`, `name VARCHAR(100) NOT NULL` (NEW, RETURNING, HIGH_VALUE, INACTIVE), `rules JSONB NOT NULL`.

#### `carts` & `cart_items`

Persistent server-validated cart sessions.

- `carts`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
  - `customer_id`: `UUID REFERENCES customers(id) ON DELETE SET NULL`
  - `session_token`: `VARCHAR(255) NOT NULL UNIQUE`
  - `coupon_code`: `VARCHAR(50)`
  - `expires_at`: `TIMESTAMPTZ NOT NULL`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `cart_items`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `cart_id`: `UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE`
  - `product_id`: `UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
  - `variant_id`: `UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`
  - `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `UNIQUE(cart_id, variant_id)`

---

### 3.6 Domain 6: Orders, Fulfillment, Invoices & Returns

#### `orders`

The central transaction record.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `order_number`: `VARCHAR(50) NOT NULL` (e.g. `ORD-1001`)
- `customer_id`: `UUID REFERENCES customers(id) ON DELETE SET NULL`
- `status`: `order_status NOT NULL DEFAULT 'PENDING'`
- `payment_status`: `payment_status NOT NULL DEFAULT 'PENDING'`
- `fulfillment_type`: `fulfillment_type NOT NULL DEFAULT 'MERCHANT'`
- `currency`: `VARCHAR(3) NOT NULL DEFAULT 'INR'`
- `subtotal_amount`: `BIGINT NOT NULL` -- in Paise
- `discount_amount`: `BIGINT NOT NULL DEFAULT 0`
- `tax_amount`: `BIGINT NOT NULL DEFAULT 0`
- `shipping_amount`: `BIGINT NOT NULL DEFAULT 0`
- `total_amount`: `BIGINT NOT NULL`
- `shipping_address`: `JSONB NOT NULL` -- Snapshot of customer address at order time
- `billing_address`: `JSONB NOT NULL`
- `payment_method`: `payment_gateway NOT NULL`
- `notes`: `TEXT`
- `internal_notes`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(store_id, order_number)`

#### `order_items`

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
- `product_id`: `UUID NOT NULL REFERENCES products(id)`
- `variant_id`: `UUID NOT NULL REFERENCES product_variants(id)`
- `product_source`: `product_source NOT NULL`
- `title`: `VARCHAR(500) NOT NULL`
- `variant_title`: `VARCHAR(255)`
- `sku`: `VARCHAR(100)`
- `quantity`: `INTEGER NOT NULL`
- `unit_price`: `BIGINT NOT NULL`
- `total_price`: `BIGINT NOT NULL`
- `supplier_cost`: `BIGINT DEFAULT 0` -- For dropshipping margin accounting

#### `order_status_history`

Append-only order audit timeline.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
- `from_status`: `order_status`
- `to_status`: `order_status NOT NULL`
- `note`: `TEXT`
- `changed_by`: `UUID REFERENCES users(id)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `shipments` & `shipment_tracking`

- `shipments`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
  - `carrier`: `VARCHAR(100) NOT NULL` (e.g., Shiprocket, Delhivery, Manual)
  - `tracking_number`: `VARCHAR(255)`
  - `label_url`: `TEXT`
  - `status`: `shipment_status NOT NULL DEFAULT 'PENDING'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `shipment_tracking`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `shipment_id`: `UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE`
  - `status_code`: `VARCHAR(50)`
  - `location`: `VARCHAR(255)`
  - `message`: `TEXT`
  - `timestamp`: `TIMESTAMPTZ NOT NULL`

#### `invoices`

Formal GST-ready merchant-to-customer tax invoices.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `order_id`: `UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE`
- `invoice_number`: `VARCHAR(50) NOT NULL UNIQUE`
- `seller_details`: `JSONB NOT NULL` (Store name, GSTIN, Address)
- `buyer_details`: `JSONB NOT NULL` (Customer name, billing address, phone)
- `line_items`: `JSONB NOT NULL`
- `tax_breakdown`: `JSONB NOT NULL` (CGST, SGST, IGST)
- `total_amount`: `BIGINT NOT NULL`
- `pdf_url`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `returns` & `refunds`

- `returns`: `id UUID PRIMARY KEY`, `order_id UUID NOT NULL REFERENCES orders(id)`, `customer_id UUID`, `status VARCHAR(50)`, `reason TEXT`, `items JSONB NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- `refunds`: `id UUID PRIMARY KEY`, `order_id UUID NOT NULL REFERENCES orders(id)`, `amount BIGINT NOT NULL`, `reason TEXT`, `gateway_refund_id VARCHAR(255)`, `status VARCHAR(50)`, `processed_at TIMESTAMPTZ`.

---

### 3.7 Domain 7: Payments & Provider Integrations

#### `payment_accounts`

Merchant's connected payment credentials.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `provider`: `payment_gateway NOT NULL`
- `encrypted_credentials`: `TEXT NOT NULL` -- AES-256-GCM cipher string storing Key ID & Secret
- `is_test_mode`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE(store_id, provider)`

#### `payments` & `payment_transactions`

- `payments`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
  - `gateway`: `payment_gateway NOT NULL`
  - `gateway_order_id`: `VARCHAR(255)` -- e.g. `order_M12345` from Razorpay
  - `gateway_payment_id`: `VARCHAR(255)` -- e.g. `pay_M12345`
  - `amount`: `BIGINT NOT NULL`
  - `currency`: `VARCHAR(3) NOT NULL DEFAULT 'INR'`
  - `status`: `payment_status NOT NULL DEFAULT 'PENDING'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `payment_transactions`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `payment_id`: `UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE`
  - `type`: `VARCHAR(50) NOT NULL` -- CAPTURE, REFUND, CHARGEBACK, WEBHOOK_EVENT
  - `payload`: `JSONB NOT NULL`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.8 Domain 8: Platform Dropshipping Engine

#### `suppliers`

Platform verified supplier entity.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id`: `UUID NOT NULL REFERENCES users(id)`
- `business_name`: `VARCHAR(255) NOT NULL`
- `gstin`: `VARCHAR(15)`
- `contact_phone`: `VARCHAR(32) NOT NULL`
- `pickup_address`: `JSONB NOT NULL`
- `is_verified`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `supplier_products` & `supplier_inventory`

- `supplier_products`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `supplier_id`: `UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE`
  - `title`: `VARCHAR(500) NOT NULL`
  - `base_cost`: `BIGINT NOT NULL` -- Wholesale cost in Paise
  - `suggested_retail_price`: `BIGINT NOT NULL`
  - `images`: `TEXT[] NOT NULL`
  - `specifications`: `JSONB NOT NULL DEFAULT '{}'`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `supplier_inventory`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `supplier_product_id`: `UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE`
  - `quantity`: `INTEGER NOT NULL DEFAULT 0`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `supplier_orders` & `dropshipping_orders`

- `dropshipping_orders`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
  - `supplier_id`: `UUID NOT NULL REFERENCES suppliers(id)`
  - `reseller_store_id`: `UUID NOT NULL REFERENCES stores(id)`
  - `supplier_payout_amount`: `BIGINT NOT NULL` -- Supplier Cost
  - `reseller_margin_amount`: `BIGINT NOT NULL` -- Reseller Gross Profit
  - `status`: `VARCHAR(50) NOT NULL DEFAULT 'PENDING_SUPPLIER_ACCEPT'`
  - `tracking_number`: `VARCHAR(255)`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.9 Domain 9: Meesho Ingestion & Order Mirroring

#### `meesho_imports`

Audit log of Meesho scraping/import sessions.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `source_url`: `TEXT NOT NULL`
- `source_product_code`: `VARCHAR(100)`
- `raw_data`: `JSONB NOT NULL`
- `normalized_data`: `JSONB NOT NULL`
- `status`: `VARCHAR(50) NOT NULL` -- FETCHED, NORMALIZED, IMPORTED, FAILED
- `error_message`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `meesho_products`

Linkage between imported STOREFY product and Meesho source.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `product_id`: `UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `meesho_product_code`: `VARCHAR(100) NOT NULL`
- `meesho_original_price`: `BIGINT NOT NULL`
- `profit_markup`: `BIGINT NOT NULL`
- `last_synced_at`: `TIMESTAMPTZ`

#### `meesho_orders`

Manual fulfillment tracker for Meesho items.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `order_id`: `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
- `meesho_product_id`: `UUID NOT NULL REFERENCES meesho_products(id)`
- `meesho_order_id`: `VARCHAR(100)` -- Entered manually by merchant once placed on Meesho
- `fulfillment_status`: `VARCHAR(50) NOT NULL DEFAULT 'PENDING_MERCHANT_DISPATCH'`
- `tracking_number`: `VARCHAR(255)`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.10 Domain 10: Marketing, Coupons & Reviews

#### `coupons` & `discounts`

- `coupons`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
  - `code`: `VARCHAR(50) NOT NULL`
  - `discount_type`: `discount_type NOT NULL`
  - `value`: `BIGINT NOT NULL` -- Percentage (e.g. 2000 for 20%) or Flat Paise
  - `min_order_amount`: `BIGINT DEFAULT 0`
  - `max_discount_amount`: `BIGINT` -- Cap for percentage discounts
  - `starts_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `expires_at`: `TIMESTAMPTZ`
  - `usage_limit_total`: `INTEGER`
  - `usage_limit_per_customer`: `INTEGER DEFAULT 1`
  - `usage_count`: `INTEGER NOT NULL DEFAULT 0`
  - `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`
  - `UNIQUE(store_id, code)`

#### `reviews`

Product ratings with moderation.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `product_id`: `UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `customer_id`: `UUID REFERENCES customers(id) ON DELETE SET NULL`
- `author_name`: `VARCHAR(255) NOT NULL`
- `rating`: `INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)`
- `title`: `VARCHAR(255)`
- `body`: `TEXT`
- `is_approved`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.11 Domain 11: Subscriptions & Feature Entitlements

#### `subscription_plans`

Core platform plans (STARTER, BUSINESS).

- `id`: `VARCHAR(50) PRIMARY KEY` -- 'STARTER', 'BUSINESS'
- `name`: `VARCHAR(100) NOT NULL`
- `monthly_price`: `BIGINT NOT NULL` -- Starter: 19900 (₹199), Business: 59900 (₹599)
- `launch_month_price`: `BIGINT NOT NULL DEFAULT 5000` -- ₹50
- `is_active`: `BOOLEAN NOT NULL DEFAULT TRUE`

#### `plan_features` & `plan_feature_limits`

Configurable plan quotas and module gates.

- `plan_features`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `plan_id`: `VARCHAR(50) NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE`
  - `feature_key`: `VARCHAR(100) NOT NULL` (e.g., `dropshipping_access`, `custom_domain`, `staff_accounts`)
  - `is_enabled`: `BOOLEAN NOT NULL DEFAULT TRUE`
- `plan_feature_limits`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `plan_id`: `VARCHAR(50) NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE`
  - `limit_key`: `VARCHAR(100) NOT NULL` (e.g., `max_products`, `max_staff`, `ai_monthly_generations`)
  - `limit_value`: `INTEGER NOT NULL` -- (-1 for unlimited)

#### `subscriptions` & `subscription_events`

Organization subscription state.

- `subscriptions`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `organization_id`: `UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE`
  - `plan_id`: `VARCHAR(50) NOT NULL REFERENCES subscription_plans(id)`
  - `status`: `subscription_status NOT NULL DEFAULT 'ACTIVE'`
  - `gateway_subscription_id`: `VARCHAR(255)` -- Razorpay Sub ID
  - `current_period_start`: `TIMESTAMPTZ NOT NULL`
  - `current_period_end`: `TIMESTAMPTZ NOT NULL`
  - `cancel_at_period_end`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `subscription_events`:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `subscription_id`: `UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE`
  - `event_type`: `VARCHAR(100) NOT NULL` -- CREATED, RENEWED, UPGRADED, CANCELLED, PAYMENT_FAILED
  - `details`: `JSONB NOT NULL DEFAULT '{}'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.12 Domain 12: AI Intelligence & Generation Auditing

#### `ai_generations`

Audit ledger tracking the 7 AI generation tools.

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `user_id`: `UUID NOT NULL REFERENCES users(id)`
- `tool_type`: `ai_tool_type NOT NULL`
- `prompt_input`: `TEXT NOT NULL`
- `generated_output`: `TEXT NOT NULL`
- `model_used`: `VARCHAR(100) NOT NULL`
- `tokens_consumed`: `INTEGER DEFAULT 0`
- `is_applied`: `BOOLEAN NOT NULL DEFAULT FALSE` -- Human-in-the-loop tracking
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

### 3.13 Domain 13: Platform Operations, Analytics & Auditing

#### `analytics_events`

High-throughput event tracking table.

- `id`: `BIGSERIAL PRIMARY KEY`
- `store_id`: `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE`
- `event_name`: `VARCHAR(100) NOT NULL` -- page_view, product_view, add_to_cart, checkout_step, purchase
- `session_id`: `VARCHAR(255) NOT NULL`
- `visitor_ip`: `VARCHAR(45)`
- `user_agent`: `TEXT`
- `referrer`: `TEXT`
- `event_data`: `JSONB NOT NULL DEFAULT '{}'`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `audit_logs`

- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `organization_id`: `UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `store_id`: `UUID REFERENCES stores(id) ON DELETE CASCADE`
- `user_id`: `UUID REFERENCES users(id)`
- `action`: `VARCHAR(100) NOT NULL`
- `resource_type`: `VARCHAR(100) NOT NULL`
- `resource_id`: `VARCHAR(100)`
- `changes`: `JSONB`
- `ip_address`: `VARCHAR(45)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### `notifications` & `webhooks`

- `notifications`: `id UUID PRIMARY KEY`, `user_id UUID NOT NULL REFERENCES users(id)`, `store_id UUID REFERENCES stores(id)`, `title VARCHAR(255)`, `message TEXT`, `is_read BOOLEAN DEFAULT FALSE`, `link TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
- `webhooks`: `id UUID PRIMARY KEY`, `store_id UUID NOT NULL REFERENCES stores(id)`, `topic VARCHAR(100) NOT NULL`, `endpoint_url TEXT NOT NULL`, `secret_key VARCHAR(255) NOT NULL`, `is_active BOOLEAN DEFAULT TRUE`.

---

## 4. Primary Indexes & Performance Optimization

```sql
-- Store & Domain Indexes
CREATE INDEX idx_stores_subdomain ON stores(subdomain);
CREATE INDEX idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX idx_store_domains_domain ON store_domains(domain);

-- Catalog & Inventory Indexes
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_store_slug ON products(store_id, slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(store_id, status);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_inventory_variant_store ON inventory(store_id, variant_id);

-- Orders & Customers Indexes
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(store_id, status);
CREATE INDEX idx_orders_created_at ON orders(store_id, created_at DESC);
CREATE INDEX idx_customers_store_email ON customers(store_id, email);

-- Analytics & Audit Indexes
CREATE INDEX idx_analytics_store_event ON analytics_events(store_id, event_name, created_at DESC);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
```

---

## 5. Row Level Security (RLS) Policy Specifications

PostgreSQL RLS is enabled across all tenant tables:

```sql
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
```

**Standard Policy Pattern (Tenant Isolation):**

```sql
-- Restrict merchant staff to their organization/store records
CREATE POLICY tenant_isolation_policy ON products
FOR ALL
TO authenticated
USING (
  store_id IN (
    SELECT s.store_id
    FROM staff s
    WHERE s.user_id = auth.uid() AND s.is_active = TRUE
  )
  OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE
  )
);
```

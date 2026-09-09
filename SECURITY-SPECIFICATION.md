# STOREFY — Security Specification

**Document Version:** 1.0.0  
**Phase:** 0 — Specification and Architecture  
**Classification:** Canonical Security Architecture & Threat Model

---

## 1. Security Architecture Principles & Invariants

STOREFY operates on a **Zero-Trust Presentation Architecture**. The browser / storefront frontend is treated as an untrusted public environment. All commerce rules, calculations, inventory reservations, role checks, and financial state transitions must be strictly validated and executed on the server.

### 1.1 The Seven Absolute Invariants

1. **Never Trust Browser Pricing:** The client never submits final item prices or order totals. The server resolves all prices directly from `products` and `product_variants` database records at the exact time of checkout initialization.
2. **Never Trust Browser Inventory:** Inventory availability is checked and atomically reserved server-side before order authorization.
3. **Never Trust Client-Asserted Permissions:** Every API route and Server Action evaluates authenticated user identity, active organization membership, and granular role permissions.
4. **Never Trust Frontend Payment Success:** An order is never transitioned to `CONFIRMED` based on frontend callback alone. Confirmation requires server-side HMAC signature verification or direct provider API validation.
5. **Never Trust Client Order Status:** Order status updates can only be executed by authorized merchant staff or verified carrier/gateway webhooks.
6. **Never Trust Client Subscription State:** Feature entitlement checks query the active database subscription state and cached tenant limits, not client session state.
7. **Complete Tenant Isolation:** Merchant A must never be able to read, write, or infer data belonging to Merchant B.

---

## 2. Threat Modeling & Trust Boundaries

```
[Untrusted Public Web]
         | (Storefront Customer Traffic)
         v
+-----------------------------------------------------------------------------------+
| BOUNDARY 1: Edge & Ingress (Cloudflare WAF, DDoS Protection, Rate Limiting)      |
+-----------------------------------------------------------------------------------+
         | (Filtered HTTPS Requests)
         v
+-----------------------------------------------------------------------------------+
| BOUNDARY 2: Next.js Edge Middleware (Tenant Resolution, Host Header Verification)|
+-----------------------------------------------------------------------------------+
         | (Injected Tenant Context: x-store-id, x-tenant-context)
         v
+-----------------------------------------------------------------------------------+
| BOUNDARY 3: Application Server Actions & API Handlers                             |
|  - Zod Input Validation & Sanitization                                            |
|  - Supabase JWT Session Extraction                                                |
|  - Granular RBAC Permission Verification                                          |
|  - Server-Authoritative Commerce & Pricing Engine                                 |
+-----------------------------------------------------------------------------------+
         | (Parameterized Type-Safe Queries via Drizzle ORM)
         v
+-----------------------------------------------------------------------------------+
| BOUNDARY 4: Database Layer (PostgreSQL Row Level Security - RLS)                  |
|  - Mandatory store_id / organization_id Isolation                                 |
|  - Immutable Audit Log Triggers                                                  |
+-----------------------------------------------------------------------------------+
```

### Key Threat Scenarios & Mitigations

- **Tenant Cross-Contamination:** Prevented via dual-layer isolation: Drizzle ORM query filters enforced at the application repository layer, backed by PostgreSQL Row Level Security (RLS) policies at the database layer.
- **Price Tampering:** If a malicious user alters client-side prices in cart payload, the server discards client values and re-calculates all line item totals, taxes, discounts, and shipping from primary database tables.
- **Race-Condition Overselling:** Prevented via database-level atomic reservation queries with `FOR UPDATE` row locking during checkout initialization:
  ```sql
  UPDATE inventory
  SET reserved = reserved + :qty
  WHERE variant_id = :variant_id AND (on_hand - reserved) >= :qty;
  ```
- **Credential Exfiltration:** Merchant payment gateway keys (`key_secret`) and carrier secrets are encrypted at rest using AES-256-GCM. Decryption keys are stored in environment variables accessible only to server-side workers.

---

## 3. Multi-Tenancy & Data Isolation Specification

### 3.1 Tenant Identification Pipeline

1. Incoming HTTP request reaches Next.js Edge Middleware.
2. Hostname is parsed:
   - Subdomain: `[subdomain].storefy.shop` -> Queried against `stores.subdomain`.
   - Custom Domain: `customdomain.com` -> Queried against `store_domains.domain` where `ssl_status = 'ACTIVE'`.
3. Validated `store_id` is assigned to request headers:
   - `x-store-id`: UUID string.
   - `x-organization-id`: UUID string.
4. Downstream API handlers extract `store_id` via secure server utility `getTenantContext(request)` which verifies header authenticity.

### 3.2 Row Level Security (RLS) Enforcement

PostgreSQL RLS policies ensure that even if an application query omits a WHERE clause, the database restricts rows to the authenticated user's organization:

```sql
-- Global helper function in Postgres
CREATE OR REPLACE FUNCTION current_store_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_store_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Example RLS Policy for Orders
CREATE POLICY orders_tenant_isolation ON orders
FOR ALL TO authenticated
USING (
  store_id = current_store_id()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_platform_admin = TRUE)
);
```

---

## 4. Authentication, Session & RBAC Specification

### 4.1 Authentication Stack

- **Identity Provider:** Supabase Auth (GoTrue).
- **Token Transport:** HTTP-only, `Secure`, `SameSite=Lax` cookies for dashboard sessions; Bearer JWT for programmatic API tokens.
- **Token Rotation:** Automatic short-lived access token renewal (1 hour expiration) via refresh tokens (30 day sliding window).

### 4.2 Role-Based Access Control (RBAC) Matrix

| Role                  | Scope              | Permissions                                                                                                    |
| :-------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------- |
| **Owner**             | Organization-wide  | All permissions, billing management, store deletion, staff invitation.                                         |
| **Admin**             | Organization/Store | Catalog, inventory, orders, discounts, builder, domains, settings. Cannot alter billing or transfer ownership. |
| **Manager**           | Store              | Catalog, inventory, orders, fulfillment, customer management.                                                  |
| **Product Manager**   | Store              | Products, collections, inventory adjustments. No order or financial access.                                    |
| **Order Manager**     | Store              | Order fulfillment, shipments, returns, invoices. No builder or settings access.                                |
| **Marketing Manager** | Store              | Coupons, discounts, reviews, builder theme banners, SEO metadata.                                              |
| **Support**           | Store              | Read-only access to customer orders and tracking info.                                                         |

### 4.3 Permission Guard Implementation

Every server action and route handler executes a permission check before processing:

```typescript
await requirePermission(ctx, "catalog:write");
```

---

## 5. Secret Management & Cryptographic Security

### 5.1 Environment Secret Boundaries & Storage

Platform and merchant secrets are isolated across three dedicated hosted cloud environments (Development, Staging, Production):

- **Environment Variable Isolation:** Vercel environment configurations (`Development`, `Preview`, `Production`) inject separate Supabase project API keys (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and distinct database URLs. Development secrets never touch production databases.
- **Merchant Gateway Credential Encryption:** Merchant payment keys (Razorpay Key Secret, Cashfree Secret Key, PayU Salt) are never stored as plain text.
  - **Algorithm:** AES-256-GCM (Authenticated Galois/Counter Mode).
  - **Key Derivation:** Unique initialization vector (IV - 12 bytes) and authentication tag (16 bytes) generated per record.
  - **Ciphertext Storage Format:** `iv:ciphertext:auth_tag` encoded in base64.
  - **Master Encryption Key:** `ENCRYPTION_MASTER_KEY` (32 bytes hex) provided via secure server environment variable.

### 5.2 Webhook Signature Verification

All external webhook endpoints must strictly verify cryptographic signatures prior to parsing request bodies:

- **Razorpay:**
  $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{Raw Payload}, \text{Webhook Secret})$$
  Evaluated using constant-time string comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
- **Cashfree:** Verified using `x-webhook-signature` public key or shared secret.
- **PayU:** Verified using reverse SHA-512 hash calculation:
  $$\text{Expected Hash} = \text{SHA-512}(\text{salt} \mid \text{status} \mid \dots \mid \text{txnid} \mid \text{amount} \mid \text{productinfo} \mid \text{firstname} \mid \text{email} \mid \text{key})$$
  Evaluated using `crypto.timingSafeEqual`.
- **Replay Attack Prevention:** Webhooks reject timestamps older than 5 minutes (`tolerance: 300s`) and maintain an idempotency cache of processed `event_id`s in PostgreSQL / Redis.

---

## 6. Input Validation, Sanitization & Content Security

### 6.1 Strict Zod Schemas

Every route handler and Server Action validates incoming JSON payloads against strict Zod schemas:

- Strip unknown fields (`.strict()`).
- Type coercion prevention.
- Regex validation on phone numbers, slugs, and SKUs.
- Range validation on numeric values (e.g. `z.number().int().positive()`).

### 6.2 XSS Prevention & Rich Text Sanitization

- Builder custom HTML and product rich text descriptions are sanitized server-side using `sanitize-html` with an explicit whitelist:
  - Allowed tags: `['p', 'b', 'i', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'span', 'img', 'table', 'tr', 'td']`
  - Disallowed: `['script', 'iframe', 'object', 'embed', 'form']`
  - Enforce `rel="noopener noreferrer"` on all external links.

### 6.3 Content Security Policy (CSP)

Next.js middleware injects standard security headers on all responses:

- `Content-Security-Policy`: Restricts script execution to trusted domains (Supabase, Razorpay, Cashfree, PayU, Google Fonts, Cloudflare).
- `X-Frame-Options: SAMEORIGIN` (Except for builder preview canvas which uses explicit `frame-ancestors 'self'`).
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

---

## 7. Media Asset Upload Security

To prevent arbitrary file execution and storage abuse:

1. **Presigned Upload Pipeline:** Client requests upload URL via `/api/v1/dashboard/media/presigned-upload`.
2. **Server-Side Validation Before Presign:**
   - File extension and MIME type checked against whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`.
   - File size strictly bounded: Max 10MB for images, Max 50MB for videos.
   - Plan storage quota validated against current usage.
3. **Storage Bucket Policies:** Supabase Storage buckets configured with `public: false` for sensitive assets, or public CDN with read-only direct access. Direct script execution (`.php`, `.html`, `.svg` with scripts) is stripped or forced to download with `Content-Disposition: attachment`.

---

## 8. Rate Limiting & DDoS Defense

- **Public Storefront Ingress:** Cloudflare rate-limiting rules protecting against bot traffic.
- **Authentication Routes (`/api/v1/auth/*`):** 5 failed attempts per IP per 15 minutes.
- **Checkout Initialization (`/api/v1/storefront/checkout/initialize`):** Max 10 calls per IP per minute to prevent inventory exhaustion attacks.
- **AI Generation Routes (`/api/v1/ai/*`):** Rate-limited per store (Starter: 5 req/min, Business: 20 req/min) alongside monthly plan quotas.

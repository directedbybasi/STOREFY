# PHASE 6 — PRODUCTS & CATALOG IMPLEMENTATION SPECIFICATION

## Overview
Phase 6 establishes the canonical, high-performance **Products & Catalog Engine** for STOREFY. The architecture follows a strict tenant hierarchy:
$$\text{Merchant} \longrightarrow \text{Organization} \longrightarrow \text{Store} \longrightarrow \text{Catalog (Products, Variants, Images, Categories, Collections)}$$

The public customer-facing storefront accesses catalog items via:
$$\text{Store Domain / Subdomain} \longrightarrow \text{Active Catalog} \longrightarrow \text{Product Listing / Collections} \longrightarrow \text{Product Detail (PDP)}$$

---

## 1. Database Architecture & Monetary Precision

All catalog tables are defined via Drizzle ORM in `src/database/schema/` and migrated via Drizzle migration `0004_noisy_blacklash.sql` to hosted Supabase PostgreSQL.

### Financial Precision (Paise)
- **Zero Floating-Point Invariant:** All currency amounts (`basePrice`, `compareAtPrice`, `costPrice`, variant `price`, etc.) are persisted strictly as `BIGINT` in **Paise** (1 INR = 100 Paise).
- **Utility Conversions:** Helper functions `rupeesToPaise`, `paiseToRupees`, and `formatINR` in `src/modules/catalog/validation.ts` safely handle user inputs and formatting without precision loss.

### Core Tables
1. **`products`**:
   - `id`: UUID primary key.
   - `storeId`: Foreign key to `stores.id` with `onDelete: cascade`.
   - `source`: Enum (`MERCHANT`, `PLATFORM_SUPPLIER`, `MEESHO`).
   - `fulfillmentType`: Enum (`MERCHANT`, `PLATFORM_DROPSHIP`, `MEESHO_RESELLING`).
   - `title`: Product name (varchar 500).
   - `slug`: Lowercase URL-safe handle unique per store (`idx_products_store_slug`).
   - `basePrice`: `bigint` in Paise.
   - `compareAtPrice`: `bigint` in Paise.
   - `costPrice`: `bigint` in Paise.
   - `status`: `DRAFT`, `ACTIVE`, `ARCHIVED`.
   - `categoryId`: Foreign key to `categories.id` (`onDelete: set null`).
   - `tags`: JSONB string array.
   - `seoTitle`, `seoDescription`: SEO fields.
2. **`product_variants`**:
   - Multi-attribute variant matrix supporting options like Color, Size, Material (`option1`, `option2`, `option3`).
   - `sku`, `barcode`, `price` (in Paise), `compareAtPrice`, `costPrice`.
   - `isActive`, `sortOrder`.
3. **`product_images`**:
   - `storagePath`: Scoped to `stores/{storeId}/products/{productId}/...` in Supabase Storage.
   - `imageUrl`: Public HTTPS URL.
   - `sortOrder`: Defines primary image (sortOrder 0).
   - `altText`: Accessibility text.
4. **`categories`**:
   - Self-referencing hierarchical tree (`parentId` referencing `categories.id`).
   - Scoped per store with store-unique slug (`idx_categories_store_slug`).
5. **`collections` & `product_collections`**:
   - Curated product groupings with many-to-many join table `product_collections`.

---

## 2. Product Variants & Matrix Generation
- The variant generator (`src/modules/catalog/variants.actions.ts`) accepts dimension options (e.g. Size: S, M, L $\times$ Color: Black, White) and computes the Cartesian product ($3 \times 2 = 6$ variants).
- **Duplicate Prevention:** Hash set checks prevent identical option combinations.
- Generates structured SKU suffixes (e.g., `BASE-SKU-BLA-S`).

---

## 3. Image Storage Integration (Supabase Storage)
- Real storage uploads integrate directly with Supabase Storage bucket `store-media`.
- **Validation:**
  - MIME types restricted to: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
  - Max file size: 5MB per image.
  - Paths strictly tenant-namespaced: `stores/${storeId}/products/${productId}/${timestamp}-${random}.${ext}`.
- Deletions remove both database records and storage objects.

---

## 4. Hierarchical Categories & Cycle Prevention
- Recursive category management allows nesting:
  $$\text{Parent} \longrightarrow \text{Child} \longrightarrow \text{Grandchild}$$
- **Loop Prevention Algorithm:** Before modifying a category's `parentId`, `isDescendant()` traverses the parent chain to guarantee that the target parent is not a descendant of the category being edited.
- Deletion reassigns children to the parent node, preventing orphan records.

---

## 5. Bulk Operations
- Guarded server action `bulkProductAction` supports:
  - `PUBLISH` (requires `catalog:publish`)
  - `UNPUBLISH` (requires `catalog:write`)
  - `ARCHIVE` (requires `catalog:write`)
  - `DELETE` (requires `catalog:delete`)
  - `SET_CATEGORY` (requires `catalog:write`)
  - `ADD_TO_COLLECTION` (requires `catalog:write`)
- **Strict Boundary Guarantee:** Even if foreign IDs are passed, the query enforces:
  `WHERE store_id = ctx.store.id AND id IN (...)`
  Only rows belonging to the active tenant store are affected.

---

## 6. CSV Import / Export
- **Export:** Generates RFC 4180-compliant CSV containing title, slug, prices, SKU, status, category, variant options, and primary images.
- **Import:**
  - Validates required headers (`Title`, `Price`).
  - Row-by-row Zod schema validation (`ProductCsvRowSchema`).
  - Aggregates row-level errors (`Row 3: Price must be a valid number`).
  - Aborts commit if any row is invalid to prevent partial database corruption.

---

## 7. Merchant Dashboard UI
- `/dashboard/products`: Interactive product catalog table with live search, status tabs (`All`, `Active`, `Draft`, `Archived`), category & collection dropdowns, sorting, server pagination, floating bulk action bar, CSV export, and CSV import modal.
- `/dashboard/products/new`: Production-grade creation form with sections for basic information, description, media gallery, pricing in Rupees (with profit margin display), multi-variant matrix generator, category/collection pickers, SEO preview, and draft/active status selector.
- `/dashboard/products/[id]`: Comprehensive product editor.
- `/dashboard/products/categories`: Hierarchical category visualizer and editor.
- `/dashboard/products/collections`: Curated collections manager with product picker.

---

## 8. Public Storefront PDP & Collections
- `/products`: Real active store catalog listing with category filter pills, sorting, and responsive product cards with Paise-to-Rupees formatting.
- `/products/[handle]`: Store-scoped PDP resolving product by `domain -> store.id + handle + status='ACTIVE'`. Features image gallery thumbnail switcher, dynamic variant option selector, live price & discount calculation, availability indicator, and honest Add to Cart / Buy Now hooks indicating Phase 7 checkout activation.
- `/collections`: Overview of active store collections.
- `/collections/[handle]`: Hero collection banner and assigned product grid.

---

## 9. Storefront Theme & Customizer Compatibility
- `SectionRenderer` (`src/components/storefront/sections/section-renderer.tsx`) dynamic catalog bindings updated.
- Whitelist bindings in `src/modules/builder/bindings.ts` expanded for:
  - `{{ product.title }}`
  - `{{ product.description }}`
  - `{{ product.price }}`
  - `{{ product.comparePrice }}`
  - `{{ product.image }}`
  - `{{ product.handle }}`
  - `{{ collection.title }}`
  - `{{ collection.description }}`
  - `{{ collection.products }}`

---

## 10. Multi-Tenant Security & RBAC Guardrails
- **Zero Trust:** Every server action extracts tenant identity via `await requirePermission(...)` from verified session cookies. Client-provided `storeId` is never trusted.
- **Canonical Permissions:**
  - `catalog:read`: Required for viewing products, categories, collections.
  - `catalog:write`: Required for drafting, updating, reordering, and uploading media.
  - `catalog:publish`: Required for activating/publishing products.
  - `catalog:delete`: Required for permanent deletions.
- **Cross-Tenant Test Suite (`tests/unit/catalog-cross-tenant.test.ts`):**
  - Store A cannot read, update, or delete Store B's products.
  - Store A cannot read Store B's variants or images.
  - Store A cannot read Store B's categories or collections.
  - Store A cannot access Store B's product via `/products/[handle]` or direct ID.
  - Store A cannot bulk-edit Store B products.
  - Store A cannot upload files to Store B storage paths.
  - Store A cannot assign Store B products to its collections.

---

## 11. Verification Results
- **Unit & Integration Tests:** 26 test files passed, 186 tests passed (`npm test`).
- **Typecheck:** Clean pass, 0 errors (`npm run typecheck`).
- **ESLint:** Clean pass, 0 errors (`npm run lint`).
- **Production Build:** Clean pass, 23 static/dynamic routes compiled (`npm run build`).
- **Database Connection & Latency:** Clean pass (`npm run db:verify`).
- **Live Hosted DB Execution:** Verified end-to-end product, variant, image, category, and collection lifecycle against hosted Supabase PostgreSQL.

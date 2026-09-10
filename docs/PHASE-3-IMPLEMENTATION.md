# STOREFY — Phase 3: Merchant Dashboard Shell Implementation

**Document Version:** 1.0.0  
**Phase:** 3 — Merchant Dashboard Shell  
**Status:** Completed & Verified  
**Date:** September 2026  
**Infrastructure Target:** Hosted Supabase PostgreSQL (`zhnbddfxwqqtpkwuqlrp`), Supabase Auth, Vercel Preview  

---

## 1. Executive Summary

Phase 3 establishes the complete, production-quality merchant dashboard shell for STOREFY. The dashboard delivers a responsive, accessible, permission-aware application shell designed according to Shopify-quality design standards and zero-trust multi-tenant isolation.

### Architectural Flow:
$$\text{Authenticated User} \longrightarrow \text{Organization} \longrightarrow \text{Active Store} \longrightarrow \text{Dashboard Shell} \longrightarrow \text{Store-Scoped Modules}$$

---

## 2. Dashboard Layout & Shell Architecture

### 2.1 Server Component Parent Layout (`src/app/(dashboard)/layout.tsx`)
- Server-side execution ensuring that every request to `/dashboard/*` is authenticated and authorized via `getTenantContext()`.
- Queries the hosted Supabase PostgreSQL instance to retrieve all stores in the organization that the user is authorized to access (`staff` table join `stores`).
- Injects `TenantContext` and `AuthorizedStoreItem[]` into the client shell wrapper.

### 2.2 Client Shell Wrapper (`src/components/dashboard/dashboard-shell.tsx`)
- Manages desktop sidebar state (collapsed vs expanded).
- Manages mobile slide-over drawer state using accessible Radix `Sheet`.
- Encapsulates `DashboardProvider` exposing `useDashboard()` and `<Can>` permission guard primitives.

### 2.3 Collapsible Merchant Sidebar (`src/components/dashboard/dashboard-sidebar.tsx`)
- Permission-aware navigation groups:
  - **Overview**: `/dashboard`
  - **Catalog**: `/dashboard/products` (`catalog:read` - Phase 4)
  - **Orders**: `/dashboard/orders` (`orders:read` - Phase 6)
  - **Customers**: `/dashboard/customers` (`customers:read` - Phase 7)
  - **Analytics**: `/dashboard/analytics` (`analytics:view` - Phase 11)
  - **Marketing**: `/dashboard/marketing` (`marketing:read` - Phase 10)
  - **Settings & Operations**:
    - Store Settings: `/dashboard/settings` (`settings:read`)
    - Custom Domains: `/dashboard/settings/domains` (`domains:manage`)
    - Staff & RBAC: `/dashboard/settings/staff` (`staff:read`)
- Active route highlighting matching current URL path.
- Collapsed mode for desktop with compact icons and hover tooltips.
- Live storefront preview link targeting `https://[subdomain].storefy.shop`.

### 2.4 Dashboard Header (`src/components/dashboard/dashboard-header.tsx`)
- Responsive top bar with mobile menu trigger and desktop breadcrumb hierarchy.
- Integrated multi-store switcher.
- Notifications entry point.
- Accessible User Menu with initials avatar, active role badge (`OWNER`, etc.), quick links, and real Supabase Auth `signOutAction`.

---

## 3. Multi-Store Switcher

### 3.1 Security & Zero-Trust Verification (`src/modules/stores/actions.ts`)
- Changing active store in UI invokes `switchStoreAction(targetStoreId)`.
- **CRITICAL ZERO-TRUST INVARIANT:** The server independently queries the hosted database to verify that the authenticated user possesses an active staff record granting membership to `targetStoreId` in the organization (`staff.userId = auth.uid()` AND `staff.organizationId = targetStore.organizationId` AND `staff.isActive = true`).
- Forged store IDs or attempts to switch to another merchant's store are rejected with `ForbiddenError` (403).
- On success, sets `storefy_active_store_id` cookie and triggers server revalidation.

---

## 4. Real Store Settings Engine

### 4.1 Persistence & Validation (`src/app/(dashboard)/dashboard/settings/`)
- Guarded by `requirePermission("settings:read")` for viewing and `requirePermission("settings:manage")` for mutations.
- Tabbed interface (`General`, `WhatsApp`, `Payments & COD`, `Invoicing`).
- Persists directly to hosted Supabase PostgreSQL tables:
  - `stores`: `name`, `slug`, `currency`, `timezone`, `isActive`, `logoUrl`.
  - `store_settings`: `whatsappOrderPhone`, `whatsappOrderEnabled`, `whatsappSupportPhone`, `whatsappSupportEnabled`, `codEnabled`, `codMinAmount` (paise), `codMaxAmount` (paise), `taxInclusive`, `orderIdPrefix`, `invoicePrefix`.
- Server Action `updateStoreSettingsAction` validated with strict Zod schema.

---

## 5. Domain Management

### 5.1 Custom Domain Lifecycle (`src/app/(dashboard)/dashboard/settings/domains/`)
- Guarded by `requirePermission("domains:manage")`.
- Displays default platform subdomain (`brand.storefy.shop`) with active SSL indicator.
- Lists custom domains from `store_domains` table with SSL status (`PENDING`, `ACTIVE`, `FAILED`), verification challenge token, and primary indicator.
- Actions:
  - `addStoreDomainAction`: registers new domain with verification token.
  - `setPrimaryDomainAction`: assigns primary storefront domain.
  - `removeStoreDomainAction`: removes domain mapping.
- Provides DNS CNAME and TXT record setup instructions.

---

## 6. Staff Management & Granular RBAC

### 6.1 Team Collaboration Directory (`src/app/(dashboard)/dashboard/settings/staff/`)
- Guarded by `requirePermission("staff:read")` for view and `requirePermission("staff:manage")` for actions.
- Lists all organization staff members with email, full name, assigned role, scope, and active/inactive status.
- Actions:
  - `inviteStaffAction`: invites team members with selected role.
  - `updateStaffRoleAction`: updates assigned role.
  - `toggleStaffActiveAction`: deactivates or reactivates team members.
- **Privilege Escalation Invariant:** Only an `OWNER` can grant or modify the `OWNER` role. Staff members cannot modify their own role or deactivate themselves.

---

## 7. Commerce Module Preparation Shells

Honest preparation shells implemented for future roadmap phases with active permission checks:
- `/dashboard/products` (Phase 4 Products & Catalog — `catalog:read`)
- `/dashboard/orders` (Phase 6 Orders & Fulfillment — `orders:read`)
- `/dashboard/customers` (Phase 7 Customers & CRM — `customers:read`)
- `/dashboard/analytics` (Phase 11 Analytics & Intelligence — `analytics:view`)
- `/dashboard/marketing` (Phase 10 Marketing & Coupons — `marketing:read`)

---

## 8. Verification & Test Suite

### 8.1 Automated Unit & Security Tests
Total suite: **85 tests passing cleanly across 12 test files**:
- `tests/unit/store-switcher.test.ts` (6 tests): verifies authorized switching, cross-tenant switch prevention, forged ID rejection, and org-wide staff switching.
- `tests/unit/store-settings.test.ts` (6 tests): verifies settings schema validation and role permission enforcement.
- `tests/unit/staff-management.test.ts` (6 tests): verifies staff invitation, privilege escalation prevention, self-deactivation prevention, and role boundaries.
- `tests/unit/dashboard-permissions.test.ts` (6 tests): verifies navigation item filtering per role.
- Phase 2 baseline suites (61 tests): RBAC, domain resolution, auth validation, env, and cross-tenant isolation.

---

## 9. Verification Commands & Results

| Check | Command | Status |
| :--- | :--- | :--- |
| **Unit & Security Tests** | `npm test` | **85/85 Passed** |
| **TypeScript Strictness** | `npm run typecheck` | **0 Errors (`tsc --noEmit`)** |
| **Code Quality & Linting** | `npm run lint` | **0 Errors, 0 Warnings** |
| **Production Build** | `npm run build` | **Clean compilation across all routes** |
| **Database Connectivity** | `npm run db:verify` | **Connected to Hosted Supabase** |

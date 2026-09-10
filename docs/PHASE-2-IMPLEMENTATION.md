# STOREFY — Phase 2: Authentication & Multi-Tenancy Implementation

**Document Version:** 1.0.0  
**Phase:** 2 — Authentication and Multi-Tenancy  
**Status:** Completed & Verified  
**Date:** September 2026  
**Infrastructure Target:** Hosted Supabase PostgreSQL (`zhnbddfxwqqtpkwuqlrp`), Supabase Auth, Vercel Preview  

---

## 1. Executive Summary

Phase 2 establishes the secure multi-tenant core and authentication pipeline for the STOREFY e-commerce platform. Building upon the Phase 1 infrastructure, Phase 2 implements end-to-end multi-tenant isolation, Supabase Auth integration, PostgreSQL Row Level Security (RLS), Role-Based Access Control (RBAC), host-based tenant resolution middleware, zero-trust server tenant context validation, production merchant onboarding, and an automated verification test suite.

### The Canonical Multi-Tenant Relationship
$$\text{User} \longrightarrow \text{Organization} \longrightarrow \text{Multiple Stores} \longrightarrow \text{Store Domains} \longrightarrow \text{Staff} \longrightarrow \text{Roles} \longrightarrow \text{Permissions}$$

---

## 2. Authentication Architecture

### 2.1 Identity Provider & Token Transport
- **Engine:** Supabase Auth (GoTrue) hosted on the development project (`zhnbddfxwqqtpkwuqlrp`).
- **Token Transport:** HTTP-only, `SameSite=Lax`, `Secure` encrypted session cookies managed through `@supabase/ssr`.
- **Session Refresh:** Automatic access token rotation in `src/middleware.ts` via `supabase.auth.getUser()`.
- **Zero-Trust Rule:** The browser client is strictly restricted to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The privileged `SUPABASE_SERVICE_ROLE_KEY` is loaded exclusively within `src/lib/supabase/admin.ts` guarded by `import "server-only"`.

### 2.2 Auth Server Actions (`src/modules/auth/actions.ts`)
1. **`signUpAction`**:
   - Validates user input (`email`, `password`, `fullName`, `storeName`, `subdomain`) via strict Zod schemas.
   - Enforces password complexity (minimum 8 characters, uppercase letter, number).
   - Validates subdomain availability and blocks 16 reserved system subdomains (`admin`, `api`, `app`, `storefy`, `dashboard`, etc.).
   - Registers user in Supabase Auth.
   - Idempotently ensures record in `public.users`.
   - Provisions `organizations` record, initial `stores` record, default `store_settings`, and assigns the user as `OWNER` in the `staff` table.
   - Sets secure cookie `storefy_active_store_id`.
2. **`signInAction`**:
   - Authenticates credentials against Supabase Auth.
   - Resolves merchant's active store and sets session cookies.
3. **`signOutAction`**:
   - Terminates Supabase Auth session, removes active store cookies, and redirects to `/login`.
4. **`requestPasswordResetAction`**:
   - Dispatches secure recovery token to merchant email.
5. **`updatePasswordAction`**:
   - Updates password during authenticated recovery session.

---

## 3. Database Layer: Domain 1 Schemas

All Domain 1 schemas from `DATABASE-SPECIFICATION.md` are implemented in `src/database/schema/`:

| Table Name | Description | Key Constraints & Indexes |
| :--- | :--- | :--- |
| `users` | Synced with `auth.users` | UUID PK, Unique `email`, Index on `email` |
| `organizations` | Merchant legal tenant entity | UUID PK, Unique `slug`, Index on `slug` |
| `stores` | Individual storefronts operated by an org | UUID PK, FK `organization_id` (CASCADE), Unique `slug`, Unique `subdomain`, Unique `custom_domain` |
| `store_settings` | Operational parameters, COD, WhatsApp | UUID PK references `stores(id)` (CASCADE) |
| `store_domains` | Custom domain lifecycle, SSL status | UUID PK, FK `store_id` (CASCADE), Unique `domain`, Index on `domain` |
| `roles` | Module access control roles | UUID PK, Unique `name` (Pre-seeded: OWNER, ADMIN, MANAGER, PRODUCT_MANAGER, ORDER_MANAGER, MARKETING_MANAGER, SUPPORT) |
| `permissions` | Granular module action codes | UUID PK, Unique `code`, Index on `code` and `module` |
| `role_permissions` | Role-to-permission mapping | Composite PK `(role_id, permission_id)`, FKs with CASCADE |
| `staff` | Org/store team membership and role | UUID PK, Unique `(organization_id, user_id, store_id)`, Indexes on `organization_id`, `user_id`, `store_id`, `role_id` |

---

## 4. PostgreSQL Row Level Security (RLS) Architecture

Row Level Security is enabled on every tenant-owned table in migration `0001_damp_spacker_dave.sql`:

1. **`users`**:
   - `SELECT`: `(SELECT auth.uid()) = id OR is_platform_admin = true`
   - `UPDATE/INSERT`: `(SELECT auth.uid()) = id`
2. **`organizations`**:
   - `SELECT`: `EXISTS (SELECT 1 FROM staff WHERE staff.organization_id = organizations.id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true)`
   - `UPDATE`: Staff holding `OWNER` or `ADMIN` roles.
3. **`stores`**:
   - `SELECT`: Staff of the organization where `staff.store_id IS NULL OR staff.store_id = stores.id`. Public storefront access via `anon` policy where `is_active = true`.
   - `INSERT/UPDATE/DELETE`: Restricted to `OWNER`/`ADMIN` staff.
4. **`store_settings` & `store_domains`**:
   - Restricted to staff associated with the parent store; public domain resolution permitted for active storefront routing.
5. **`staff`**:
   - `SELECT`: Active staff within the same organization.
   - `MUTATIONS`: Restricted to `OWNER` and `ADMIN` roles.
6. **`roles` & `permissions`**:
   - `SELECT`: Authenticated users can read. Mutations restricted to platform service role.

---

## 5. Host-Based Tenant Resolution Middleware (`src/middleware.ts`)

Edge middleware performs:
1. **Hostname Normalization**: Lowercases hostname, strips port numbers (e.g. `:3000`), and removes trailing dots.
2. **Session Refresh**: Synchronizes `@supabase/ssr` cookies on every incoming request.
3. **Route Classification & Protection**:
   - Unauthenticated requests to `/dashboard/*` are redirected to `/login?redirectTo=...`.
   - Authenticated users requesting `/login` or `/register` are redirected to `/dashboard`.
4. **Security Response Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 6. Server Tenant Context & Zero-Trust RBAC

### 6.1 `getTenantContext(targetStoreId?: string)`
Located in `src/core/tenant/context.ts`:
- Authenticates session via `supabase.auth.getUser()`.
- Resolves requested store ID from argument, header `x-store-id`, or active store cookie.
- **CRITICAL INVARIANT:** Queries the hosted PostgreSQL `staff` table to independently verify that `user.id` has an active membership in the organization and store. If no membership exists, throws `ForbiddenError` (403).
- Resolves assigned role and compiles granular `Set<string>` of permission codes.

### 6.2 `requirePermission(permissionCode: string, targetStoreId?: string)`
Located in `src/core/tenant/rbac.ts`:
- Resolves `TenantContext`.
- Unconditionally permits platform superadmins and organization `OWNER`s.
- Verifies that `ctx.permissions.has(permissionCode)`.
- Rejects unauthorized actions with `ForbiddenError`.

---

## 7. Production-Grade Auth UI & Dashboard Shell

Implemented with Tailwind CSS and shadcn/ui components:
- `src/app/(auth)/layout.tsx`: Centered responsive card layout with radial glow backdrop and STOREFY brand typography.
- `src/app/(auth)/login/page.tsx`: Sign-in screen with email/password validation, loading spinner states, and error alerts.
- `src/app/(auth)/register/page.tsx`: Merchant onboarding wizard with live subdomain preview (`[name].storefy.shop`) and instant validation.
- `src/app/(auth)/forgot-password/page.tsx`: Recovery dispatch form with confirmation state.
- `src/app/(auth)/reset-password/page.tsx`: Password update form with confirmation and automatic redirect.
- `src/app/(dashboard)/dashboard/page.tsx`: Protected dashboard landing page displaying tenant metadata, active store, role badges, and sign out control.

---

## 8. Verification & Test Suite

### 8.1 Automated Unit & Cross-Tenant Security Tests
- `tests/unit/auth-validation.test.ts` (8 tests)
- `tests/unit/domain-resolution.test.ts` (8 tests)
- `tests/unit/rbac.test.ts` (7 tests)
- `tests/unit/cross-tenant-isolation.test.ts` (9 tests)
- Total Suite: **55 tests passing cleanly**.

### 8.2 Proving the Critical Cross-Tenant Invariant
`tests/unit/cross-tenant-isolation.test.ts` validates:
1. **Direct Read Isolation:** Merchant A cannot read Store B records (throws `ForbiddenError`).
2. **Forged Header Immunity:** Transmitting `x-store-id: store-b-id` while logged in as Merchant A is rejected by the server validator.
3. **URL Manipulation Immunity:** Changing store IDs in API URLs or route parameters triggers immediate authorization failure.
4. **Domain Spoofing Immunity:** Accessing Store B's subdomain while holding Merchant A's session is rejected.
5. **Privilege Escalation Protection:** Horizontal cross-org escalation and vertical in-store role escalation (e.g. `SUPPORT` attempting `catalog:write`) are strictly prevented.
6. **Deactivation Invariant:** Deactivated staff members are immediately denied all access.

---

## 9. Verification Commands & Results

| Check | Command | Status |
| :--- | :--- | :--- |
| **Unit & Security Tests** | `npm test` | **55/55 Passed** |
| **TypeScript Compilation** | `npm run typecheck` | **0 Errors (`tsc --noEmit`)** |
| **Code Quality & Linting** | `npm run lint` | **0 Errors, 0 Warnings (`eslint .`)** |
| **Production Build** | `npm run build` | **Completed Cleanly (`next build`)** |
| **Database Migration** | `npm run db:migrate` | **Applied to Hosted Supabase** |
| **Database Verification** | `npm run db:verify` | **Connected in 1294ms** |

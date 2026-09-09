# STOREFY — Phase 1 Implementation Documentation

**Document Version:** 1.0.0  
**Phase:** 1 — Infrastructure & Project Foundation  
**Status:** Completed & Verified

---

## 1. Overview & Architecture

Phase 1 establishes the production-grade technical foundation for the STOREFY multi-tenant e-commerce platform. It enforces a **Hosted-First Development Architecture**, integrating Next.js 15, strict TypeScript, Tailwind CSS, shadcn/ui design tokens, Drizzle ORM, hosted Supabase clients (Auth, PostgreSQL, Storage), structured logging, and RFC 7807 error formatting.

### Core Foundation Invariants Implemented

- **Zero Local Database Prerequisites:** Development operates against hosted Supabase Development instances (`storefy-dev`) from Phase 1 onward. Local PostgreSQL, local Supabase, and Docker Compose are not required for primary development.
- **Separation of Secrets:** Public variables (`NEXT_PUBLIC_*`), server-only runtime secrets (`DATABASE_URL`, `ENCRYPTION_MASTER_KEY`), and privileged service-role credentials (`SUPABASE_SERVICE_ROLE_KEY`) are enforced via Zod schema barriers and Next.js `server-only` import guards.
- **19 Domain Boundaries:** Scaffolded modular boundaries for all 19 domain subsystems without premature business logic.

---

## 2. Installed Dependencies

### Production Dependencies

| Package                    | Version             | Purpose                                                                        |
| :------------------------- | :------------------ | :----------------------------------------------------------------------------- |
| `next`                     | `^15.2.1`           | React App Router framework, server actions, route handlers, edge middleware.   |
| `react` / `react-dom`      | `^19.0.0`           | React 19 core library.                                                         |
| `drizzle-orm`              | `^0.40.0`           | Type-safe SQL query builder and ORM for PostgreSQL.                            |
| `postgres`                 | `^3.4.5`            | High-performance PostgreSQL driver for pooled runtime connections.             |
| `@supabase/supabase-js`    | `^2.49.1`           | Supabase JavaScript client for Auth, Database, and Storage.                    |
| `@supabase/ssr`            | `^0.5.2`            | Supabase SSR cookie-based authentication integration for Next.js.              |
| `zod`                      | `^3.24.2`           | TypeScript-first schema declaration and validation library.                    |
| `lucide-react`             | `^0.475.0`          | Feather-derived icons for dashboard and storefront components.                 |
| `clsx` / `tailwind-merge`  | `^2.1.1` / `^3.0.2` | Conditional class joining and Tailwind CSS class conflict resolution (`cn`).   |
| `class-variance-authority` | `^0.7.1`            | Component variant styling for shadcn/ui primitives.                            |
| `@radix-ui/react-*`        | Latest              | Accessible headless UI primitives (Dialog, Tabs, Label, Slot, Tooltip).        |
| `sanitize-html`            | `^2.14.0`           | Server-side rich text and HTML sanitization.                                   |
| `server-only`              | `^0.0.1`            | Build-time barrier preventing server secrets from leaking into client bundles. |

### Development Dependencies

| Package                         | Version   | Purpose                                                         |
| :------------------------------ | :-------- | :-------------------------------------------------------------- |
| `typescript`                    | `^5.7.3`  | TypeScript compiler in strict mode (`"strict": true`).          |
| `tailwindcss`                   | `^3.4.17` | Utility-first CSS framework with CSS custom property tokens.    |
| `postcss` / `autoprefixer`      | Latest    | CSS processing pipeline.                                        |
| `drizzle-kit`                   | `^0.30.4` | CLI migration generator and schema management tool for Drizzle. |
| `vitest`                        | `^3.0.5`  | Fast Vite-native unit and integration test runner.              |
| `@playwright/test`              | `^1.50.1` | End-to-end browser automation and smoke testing.                |
| `eslint` / `eslint-config-next` | Latest    | Next.js and TypeScript linting.                                 |
| `prettier`                      | `^3.5.1`  | Code formatting.                                                |
| `dotenv`                        | `^16.4.7` | Environment variable loader for external CLI scripts.           |

---

## 3. Environment Variables & Secret Configuration

The platform defines four environment configuration files:

- `.env.example`: Public template with variable definitions and zero real secrets (committed to git).
- `.env.development`: Development configuration for hosted Supabase Development (gitignored).
- `.env.staging`: Staging environment template for staging deployments (gitignored).
- `.env.production`: Production environment template for live deployments (gitignored).

### Required Environment Variables

```bash
# Application Environment
NODE_ENV=development                       # development | test | production
NEXT_PUBLIC_APP_ENV=development            # development | staging | production
NEXT_PUBLIC_APP_URL=https://dev.storefy.shop
NEXT_PUBLIC_ROOT_DOMAIN=storefy.shop

# Hosted Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Hosted Supabase (Server-Only Secret)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Hosted PostgreSQL Database (Server-Only)
DATABASE_URL=postgres://postgres.[ref]:[pass]@[pooler-host]:6543/postgres?pgbouncer=true
DIRECT_URL=postgres://postgres.[ref]:[pass]@[pooler-host]:5432/postgres

# Cryptographic Master Key (Server-Only)
ENCRYPTION_MASTER_KEY=[64-character-hex-string-32-bytes]
```

Centralized validation is enforced at runtime by [`src/core/config/env.ts`](file:///c:/atigravity/STOREFY/src/core/config/env.ts).

---

## 4. Supabase Client Architecture

To ensure security and prevent secret leakage:

1. **Browser Client (`src/lib/supabase/client.ts`):**  
   Initializes via `createBrowserClient` from `@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Server Client (`src/lib/supabase/server.ts`):**  
   Initializes via `createServerClient` from `@supabase/ssr` with Next.js `cookies()` store for server components and route handlers.
3. **Privileged Admin Client (`src/lib/supabase/admin.ts`):**  
   Protected with `import "server-only";`. Strictly uses `SUPABASE_SERVICE_ROLE_KEY` to perform administrative operations bypassing RLS. Throws build errors if imported into client components.

---

## 5. Database & Migration System

- **Pooled Runtime Connection (`src/database/client.ts`):**  
  Uses `postgres` driver with `prepare: false` configured for Supabase PgBouncer/Supavisor transaction pooling (port 6543).
- **Direct Migration Connection (`src/database/migrate.ts`):**  
  Uses direct PostgreSQL port (5432) via `DIRECT_URL` to execute DDL migrations safely.
- **Schema Definitions (`src/database/schema/`):**  
  Includes baseline `systemHealth` schema in `system.ts`, aggregated through `index.ts`.
- **Drizzle Configuration (`drizzle.config.ts`):**  
  Targets `src/database/schema/index.ts` and outputs version-controlled SQL files to `src/database/migrations/`.

### Migration Workflow Commands

- Generate new SQL migrations from schema changes:
  ```bash
  npm run db:generate
  ```
- Execute pending migrations on hosted database:
  ```bash
  npm run db:migrate
  ```
- Push schema directly for rapid development prototyping:
  ```bash
  npm run db:push
  ```

---

## 6. Global Systems: Error Handling, Logging, Validation & API

- **RFC 7807 Error System (`src/core/errors/index.ts`):**  
  Structured `AppError` class hierarchy with specialized domain errors (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InsufficientStockError`, `PlanEntitlementError`).
- **Structured Logger (`src/core/logger/index.ts`):**  
  Safe JSON logger with automatic recursive redaction of sensitive credentials (`password`, `token`, `secret`, `authorization`, `cookie`, `key_secret`).
- **Reusable Zod Validators (`src/lib/validators/index.ts`):**  
  Standardized schemas for UUID, email, phone (Indian/E.164), slug, URL, Paise currency amounts, and pagination.
- **Standardized API Responses (`src/core/api/response.ts`):**  
  Standard success envelope (`{ success: true, data }`) and RFC 7807 error envelope (`{ success: false, error: { code, message, details, timestamp, traceId } }`).
- **Health Probe Endpoint (`src/app/api/v1/health/route.ts`):**  
  Live endpoint returning system status, platform metadata, and service readiness.

---

## 7. Deployment & Git Workflow

### Git Repository Setup

- Initialized local repository: `git init`.
- Configured `.gitignore` to strictly exclude all environment secret files (`.env.development`, `.env.staging`, `.env.production`), `node_modules/`, and `.next/`.

### Hosted Vercel + GitHub Pipeline

1. Push local repository to GitHub.
2. Link GitHub repository to Vercel project (`storefy`).
3. In Vercel Project Settings $\rightarrow$ Environment Variables, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `ENCRYPTION_MASTER_KEY`
4. Deployments trigger automatically on push to target branches (`develop` $\rightarrow$ Development, `staging` $\rightarrow$ Staging, `main` $\rightarrow$ Production).

---

## 8. Known Limitations in Phase 1

As explicitly specified in Phase 1 constraints:

- Merchant authentication UI, store registration, dashboard views, and customer storefront templates are deliberately excluded and will be implemented systematically beginning in Phase 2.
- Live database migrations require populating real hosted Supabase project credentials in `.env.development`.

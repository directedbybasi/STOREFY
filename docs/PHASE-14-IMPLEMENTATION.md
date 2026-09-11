# Phase 14 — AI Product Intelligence Tools Implementation

## Executive Summary
Phase 14 introduces **STOREFY AI Product Intelligence Tools**, an assistive, enterprise-grade AI system engineered strictly around seven approved product-intelligence tools. The architecture guarantees tenant isolation, prompt injection defense, strict output schema validation, output sanitization, sliding-window rate limiting, and explicit merchant-in-the-loop review.

Under no circumstances does the AI act as an autonomous authority or write directly to production catalogs without explicit merchant verification.

---

## 1. The Seven Approved AI Product Intelligence Tools
STOREFY strictly enforces a whitelist of exactly seven AI tools. All other AI tasks (image generation, chatbots, pricing assistants, reviews, code generators, etc.) are blocked at the schema and route levels.

| # | Tool Identifier | Scope / Objective | Input Data | Output Structure & Safety |
|---|---|---|---|---|
| 1 | `AI_PRODUCT_TITLE` | High-converting, factual product titles | Title, brand, category, attributes, merchant context | 3 distinct suggestions; emojis/hallucinations disallowed |
| 2 | `AI_PRODUCT_DESCRIPTION` | Customer-facing structured descriptions | Title, specs, features, variants, category | Summary, paragraphs, bullet points; unsupported medical/spec claims stripped |
| 3 | `AI_SEO_DESCRIPTION` | Search-engine meta descriptions (under 160 chars) | Title, factual description, category | Concise, non-spammy snippet; no keyword stuffing |
| 4 | `AI_PRODUCT_FEATURES` | Structured key product feature highlights | Verified specifications and descriptions | List of verified feature claims; no fabricated specs |
| 5 | `AI_PRODUCT_SPECIFICATIONS` | Key-value technical specifications with confidence tags | Factual product data | Confidence levels: `SUPPORTED`, `INFERRED`, `UNKNOWN` (missing attributes are returned as `UNKNOWN`, never invented) |
| 6 | `AI_PRODUCT_TAGS` | Search & categorization tags | Category, features, title | 5–15 clean, deduplicated, lower-case tags |
| 7 | `AI_CATEGORY_SUGGESTION` | Existing store category hierarchy mapping | Title, attributes, existing store category tree | Strictly maps to existing store `category_id` or `NO_CONFIDENT_MATCH` |

---

## 2. Core Architecture & Provider Abstraction

```
Merchant Dashboard / Product Form
         ↓
  Server Action / API (/api/v1/ai/generate)
         ↓
  RBAC (ai:generate / product:write) & Tenant Isolation (storeId)
         ↓
  Sliding Window Rate Limiter (15 req/min) & Quota Service (150 req/day)
         ↓
  Prompt Injection Sanitizer & Delimiter Wrapping
         ↓
  AIProvider Interface (MockAIProvider / GeminiAIProvider)
         ↓
  Raw Model Response (JSON)
         ↓
  Zod Schema Validation & HTML Sanitization
         ↓
  Safety & Claim Validation (Blacklist medical/guarantee claims, unverified specs)
         ↓
  Merchant Review Modal (Assistive UI with Confidence Indicators)
         ↓
  Explicit Merchant Apply (Optimistic Concurrency & Audit Ledger)
         ↓
  STOREFY Product Catalog
```

### Provider Neutrality (`AIProvider`)
- Implemented in `src/modules/ai/core/types.ts` and `src/modules/ai/core/provider.ts`.
- Abstracts providers behind `generateStructured<T>()`, `generateText()`, and `validateAvailability()`.
- Production driver: Google Gemini (`GeminiAIProvider`), configurable via `GEMINI_API_KEY` (server-side only).
- Testing driver: `MockAIProvider`, supporting deterministic responses, malformed JSON simulation, timeouts, provider error simulation, and rate-limit simulation without requiring external credentials.

---

## 3. Security & Safety Invariants

### 1. Server-Only AI Access & Zero Secret Leakage
- `GEMINI_API_KEY` and other provider secrets are strictly restricted to Node.js server environments (`process.env`).
- Never exposed in `NEXT_PUBLIC_` variables, client components, API responses, client telemetry, or server logs.

### 2. Prompt Injection Defense
- Untrusted user input (product titles, descriptions, supplier notes, Meesho marketplace details) is encapsulated inside strong structural delimiters:
  ```
  === BEGIN UNTRUSTED PRODUCT DATA ===
  ...
  === END UNTRUSTED PRODUCT DATA ===
  ```
- System prompts instruct the LLM to treat content within delimiters strictly as passive data and never follow procedural commands contained inside.

### 3. Output Sanitization & Safe Claims Validation
- All string outputs undergo `sanitize-html` stripping scripts, stylesheets, iframe tags, and event handlers.
- Medical guarantees ("cures cancer", "fda-approved cure", "miracle cure"), fake reviews ("5-star rated by 10,000 customers"), and fabricated guarantees are detected and flagged/rejected via `validateSafeClaims`.

### 4. Zero Specification Hallucination
- Tool 5 assigns confidence tags (`SUPPORTED`, `INFERRED`, `UNKNOWN`).
- If an attribute (e.g. weight, battery capacity, material) is not explicitly present in the input, the model returns `confidence: "UNKNOWN"`. Under no circumstances may missing fields be invented as supported facts.

### 5. Cross-Tenant Category Forgery Defense
- Tool 7 checks candidate category IDs against the requesting store's category hierarchy in PostgreSQL (`eq(categories.storeId, storeId)`).
- Categories belonging to other stores or arbitrary UUIDs are strictly rejected, falling back to `NO_CONFIDENT_MATCH`.

---

## 4. Usage Tracking, Quota & Rate Limiting

- **Rate Limiting**: Sliding window rate limiter capped at 15 requests per minute per store/tool.
- **Store Quotas**: Configurable daily quota (default 150 requests per store per day), tracked in `ai_usage_ledger`.
- **Duplicate Request Protection**: Identical requests made within 10 seconds return the recent generation result rather than re-querying the AI model.
- **Audit Logging**: Every AI invocation logs metadata to `ai_requests` with a unique `requestId`, store ID, user ID, tool name, provider, tokens, and status (`GENERATING`, `SUCCEEDED`, `FAILED`, `APPLIED`, `DISMISSED`). Prompts and customer sensitive data are not retained indefinitely.

---

## 5. UI & Merchant Experience

1. **Inline Product Form Integration**:
   - Integrated into `src/components/dashboard/products/product-form.tsx`.
   - Dedicated `✨ Generate with AI` buttons next to Title, Description, SEO Description, Features, Specifications, Tags, and Category.
2. **Interactive AI Assistant Modal**:
   - `src/components/dashboard/products/ai-assistant-modal.tsx`.
   - Offers real-time feedback: loading spinners, error retry, suggestion previews, confidence badges, clipboard copying, and single-click Apply.
   - Preserves merchant's work: suggestions are only applied upon clicking `Apply`.
3. **AI Intelligence Dashboard**:
   - `/dashboard/ai` (`src/app/(dashboard)/dashboard/ai/page.tsx`).
   - Displays daily request counts, success rates, monthly usage progress towards quota, and tool-by-tool distribution.
   - Added to the Merchant Dashboard sidebar (`src/components/dashboard/dashboard-sidebar.tsx`).

---

## 6. Verification & Test Coverage

- **AI Unit & Provider Suite** (`tests/unit/ai/ai-provider-and-tools.test.ts`): 11 tests verifying all 7 tools, fallback behaviors, and mock provider error states.
- **AI Security & Invariants Suite** (`tests/unit/ai/ai-security.test.ts`): 12 tests verifying:
  1. Cross-store product access rejection
  2. Credential exposure protection
  3. Prompt injection isolation
  4. Script and XSS sanitization
  5. Specification hallucination prevention
  6. Fake medical/certification claim rejection
  7. Cross-tenant category forgery rejection
  8. Unauthorized tool whitelist enforcement
  9. Unauthorized apply permission check
  10. Sliding window rate limiting
  11. Rapid duplicate request protection
  12. Tenant prompt data leakage prevention
- **Regression Suite**: All 46 test files and 362 tests across Phases 0–13 pass cleanly.

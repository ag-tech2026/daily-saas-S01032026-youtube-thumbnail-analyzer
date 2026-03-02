---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-youtube-thumbnail-analyzer-2026-03-01.md
  - _bmad-output/planning-artifacts/product-brief-youtube-thumbnail-analyzer-2026-03-01.md
  - _bmad-output/planning-artifacts/technical-research-youtube-thumbnail-analyzer-2026-03-01.md
  - _bmad-output/planning-artifacts/domain-research-youtube-thumbnail-analyzer-2026-03-01.md
  - _bmad-output/planning-artifacts/market-research-youtube-thumbnail-analyzer-2026-03-01.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-02'
project_name: 'daily-saas-S01032026-youtube-thumbnail-analyzer'
user_name: 'Ars'
date: '2026-03-02'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (7 total):**
- FR-001: Google OAuth 2.0 authentication (YouTube-linked)
- FR-002: Thumbnail analysis request (async job, polling)
- FR-003: Heuristic analysis engine → replaced by OpenRouter vision model (GPT-4o or similar)
- FR-004: Analysis history dashboard (grid, filter, CSV export)
- FR-005: Competitor benchmarking via YouTube Data API v3
- FR-006: Stripe Checkout subscription billing (freemium + paid)
- FR-007: Chrome Extension (Manifest V3) injected into YouTube Studio

**Non-Functional Requirements (architecture-shaping):**
- Analysis completion p99 <30s; API p99 <200ms
- 99.9% uptime; RTO <4h, RPO <1h
- OWASP Top 10; GDPR/CCPA; YouTube API ToS; Chrome Web Store policies; PCI DSS SAQ A
- Scalable to 10K users, 1K DAU

**Scale & Complexity:**
- Primary domain: Full-stack web (Next.js) + Chrome Extension
- Complexity level: Low-Medium (MVP greenfield, small team)
- Estimated architectural components: 6 (web dashboard, API routes, analysis engine via AI, YouTube integration, Stripe billing, Chrome Extension)

### Technical Constraints & Dependencies

- **Stack anchor:** Next.js 16 App Router + TypeScript + Drizzle/PostgreSQL + BetterAuth + Vercel AI SDK/OpenRouter — all decisions must remain compatible with this foundation
- **YouTube API:** 10K units/day default quota; OAuth 2.0 Authorization Code + PKCE for extension
- **Chrome Extension:** Manifest V3 (service worker, no persistent background pages); communicates with Next.js API routes
- **Stripe:** Checkout hosted flow (PCI DSS SAQ A); webhooks for subscription lifecycle
- **AI Analysis:** OpenRouter vision model replaces Python CLIP/OpenCV stack entirely for MVP

### Cross-Cutting Concerns Identified

- **Authentication:** Google OAuth (YouTube-scoped) via BetterAuth Google plugin — affects extension, dashboard, and API routes
- **File Storage:** Thumbnail images via existing `lib/storage.ts` abstraction (local dev → Vercel Blob in production)
- **Async Job Processing:** Analysis jobs are long-running (up to 30s) — requires job status tracking in DB + polling endpoint
- **YouTube API Quota:** Must be enforced centrally with caching (avoid redundant calls)
- **Multi-surface Auth:** Extension must share session with web dashboard (token relay pattern)

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js App Router) + Chrome Browser Extension

### Selected Starter: Existing Next.js 16 Boilerplate

**Rationale for Selection:**
An opinionated boilerplate is already in place and pre-wired with auth, database, AI integration, and file storage. Using it directly eliminates setup overhead and ensures all architectural decisions downstream are compatible with this foundation.

**Initialization Command:**
N/A — existing codebase already initialized at project root

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript (strict) across the entire application; Next.js 16 App Router with React Server Components and Server Actions; React 19.

**Styling Solution:**
Tailwind CSS 4 + shadcn/ui component library; dark/light mode via next-themes. Token-based design system (bg-background, text-foreground, etc.)

**Build Tooling:**
Next.js built-in (Turbopack in dev); `pnpm` as package manager; ESLint + TypeScript type-checking enforced as quality gates.

**AI Integration:**
Vercel AI SDK 5 + OpenRouter provider (`@openrouter/ai-sdk-provider`). Single unified API for 100+ models. OpenRouter replaces the Python CLIP/heuristics stack for MVP — a vision-capable model (e.g. `openai/gpt-4o`) handles thumbnail analysis.

**Database & ORM:**
PostgreSQL via Drizzle ORM + Drizzle Kit for migrations. Schema in `src/lib/schema.ts`.

**Authentication:**
BetterAuth with Google OAuth plugin added (replaces/supplements email-password for YouTube-linked auth). Session management server-side via `src/lib/auth.ts`.

**File Storage:**
Abstraction layer `src/lib/storage.ts` — local filesystem in dev, Vercel Blob in production. No configuration change needed when deploying.

**Code Organization:**
`src/app/` (App Router pages + API routes), `src/components/` (UI + feature components), `src/lib/` (auth, db, storage, utils). Feature directories follow this pattern.

**Development Experience:**
`pnpm run dev` for local dev; `pnpm run lint && pnpm run typecheck` required after all changes; DB studio via `pnpm run db:studio`.

**Note:** The Chrome Extension will be a separate workspace/package within the monorepo, communicating exclusively with Next.js API routes.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Async job processing: Inngest (already implemented)
- Billing: Polar via @polar-sh/better-auth (already integrated)
- Auth: BetterAuth + Google OAuth plugin
- Deployment: Vercel

**Important Decisions (Shape Architecture):**
- Chrome Extension: Removed from scope — web dashboard only
- YouTube API: Server-side Next.js API routes only
- Caching: DB-backed (PostgreSQL) via Drizzle

**Deferred Decisions (Post-MVP):**
- Redis/Upstash for high-volume caching (add if YouTube quota issues arise)
- CDN for thumbnail image delivery

### Data Architecture

- **Database:** PostgreSQL via Drizzle ORM (already in place)
- **Schema pattern:** Existing `analysis` + `user` tables used as blueprint; extend with `competitor_channels`, `youtube_cache` tables
- **Job state:** Analysis status tracked in DB (`pending → processing → complete | failed`) — driven by Inngest lifecycle steps
- **YouTube API caching:** DB table with `fetched_at` + TTL enforcement (1h for video stats, 24h for channel metadata) — no Redis needed for MVP
- **Credit model:** Existing `user.credits` field + atomic SQL increments already implemented in Inngest function; reuse directly
- **Migrations:** Drizzle Kit (`pnpm run db:generate` + `pnpm run db:migrate`)

### Authentication & Security

- **Provider:** BetterAuth with Google OAuth plugin (`@better-auth/social-providers`) — adds Google as sign-in method
- **YouTube scope:** Request `youtube.readonly` + `youtube.force-ssl` scopes during Google OAuth to enable YouTube API calls on behalf of user
- **Session:** BetterAuth server session in Server Components; client hooks from `src/lib/auth-client.ts`
- **No Chrome Extension:** Eliminates multi-surface auth complexity entirely
- **YouTube tokens:** Store encrypted OAuth refresh token in DB for server-side YouTube API calls (never expose to client)
- **Row-level security:** All DB queries scoped to `userId` via Drizzle `where(eq(table.userId, session.user.id))`
- **API security:** Server Actions + Route Handlers validate session before any data access

### API & Communication Patterns

- **Pattern:** Next.js App Router — Server Actions for mutations, Route Handlers for webhooks + async job endpoints
- **Analysis flow:**
  1. User uploads thumbnail → `POST /api/upload` → stores in Vercel Blob → returns URL
  2. Server Action creates `analysis` row (status: `pending`) + fires `analysis/upload.completed` Inngest event
  3. Inngest `processAnalysis` function runs: processes with OpenRouter vision model → updates DB to `complete`
  4. Dashboard polls `GET /api/analyses/[id]` or uses server-side revalidation
- **YouTube API:** All calls via `GET /api/youtube/*` Route Handlers (never client-side); centralized quota tracking; DB cache checked before API call
- **Billing webhooks:** Polar webhooks handled at `/api/webhooks/polar`
- **Error format:** Consistent `{ error: string, code: string }` JSON across all Route Handlers
- **Inngest endpoint:** Already at `/api/inngest` (route.ts exists)

### Frontend Architecture

- **Rendering:** RSC (React Server Components) by default; Client Components only where interactivity required (upload form, polling, charts)
- **State management:** No global state library; RSC data fetching + React `useState`/`useEffect` for local UI state; URL state for filters
- **Component library:** shadcn/ui (already installed); add components as needed via `npx shadcn@latest add [component]`
- **Dashboard data:** Server Components fetch from DB directly; no separate API layer for dashboard reads
- **Real-time updates:** Client polls `GET /api/analyses/[id]` every 2s while status is `pending` or `processing`; stops on `complete` or `failed`

### Infrastructure & Deployment

- **Hosting:** Vercel — zero-config Next.js deployment; Vercel Blob for thumbnail storage already wired via `src/lib/storage.ts`
- **Database:** Neon serverless PostgreSQL (Vercel-native, scales to zero)
- **Inngest:** Hosted Inngest cloud (free tier covers MVP volume); `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` env vars
- **Polar:** Sandbox → production toggle via `NODE_ENV` already implemented in `src/lib/polar.ts`
- **CI/CD:** Vercel Git integration (auto-deploy on push to main)
- **Monitoring:** Vercel Analytics + Inngest dashboard for job observability; add Sentry for error tracking
- **Environment vars to add:**
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth)
  - `YOUTUBE_API_KEY` (server-side Data API v3)
  - `POLAR_ACCESS_TOKEN` (already partially wired)
  - `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema migrations (extend existing tables for thumbnail domain)
2. Google OAuth via BetterAuth Google plugin
3. Rename/repurpose Inngest function (poker → thumbnail; swap prompt + schema)
4. Thumbnail upload flow + analysis job trigger
5. Dashboard (history grid, detail view)
6. YouTube API integration (competitor benchmarking)
7. Polar billing integration (freemium limits + upgrade flow)

**Cross-Component Dependencies:**
- Inngest depends on: DB schema, storage URL, OpenRouter API key, analysis prompt
- YouTube API routes depend on: Google OAuth token stored per user
- Polar billing depends on: BetterAuth session for user identity
- Dashboard depends on: analysis schema + status polling endpoint

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make inconsistent choices without explicit rules.

### Naming Patterns

**Database Naming Conventions (from existing schema.ts):**
- Table names: singular, lowercase (`user`, `analysis`, `webhook_events`) — NOT plural, NOT PascalCase
- TS field names: camelCase (`userId`, `imageUrl`, `createdAt`)
- DB column names: snake_case (`user_id`, `image_url`, `created_at`) — Drizzle maps these; always specify the DB name explicitly
- Primary keys: `text("id").primaryKey()` — text type, NOT uuid pg type
- Foreign keys: `text("user_id").references(() => user.id, { onDelete: "cascade" })`
- Index naming: `tableName_column_idx` (e.g., `analysis_user_id_idx`)
- Every table MUST have `createdAt` + `updatedAt` with `$onUpdate`
- Status fields: string literal text (`"pending" | "processing" | "complete" | "failed"`) — never numbers or booleans

**API Naming Conventions:**
- Route paths: plural, kebab-case (`/api/analyses`, `/api/competitor-channels`)
- Route files: `src/app/api/[feature]/route.ts`
- Nested resources: `src/app/api/analyses/[id]/route.ts`
- Query params: camelCase (`?userId=`, `?pageSize=`)
- Webhook routes: `src/app/api/webhooks/[provider]/route.ts`

**Code Naming Conventions:**
- Components: PascalCase files and names (`AnalysisCard.tsx`)
- Utilities/helpers: camelCase (`formatScore`, `validateImageType`)
- Constants: SCREAMING_SNAKE_CASE (`CREDITS_PER_ANALYSIS`, `MAX_FILE_SIZE`)
- Inngest events: `domain/action.pastTense` (`analysis/upload.completed`, `competitor/fetch.requested`)
- Inngest function IDs: kebab-case (`process-analysis`, `fetch-competitor-data`)

### Structure Patterns

**Project Organization:**
- Domain logic (prompts, schemas, constants): `src/domain/` — imported as `@/domain`
- DB schema: `src/lib/schema.ts` — all tables in one file
- API route handlers: `src/app/api/[feature]/route.ts`
- Inngest functions: `src/inngest/functions.ts` (all functions) + `src/inngest/client.ts` (single client export)
- Page components: `src/app/[route]/page.tsx` (Server Components by default)
- Feature UI components: `src/components/[feature]/`
- Shared UI primitives: `src/components/ui/` (shadcn only)

**New Feature Checklist:**
1. Schema changes → `src/lib/schema.ts` + `pnpm run db:generate` + migrate
2. API route → `src/app/api/[feature]/route.ts`
3. Inngest function (if async) → append to `src/inngest/functions.ts`
4. UI → `src/app/[route]/page.tsx` + `src/components/[feature]/`
5. Domain types/constants → `src/domain/`

### Format Patterns

**API Response Formats:**
- NEVER use `NextResponse.json()` — use `new Response(JSON.stringify(...))` consistently
- NEVER add a data wrapper — success payloads are flat objects
- Error key is ALWAYS `"error"` (string), never `"message"` or `"errors"`
- ID Generation: always `crypto.randomUUID()` — never nanoid, cuid, or other libraries
- Dates: store as PostgreSQL `timestamp`, serialize to ISO strings in JSON — never Unix timestamps

**Response shape examples:**
```typescript
// Success
new Response(JSON.stringify({ analysisId, imageUrl, credits }), {
  status: 200, headers: { "Content-Type": "application/json" },
});
// Error
new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401, headers: { "Content-Type": "application/json" },
});
```

### Communication Patterns

**Inngest Event Patterns:**
- Fire: `await inngest.send({ name: "domain/action.pastTense", data: { camelCaseFields } })`
- Register: `inngest.createFunction({ id: "kebab-case-id", retries: 3 }, { event: "..." }, async ({ event, step }) => {})`
- All logic wrapped in `step.run("kebab-case-label", async () => {...})` for step-level retries
- Credit refunds MUST happen in the Inngest error path of the same function that deducted them

**Polling Pattern:**
- Client polls `GET /api/analyses/[id]` every 2s while status is `pending | processing | uploaded`
- Stops when status is `complete` or `failed`
- Response shape: `{ id, status, result, imageUrl }`

### Process Patterns

**Authentication (every protected Route Handler):**
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
}
```
- ALWAYS the first check — NEVER trust client-sent userId; always use `session.user.id`

**Row-Level Security:** Every query on user-owned data MUST include `.where(eq(table.userId, session.user.id))`

**Error Handling:**
```typescript
try {
  // business logic
} catch (error) {
  console.error("[route-name] error:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500, headers: { "Content-Type": "application/json" },
  });
}
```
- Log with `console.error("[context] message:", error)` — context in brackets
- User-facing: generic ("Internal server error"), never expose stack traces
- Validation errors (400): specific messages ("File too large. Maximum size is 10MB")

### Enforcement Guidelines

**All AI Agents MUST:**
- Run `pnpm run lint && pnpm run typecheck` after every change
- Use `new Response(JSON.stringify(...))` — never `NextResponse.json()`
- Scope all DB queries to `session.user.id` on user-owned tables
- Use `crypto.randomUUID()` for all ID generation
- Add `createdAt` + `updatedAt` to every new DB table
- Check session as the FIRST operation in every protected Route Handler
- Follow Inngest event naming: `domain/action.pastTense`
- Never start the dev server — ask the user if dev output is needed

**Anti-Patterns:**
- `NextResponse.json(...)` ❌ → `new Response(JSON.stringify(...))`
- `{ message: "..." }` error responses ❌ → always `{ error: "..." }`
- Client-side YouTube API calls ❌ → server-side Route Handlers only
- Querying by `id` alone on user data ❌ → always add `userId` filter
- `Math.random()` or nanoid for IDs ❌ → `crypto.randomUUID()`

## Project Structure & Boundaries

### Complete Project Directory Structure

```
daily-saas-S01032026-youtube-thumbnail-analyzer/
├── CLAUDE.md                         # AI assistant guidelines
├── IMPLEMENTATION.md                 # Implementation notes
├── package.json / pnpm-lock.yaml
├── next.config.ts
├── drizzle.config.ts
├── tsconfig.json / eslint.config.mjs
├── docker-compose.yml                # Local Postgres + services
├── env.example                       # Required env vars reference
├── instrumentation.ts                # Sentry (server)
├── instrumentation-client.ts         # Sentry (client)
├── drizzle/                          # Migration files (generated)
├── public/                           # Static assets
├── docs/                             # Technical docs
│
└── src/
    ├── app/                          # Next.js App Router
    │   ├── layout.tsx                # Root layout
    │   ├── page.tsx                  # Landing page
    │   ├── globals.css
    │   ├── (auth)/                   # Auth route group
    │   │   ├── login/page.tsx        ✅ EXISTS
    │   │   └── register/page.tsx     ✅ EXISTS
    │   ├── dashboard/
    │   │   ├── page.tsx              ✅ EXISTS — analysis history grid (FR-004)
    │   │   └── loading.tsx           ✅ EXISTS
    │   ├── upload/
    │   │   └── page.tsx              ✅ EXISTS — thumbnail upload (FR-002)
    │   ├── analysis/
    │   │   └── [id]/page.tsx         ✅ EXISTS — analysis detail view (FR-004)
    │   ├── competitors/
    │   │   └── page.tsx              🆕 ADD — competitor benchmarking (FR-005)
    │   ├── profile/page.tsx          ✅ EXISTS — billing + account
    │   │
    │   └── api/
    │       ├── auth/[...all]/route.ts ✅ EXISTS — BetterAuth
    │       ├── upload/route.ts        ✅ EXISTS — thumbnail upload + Inngest trigger
    │       ├── analyses/
    │       │   ├── route.ts           ✅ EXISTS — list user analyses
    │       │   └── [id]/route.ts      ✅ EXISTS — poll status + result
    │       ├── inngest/route.ts       ✅ EXISTS — Inngest webhook endpoint
    │       ├── youtube/
    │       │   ├── channels/route.ts  🆕 ADD — search/add competitor channels (FR-005)
    │       │   └── videos/route.ts    🆕 ADD — fetch recent videos for benchmarking
    │       ├── webhooks/
    │       │   └── polar/route.ts     🆕 ADD — Polar subscription webhooks (FR-006)
    │       └── diagnostics/route.ts   ✅ EXISTS
    │
    ├── components/
    │   ├── ui/                        ✅ EXISTS — shadcn/ui primitives (do not add business logic)
    │   ├── auth/                      ✅ EXISTS — Google sign-in, sign-out, profile
    │   ├── landing/                   ✅ EXISTS — hero, pricing, CTA, mockup
    │   ├── upload/                    ✅ EXISTS — FileUpload, InsufficientCreditsDialog
    │   ├── analysis/
    │   │   ├── AnalysisCard.tsx        🆕 ADD — thumbnail card in dashboard grid
    │   │   ├── AnalysisResult.tsx      🆕 ADD — score + suggestions display
    │   │   └── StatusPoller.tsx        🆕 ADD — 2s polling while pending/processing
    │   ├── competitors/
    │   │   ├── AddChannelForm.tsx      🆕 ADD — add competitor channel (FR-005)
    │   │   └── CompetitorBenchmark.tsx 🆕 ADD — comparison display
    │   ├── site-header.tsx             ✅ EXISTS
    │   ├── site-footer.tsx             ✅ EXISTS
    │   └── purchase-credits-button.tsx ✅ EXISTS
    │
    ├── domain/                         ✅ EXISTS
    │   ├── index.ts                    — re-exports prompt, schema, constants
    │   ├── prompt.ts                   🔄 UPDATE — swap poker→thumbnail analysis prompt
    │   ├── schema.ts                   🔄 UPDATE — swap poker→thumbnail analysis schema
    │   └── README.md
    │
    ├── inngest/
    │   ├── client.ts                   🔄 UPDATE — rename app ID to thumbnail-analyzer
    │   ├── functions.ts                🔄 UPDATE — swap poker→thumbnail prompt/schema
    │   └── types.ts                    ✅ EXISTS — Inngest event type definitions
    │
    ├── lib/
    │   ├── schema.ts                   🔄 UPDATE — add competitor_channel, youtube_cache tables
    │   ├── auth.ts                     🔄 UPDATE — add Google OAuth plugin + YouTube scopes
    │   ├── auth-client.ts              ✅ EXISTS
    │   ├── db.ts                       ✅ EXISTS
    │   ├── storage.ts                  ✅ EXISTS
    │   ├── polar.ts                    ✅ EXISTS
    │   ├── youtube.ts                  🆕 ADD — YouTube Data API v3 client + quota guard
    │   ├── env.ts                      🔄 UPDATE — add YOUTUBE_API_KEY, GOOGLE_* vars
    │   ├── session.ts                  ✅ EXISTS
    │   └── utils.ts                    ✅ EXISTS
    │
    └── hooks/
        └── use-diagnostics.ts          ✅ EXISTS

Legend: ✅ EXISTS (keep/reuse) | 🔄 UPDATE (modify) | 🆕 ADD (create new)
```

### Architectural Boundaries

**API Boundaries:**
- All auth: `/api/auth/*` → BetterAuth (never bypass)
- All file I/O: `/api/upload` → storage abstraction (never write files directly in pages)
- All YouTube data: `/api/youtube/*` → server-side only (never client-side YouTube calls)
- All billing events: `/api/webhooks/polar` → validate Polar signature before processing
- All async jobs: fired via `inngest.send()` in Route Handlers; never called directly from pages

**Component Boundaries:**
- `src/components/ui/` — shadcn primitives only; never add business logic here
- `src/components/[feature]/` — feature components; may import from `ui/` and `lib/`
- Server Components (pages) fetch from DB or call Server Actions; they do NOT call `/api/*` routes
- Client Components use `fetch('/api/...')` or polling hooks for async data

**Data Boundaries:**
- `src/lib/schema.ts` — single source of truth for all DB tables
- `src/domain/` — single source of truth for AI prompt, output schema, and constants
- YouTube OAuth tokens: stored in existing `account` table (`accessToken`, `refreshToken`)
- YouTube API cache: `youtube_cache` table with TTL enforced in `lib/youtube.ts`

### Requirements to Structure Mapping

| FR | Feature | Primary Files |
|----|---------|--------------|
| FR-001 | Google OAuth auth | `lib/auth.ts`, `components/auth/`, `api/auth/` |
| FR-002 | Thumbnail upload + job | `app/upload/`, `api/upload/route.ts`, `inngest/functions.ts` |
| FR-003 | AI analysis engine | `domain/prompt.ts`, `domain/schema.ts`, `inngest/functions.ts` |
| FR-004 | Analysis history dashboard | `app/dashboard/`, `app/analysis/[id]/`, `api/analyses/`, `components/analysis/` |
| FR-005 | Competitor benchmarking | `app/competitors/`, `api/youtube/`, `lib/youtube.ts`, `components/competitors/` |
| FR-006 | Subscription billing (Polar) | `lib/polar.ts`, `lib/auth.ts`, `api/webhooks/polar/`, `components/purchase-credits-button.tsx` |
| FR-007 | Browser extension | ❌ Removed from scope |

### Integration Points

**Internal Data Flow:**
```
User uploads thumbnail
  → POST /api/upload
  → Vercel Blob storage (lib/storage.ts)
  → DB: analysis row (pending)
  → inngest.send("analysis/upload.completed")
  → Inngest processAnalysis function
     → OpenRouter GPT-4o vision (domain/prompt.ts + domain/schema.ts)
     → DB: analysis row (complete + result JSON)
  → Client polls GET /api/analyses/[id] every 2s
  → Dashboard renders result
```

**External Integrations:**
- **OpenRouter**: called from Inngest function only, via Vercel AI SDK
- **YouTube Data API v3**: called from `/api/youtube/*` Route Handlers only via `lib/youtube.ts`
- **Polar**: BetterAuth plugin + `/api/webhooks/polar` for subscription lifecycle events
- **Vercel Blob**: via `lib/storage.ts` upload/delete abstraction
- **Inngest Cloud**: via `/api/inngest` endpoint + `inngest.send()` calls

### New Environment Variables Required

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YOUTUBE_API_KEY=
POLAR_ACCESS_TOKEN=          # partially wired already
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices confirmed compatible. Inngest v3 + Next.js App Router, Polar + BetterAuth, Vercel Blob + Next.js storage abstraction — all production-validated combinations with no version conflicts.

**Pattern Consistency:** All implementation patterns derived directly from existing working codebase code. No theoretical patterns introduced.

**Structure Alignment:** Project structure extends existing directory conventions; new directories (`competitors/`, `api/youtube/`, `api/webhooks/`) follow established patterns.

### Requirements Coverage ✅

All 6 in-scope FRs are architecturally covered. FR-007 (Chrome Extension) removed from scope by user decision. All NFRs addressed: performance via RSC + Vercel edge, security via session-first + row-level scoping, compliance via Polar Checkout + GDPR cascade deletes, reliability via Vercel SLA + Inngest retries.

| FR | Covered By | Status |
|----|-----------|--------|
| FR-001 Google OAuth | BetterAuth Google plugin + `account` table token storage | ✅ |
| FR-002 Thumbnail upload | `/api/upload` + `lib/storage.ts` + Inngest event | ✅ |
| FR-003 Analysis engine | `domain/prompt.ts` + `domain/schema.ts` + Inngest + OpenRouter | ✅ |
| FR-004 History dashboard | `/app/dashboard/` + `/api/analyses/` + analysis detail page | ✅ |
| FR-005 Competitor benchmarking | `/api/youtube/` + `lib/youtube.ts` + DB cache + competitors page | ✅ |
| FR-006 Polar billing | `lib/polar.ts` + BetterAuth plugin + `/api/webhooks/polar/` | ✅ |
| FR-007 Chrome Extension | Removed from scope — user decision | ❌ |

### Gap Analysis

**Minor gaps (ownership assigned):**
- `lib/youtube.ts` MUST check `refreshTokenExpiresAt` before YouTube API calls and refresh via BetterAuth `account` table if expired
- `/api/webhooks/polar/route.ts` MUST validate Polar webhook signature before processing any event payload
- Add `GET /api/analyses/export` returning `Content-Type: text/csv` for FR-004 CSV export requirement

### Architecture Completeness Checklist

- [x] Project context analyzed; constraints identified
- [x] Stack anchor (Next.js boilerplate) decided and documented
- [x] All critical architectural decisions made and rationale recorded
- [x] Implementation patterns derived from existing codebase
- [x] Anti-patterns explicitly documented
- [x] Complete project directory structure with ✅/🔄/🆕 status per file
- [x] All FRs mapped to specific files
- [x] Integration data flow documented end-to-end
- [x] Environment variables enumerated
- [x] Minor gaps identified and assigned to specific files

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** — architecture grounded entirely in existing, working codebase patterns; no new infrastructure required.

**Key Strengths:**
- Inngest + upload flow already ~80% implemented; repurpose not rebuild
- Polar already integrated; billing requires configuration not development
- Drizzle schema extends cleanly; migration tooling already wired
- OpenRouter + Vercel AI SDK already proven in this codebase

**Areas for Future Enhancement (post-MVP):**
- Redis/Upstash caching layer if YouTube quota becomes limiting
- AI confidence scoring UI once model accuracy data is collected
- Team/agency multi-seat features (Phase 3 per PRD)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all patterns in "Implementation Patterns & Consistency Rules" exactly
- Use the structure map (✅/🔄/🆕) as the implementation checklist
- Begin with schema migrations before any feature work
- Run `pnpm run lint && pnpm run typecheck` after every change
- Never start the dev server — ask the user if output is needed

**First Implementation Priority (ordered):**
1. Update `src/lib/schema.ts` — add `competitor_channel`, `youtube_cache` tables
2. Update `src/lib/auth.ts` — add Google OAuth plugin with YouTube scopes
3. Update `src/domain/prompt.ts` + `schema.ts` — thumbnail analysis prompt/schema
4. Update `src/inngest/client.ts` + `functions.ts` — rename + adapt to thumbnail domain
5. Add `src/lib/youtube.ts` — YouTube Data API client with token refresh + DB cache
6. Add `src/app/competitors/` + `src/app/api/youtube/` — competitor benchmarking feature
7. Add `src/app/api/webhooks/polar/route.ts` — Polar billing webhook handler

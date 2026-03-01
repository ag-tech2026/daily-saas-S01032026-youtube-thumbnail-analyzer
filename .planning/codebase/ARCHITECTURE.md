# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Event-driven asynchronous architecture with Next.js 16 App Router, background job processing, and credit-gated access control.

**Key Characteristics:**
- Synchronous upload endpoint with atomic credit deduction
- Asynchronous background processing via Inngest for long-running vision analysis
- Polling-based client for real-time result updates
- Atomic SQL operations for financial integrity (credits)
- Structured output validation via Zod schemas
- Dual-mode file storage (local dev, Vercel Blob production)

## Layers

**Presentation Layer (React Components):**
- Purpose: User-facing UI for authentication, file upload, analysis viewing, and dashboard
- Location: `src/components/` (49 .tsx files), `src/app/` page components
- Contains: shadcn/ui components, authentication UI, upload interface, analysis display
- Key components: `FileUpload`, `UserProfile`, analysis detail rendering
- Depends on: BetterAuth client hooks, session state, fetch APIs
- Used by: Browser clients directly

**API/Request Handler Layer:**
- Purpose: HTTP request handling, validation, business rule enforcement
- Location: `src/app/api/`
- Key files:
  - `upload/route.ts` - Credit deduction, file upload, job dispatch
  - `analyses/route.ts` - List user's analyses
  - `analyses/[id]/route.ts` - Fetch single analysis with auth check
  - `chat/route.ts` - OpenRouter streaming chat (if used)
- Pattern: Zod validation, session checks, atomic operations
- Depends on: Auth, database, Inngest, storage
- Used by: Frontend fetch calls

**Business Logic Layer (Services):**
- Purpose: Core application logic outside of HTTP context
- Location: `src/lib/`, `src/inngest/`
- Key files:
  - `src/lib/auth.ts` - BetterAuth + Polar payment config
  - `src/lib/db.ts` - Drizzle client initialization
  - `src/lib/storage.ts` - File upload/deletion abstraction
  - `src/lib/analysis-schema.ts` - Output validation schema
  - `src/inngest/functions.ts` - Vision analysis background job
  - `src/inngest/prompts/analyze-hand.ts` - System prompt
- Pattern: Reusable, testable modules with clear responsibilities
- Depends on: Database, external APIs, file system
- Used by: API layer, background jobs

**Data Persistence Layer (Drizzle + PostgreSQL):**
- Purpose: Durable storage for users, sessions, analyses, credits
- Location: `src/lib/schema.ts`, `src/lib/db.ts`
- Tables:
  - `user` - User identity with credits field
  - `session` - BetterAuth sessions
  - `account` - OAuth provider accounts
  - `verification` - Email verification tokens
  - `analysis` - Poker hand analysis records
  - `webhookEvents` - Payment webhook deduplication
- Pattern: Drizzle ORM with type safety, migrations in `drizzle/`
- Depends on: PostgreSQL connection (POSTGRES_URL)
- Used by: All business logic layers

**Authentication & Authorization Layer:**
- Purpose: Session management, identity verification, credit enforcement
- Location: `src/lib/auth.ts`, `src/lib/auth-client.ts`
- Features:
  - Email/password + Google OAuth via BetterAuth
  - User credits on signup (default 3)
  - 7-day sessions with 1-day refresh
  - Polar payment integration (webhook adds 50 credits)
  - Atomic credit deduction on upload
- Pattern: Server-side session validation, client-side hooks for UI
- Used by: All protected routes and API endpoints

**Background Job Processing (Inngest):**
- Purpose: Asynchronous, resilient long-running tasks
- Location: `src/inngest/`
- Key function: `processAnalysis`
  - Triggered by: `analysis/upload.completed` event
  - Steps: Update status, call GPT-4o vision, save result
  - Retries: 3x with exponential backoff
  - Error handling: Refunds credit on final failure
- Pattern: Step-based error handling with transaction boundaries
- Depends on: Database, OpenRouter API
- Used by: Upload API route via `inngest.send()`

**File Storage Layer:**
- Purpose: Persistent file storage with dev/prod abstraction
- Location: `src/lib/storage.ts`
- Behavior:
  - If `BLOB_READ_WRITE_TOKEN` set: Vercel Blob (production)
  - Otherwise: Local filesystem at `public/uploads/` (development)
- Functions: `upload()`, `deleteFile()`, `sanitizeFilename()`
- Validation: File size (<10MB), type (PNG/JPG), path safety
- Used by: Upload API endpoint

**AI Integration Layer:**
- Purpose: LLM access for vision analysis and chat
- Location: `src/app/api/chat/route.ts`, `src/inngest/functions.ts`
- Provider: OpenRouter (via `@openrouter/ai-sdk-provider`)
- Models:
  - Vision: `openai/gpt-4o` for poker hand analysis
  - Chat: `openai/gpt-5-mini` (or env var OPENROUTER_MODEL)
- Pattern: Streaming responses for chat, structured outputs for analysis
- Depends on: OpenRouter API key (OPENROUTER_API_KEY)
- Used by: Chat page, background analysis job

## Data Flow

**Upload & Analysis Processing:**

1. **Upload Initiation** (`/upload` page)
   - User drags/clicks file in `FileUpload` component
   - Client validates file locally (type, size)
   - Checks user credits via session

2. **Credit Deduction & Upload** (Atomic)
   - POST `/api/upload` with FormData
   - `src/app/api/upload/route.ts`:
     - Verify BetterAuth session
     - **Atomically deduct 1 credit**: `UPDATE user SET credits = credits - 1 WHERE id = ? AND credits > 0`
     - If deduct fails → 402 Insufficient Credits
     - Validate file (MIME type, size)
     - Upload to storage (Blob or local)
     - Create `analysis` record: `status: "pending"`

3. **Background Analysis Processing** (Asynchronous)
   - Upload API triggers: `inngest.send("analysis/upload.completed", {analysisId, userId, imageUrl})`
   - Inngest worker picks up event
   - `processAnalysis` function executes:
     - **Step 1**: Update `analysis.status` → `"processing"`
     - **Step 2**: Call GPT-4o with image URL + system prompt
       - Uses `src/inngest/prompts/analyze-hand.ts` for poker context
       - Generates structured JSON via `analysisSchema`
     - **Step 3**: Save result to `analysis.result` field, set `status: "complete"`
   - **On Error** (after 3 retries):
     - Atomic refund: `UPDATE user SET credits = credits + 1 WHERE id = ?`
     - Set `analysis.status` → `"failed"`

4. **Client Result Polling** (`/analysis/[id]` page)
   - Client Component polls `/api/analyses/[id]` every 3 seconds
   - Displays spinner while `status` is "pending" or "processing"
   - Once `status: "complete"`:
     - Parses `result` JSON as `AnalysisResult`
     - Renders structured analysis (hand details, board, action, analysis, improvements)
   - If `status: "failed"`:
     - Shows error message with refund notice

**Chat Flow (if used):**

1. User types message in `/chat` page
2. Client: `useChat()` hook POSTs message array
3. `/api/chat/route.ts`:
   - Verify session
   - Validate messages via Zod
   - Initialize OpenRouter client
   - Call `streamText()` → returns SSE stream
4. Client: Receives chunks, appends to state, renders incrementally

**State Management:**

**Server-side:**
- BetterAuth session cookies → verified per request
- Database is single source of truth: user credits, analysis records
- Inngest manages job state and retries

**Client-side:**
- Session state: `useSession()` hook (cached)
- Page state: `useState` for loading, errors, polling
- Theme: `next-themes` provider

## Key Abstractions

**Analysis Entity:**
- Purpose: Represents a poker hand analysis lifecycle
- Location: `src/lib/schema.ts` (database), `src/lib/analysis-schema.ts` (output)
- Schema:
  - `id` - UUID
  - `userId` - FK to user
  - `imageUrl` - Public URL of uploaded screenshot
  - `status` - "pending" | "processing" | "complete" | "failed"
  - `result` - JSON string (AnalysisResult) or null
  - `createdAt`, `updatedAt` - Timestamps
- Lifecycle: Created pending → Updated to processing → Finalized as complete/failed

**AnalysisResult (Structured Output):**
- Purpose: Typed poker hand analysis from GPT-4o vision model
- Definition: `src/lib/analysis-schema.ts` (Zod schema)
- Fields:
  - `hand_info` - Stakes, game type, position, hero's cards, stack depth, assumptions
  - `board` - Flop, turn, river cards
  - `action_summary` - Preflop/flop/turn/river action description
  - `analysis` - Summary and main takeaway
  - `good_plays` - Array of correct decisions with explanations
  - `areas_to_improve` - Array of mistakes with recommended corrections
  - `improvement_tips` - Actionable tips (3-5 items)
  - `tags` - Kebab-case tags for hand classification
  - `difficulty_level` - "beginner" | "reg"
  - `confidence_score` - Confidence 0-1 based on image clarity

**User Credits:**
- Purpose: Freemium access control mechanism
- Implementation: Integer column on `user` table (default 3 on signup)
- Mutation: Atomic SQL operations only
  - Deduction: `UPDATE user SET credits = credits - 1 WHERE id = ? AND credits > 0`
  - Refund: `UPDATE user SET credits = credits + 1 WHERE id = ?`
  - Purchase: Polar webhook adds 50 credits atomically
- Pattern: Prevents race conditions, ensures financial consistency

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Responsibilities: Load fonts, setup providers (theme, font size), render header/footer, define metadata

**Public Landing Page:**
- Location: `src/app/page.tsx`
- Components: Hero section, pricing, CTA
- No auth required

**Protected Upload:**
- Location: `src/app/upload/page.tsx`
- Checks: Session via `useSession()` hook
- Displays: File upload component, credit balance

**Protected Dashboard:**
- Location: `src/app/dashboard/page.tsx`
- Checks: Session via `useSession()` hook
- Displays: Upload card, profile info, credit balance, recent analyses
- Polling: Watches for credit updates after purchase

**Protected Analysis Detail:**
- Location: `src/app/analysis/[id]/page.tsx`
- Checks: Session via `useSession()` hook, permission check in API
- Polling: Polls API every 3 seconds until completion
- Displays: Status-dependent UI (loading, complete, failed)

**API: Upload Endpoint:**
- Route: `POST /api/upload`
- Input: FormData with file
- Output: `{analysisId, imageUrl, credits}`
- Side effects: Deducts credit, uploads file, triggers Inngest job

**API: Analyses Fetch:**
- Route: `GET /api/analyses`
- Output: Array of user's analyses (50 limit), newest first
- Auth: Required

**API: Single Analysis:**
- Route: `GET /api/analyses/[id]`
- Output: Single analysis object or 404
- Auth: Required + permission check (user's own analysis only)
- Polling client: Every 3 seconds during analysis processing

**Background Job:**
- Trigger: Inngest event `analysis/upload.completed`
- Processing: 3 retries with exponential backoff
- Final failure: Refunds credit, marks as failed

## Error Handling

**Strategy:** Fail-safe with recovery mechanisms, atomic operations for consistency.

**Patterns:**

- **Credit Deduction:** Atomic SQL with condition; if fails, return 402 and don't upload
- **Upload Storage:** If fails after credit deducted, leave analysis in "pending" state for retry
- **Vision Analysis:** Retry up to 3 times via Inngest; after 3 failures, refund credit atomically
- **Session Validation:** All protected routes/APIs check session; return 401 if missing
- **Zod Validation:** Request schemas validated before processing; return 400 with field errors
- **File Validation:** Size, type, sanitization checks in storage layer

**Examples:**
- `src/app/api/upload/route.ts` lines 21-32: Atomic credit check
- `src/inngest/functions.ts` lines 95-113: Error handling with refund
- `src/app/api/analyses/[id]/route.ts` lines 19-26: Permission check

## Cross-Cutting Concerns

**Authentication:**
- Server-side: `auth.api.getSession({ headers: await headers() })` checks BetterAuth cookie
- Client-side: `useSession()` hook from `@/lib/auth-client`
- Protected routes: Check in Server Component or API handler
- Files: `src/lib/auth.ts` (server config), `src/lib/auth-client.ts` (hooks)

**Logging:**
- Server: `console.log`, `console.error` for critical failures
- Upload errors: Logged before returning response
- Webhook errors: Logged with context
- Job errors: Logged by Inngest with retry context
- No structured logging library; uses native console

**Validation:**
- Requests: Zod schemas in all API routes
- Files: Storage layer validates size, type, filename
- Database: Drizzle type-safety at compile time
- Output: AnalysisResult validates vision model output

**Authorization:**
- Users access only their own analyses (checked in GET routes)
- Users deduct only their own credits
- Polar webhook verified before processing
- Analysis ownership enforced before returning data

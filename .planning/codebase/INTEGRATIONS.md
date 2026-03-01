# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**AI Models via OpenRouter:**
- Service: OpenRouter (https://openrouter.ai/)
- What it's used for: Chat streaming, LLM inference
  - SDK/Client: `@openrouter/ai-sdk-provider` 1.5.4
  - Auth: Environment variable `OPENROUTER_API_KEY`
  - Implementation: `src/app/api/chat/route.ts`
  - Model selection: Via `OPENROUTER_MODEL` env var (default: `openai/gpt-5-mini`)
  - Access: 100+ models available through single unified API
  - Features: Streaming responses via Vercel AI SDK with Zod validation

**Payment Processing via Polar:**
- Service: Polar (https://polar.sh/)
- What it's used for: Subscription and one-time payment processing
  - SDK: `@polar-sh/sdk` 0.43.1
  - BetterAuth Plugin: `@polar-sh/better-auth` 1.8.1
  - Auth: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_ID`
  - Implementation: `src/lib/auth.ts` with checkout and webhook plugins
  - Server: Sandbox in development, production in staging/live
  - Features:
    - Automatic customer creation on signup
    - Hosted checkout integration
    - Webhook-based order processing (idempotent)
    - Credit system integration (+50 credits per order)
  - Webhook handling: `src/lib/auth.ts` onOrderPaid handler

**Google OAuth (Optional):**
- Service: Google Cloud Platform OAuth 2.0
- What it's used for: Social authentication
  - Auth: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
  - Framework: better-auth
  - Callback URL: `{BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  - Status: Configured in `src/lib/auth.ts`, not blocking if credentials missing

## Data Storage

**Databases:**
- Type: PostgreSQL
  - Connection: `POSTGRES_URL` environment variable
  - Client library: `postgres` 3.4.8 (primary) and `pg` 8.17.2 (types)
  - ORM: Drizzle ORM 0.44.7
  - Schema location: `src/lib/schema.ts`
  - Database connection: `src/lib/db.ts`
  - Tables:
    - `user` - User profiles with credit system (id, name, email, credits)
    - `session` - Session management (BetterAuth)
    - `account` - OAuth account linking (BetterAuth)
    - `verification` - Email verification tokens (BetterAuth)
    - `analysis` - Poker hand analysis results (userId, imageUrl, status, result)
    - `webhookEvents` - Idempotency tracking for Polar webhooks

**File Storage:**
- Dual mode storage abstraction in `src/lib/storage.ts`:
  - **Remote (Vercel Blob):** Uses `@vercel/blob` 2.0.1 when `BLOB_READ_WRITE_TOKEN` is set
    - Public URLs: `https://*.public.blob.vercel-storage.com/...`
    - Automatic failover if token present
  - **Local (Default):** File system storage to `public/uploads/` directory
    - Served at: `/uploads/{folder}/{filename}`
    - Used in development or when Blob token not configured
  - File validation: JPEG/PNG only, max 10MB
  - Functions: `upload()`, `deleteFile()`, `sanitizeFilename()`, `validateFile()`

**Caching:**
- None configured. Fetch requests use `cache: "no-store"` to ensure fresh data.

## Authentication & Identity

**Auth Provider:**
- Service: better-auth 1.4.18 (self-hosted)
  - Implementation: Custom authentication system, not third-party SaaS
  - Location: `src/lib/auth.ts`
  - Database adapter: Drizzle ORM to PostgreSQL
  - Session duration: 7 days
  - Session refresh: Every 24 hours
  - Methods:
    - Email/Password authentication: Enabled
    - Email verification: On signup (URLs logged to console, no email service configured)
    - Password reset: Password reset URLs logged to console (no email service configured)
    - OAuth: Google OAuth optional (configuration present)
    - Polar integration: Customer creation and credit management
  - Session management: HTTP-only cookies via better-auth
  - User extensions: `credits` field (integer, default 3)
  - Session route: `/api/auth/session` (Next.js route handler)
  - Admin route: `/api/auth/[...all]` (catch-all for better-auth)
  - Client hooks: Imported from `src/lib/auth-client.ts`

**Session Storage:**
- PostgreSQL via BetterAuth Drizzle adapter
- IP address and user agent tracked per session
- Encrypted session tokens in `session` table

## Monitoring & Observability

**Error Tracking:**
- Sentry (https://sentry.io)
  - Package: `@sentry/nextjs` 10.39.0
  - Server config: `sentry.server.config.ts`
  - Edge config: `sentry.edge.config.ts`
  - Next.js integration: Wrapped via `withSentryConfig()` in `next.config.ts`
  - Client-side usage: Global error boundary in `src/app/global-error.tsx` captures exceptions
  - Tree-shaking: Removes debug logging in production builds
  - Features: Enabled for production, silent in CI mode

**Logs:**
- Console logging only
- ESLint configured to warn on console, allows `console.warn` and `console.error`
- Environment checks via `src/lib/env.ts`
- Diagnostics endpoint: `GET /api/diagnostics` (public, no auth required)

**Performance Monitoring:**
- Sentry integration (via @sentry/nextjs) includes performance monitoring
- Not explicitly configured beyond default Sentry setup

## CI/CD & Deployment

**Hosting:**
- Target: Vercel (primary, via Sentry Vercel integration and Vercel Blob support)
- Alternative: Any Node.js 20.x host

**CI Pipeline:**
- None detected (no GitHub Actions, GitLab CI, etc. configured)
- Build command: `npm run build` (runs migrations then `next build`)
- CI-safe build: `npm run build:ci` (skips database migrations)

**Deployment Configuration:**
- Next.js config: `next.config.ts`
- Remote image patterns whitelisted:
  - Google: `lh3.googleusercontent.com`
  - GitHub: `avatars.githubusercontent.com`
  - Vercel Blob: `*.public.blob.vercel-storage.com`
- Environment detection: `NODE_ENV` checked for Polar server selection

## Webhooks & Callbacks

**Incoming Webhooks:**
- **Polar Order Paid Webhook:** `src/lib/auth.ts` (BetterAuth Polar plugin)
  - Event type: `order.paid`
  - Payload handling: Extracts customer external ID and order ID
  - Handler: Idempotent credit addition (+50 credits per order)
  - Validation: HMAC signature verification via `POLAR_WEBHOOK_SECRET`
  - Storage: Webhook event IDs logged in `webhookEvents` table for idempotency
  - Database: Transactional processing with atomic credit increment via SQL

**Outgoing Webhooks:**
- None configured

**OAuth Redirect URLs:**
- Google: `{BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
- Polar Checkout Success: `/dashboard?purchase=success`

## Email Integration

**Status:** Not configured

- Password reset emails: URLs logged to console only
- Verification emails: URLs logged to console only
- Email service integration requires implementation in:
  - `src/lib/auth.ts` - `sendResetPassword()` function
  - `src/lib/auth.ts` - `sendVerificationEmail()` function

## Background Job Processing

**Task Queue:**
- Inngest (https://www.inngest.com)
  - Package: `inngest` 3.52.0
  - Client initialization: `src/inngest/client.ts`
  - App ID: `poker-ai-review`
  - Event schemas: Type-safe events in `src/inngest/types.ts`
  - Functions: `src/inngest/functions.ts`
  - API route: `src/app/api/inngest/route.ts`
  - Usage: Async processing of poker hand analysis
  - Integration: Triggered from file upload endpoint `src/app/api/upload/route.ts`

## Rate Limiting & Quotas

**User Quotas:**
- Credit-based system (managed in `src/lib/auth.ts`)
- Initial credits: 3 per user
- Credit increase: +50 credits per Polar order
- Tracking: `user.credits` field in PostgreSQL

**API Rate Limiting:**
- Not detected (no rate limiting middleware configured)

## Environment Configuration

**Required env vars:**
- `POSTGRES_URL` - PostgreSQL connection string (critical)
- `BETTER_AUTH_SECRET` - 32+ character auth secret (critical)

**Optional env vars:**
- `GOOGLE_CLIENT_ID` - Google OAuth
- `GOOGLE_CLIENT_SECRET` - Google OAuth
- `BETTER_AUTH_URL` - Auth base URL (defaults to NEXT_PUBLIC_APP_URL)
- `OPENROUTER_API_KEY` - AI chat feature (optional, feature disabled if not set)
- `OPENROUTER_MODEL` - Model selection (default: `openai/gpt-5-mini`)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob (optional, falls back to local storage)
- `NEXT_PUBLIC_APP_URL` - Public app URL (default: `http://localhost:3000`)
- `POLAR_WEBHOOK_SECRET` - Polar webhook signing secret
- `POLAR_ACCESS_TOKEN` - Polar API access token
- `POLAR_PRODUCT_ID` - Polar product ID for checkout

**Validation:**
- Zod schema in `src/lib/env.ts` validates all variables at runtime
- Type-safe environment access via `getServerEnv()` and `getClientEnv()`
- Diagnostic check: `npm run env:check` validates before runtime

**Secrets location:**
- `.env` file (local development, not committed)
- Environment variables injected at deployment

## API Schema Validation

**Request Validation:**
- Zod schemas used in chat endpoint (`src/app/api/chat/route.ts`)
- Message validation: Text max 10,000 characters, max 100 messages per request
- Request-specific schemas: `messageSchema`, `messagePartSchema`, `chatRequestSchema`
- Custom error formatting with field-level details
- Returns 400 with validation errors if request fails

## Data Flow Summary

**Chat Request Flow:**
1. Client: POST `/api/chat` with messages
2. Server: `src/app/api/chat/route.ts` validates auth and request
3. OpenRouter API: Streams text response via `@openrouter/ai-sdk-provider`
4. Server: Converts to UI message stream
5. Client: Displays streamed response

**Authentication Flow:**
1. Client: User registers or logs in via `/auth/login` or `/auth/register`
2. Server: `src/lib/auth.ts` processes credentials
3. Database: User stored in PostgreSQL via Drizzle ORM
4. Client: Session cookie set for future requests
5. Protected routes: Verify session via `/api/auth/session`

**Payment Flow:**
1. Client: Clicks checkout button on dashboard
2. Polar Hosted Checkout: User completes payment
3. Polar Webhook: Sends `order.paid` event
4. Server: `src/lib/auth.ts` webhook handler processes order
5. Database: Adds 50 credits to user account (atomic, idempotent)

**File Upload Flow:**
1. Client: Uploads file via protected endpoint
2. Server: `src/lib/storage.ts` validates file
3. Storage: File saved to Vercel Blob or `public/uploads/`
4. Inngest: Background job triggered for analysis
5. Client: Receives public URL and job status

---

*Integration audit: 2026-02-23*

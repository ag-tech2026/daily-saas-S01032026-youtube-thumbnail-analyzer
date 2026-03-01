# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Email/Verification System Not Implemented:**
- Issue: Password reset and email verification URLs are only logged to terminal console, not sent via email
- Files: `src/lib/auth.ts` (lines 11-23)
- Impact: Production use is impossible - users cannot reset passwords or verify emails without manual intervention
- Fix approach: Integrate email service (SendGrid, Resend, Mailgun, etc.) to replace console.log calls with actual email delivery. Currently configured for development only with commented indication "no email integration yet"

**Incomplete Profile Update Feature:**
- Issue: Profile update dialog exists but has no backend implementation
- Files: `src/app/profile/page.tsx` (lines 59-64)
- Impact: Users cannot modify their profile after creation; UI is non-functional
- Fix approach: Implement backend API endpoint for profile updates with proper validation and authorization checks

**Chat Message History Limited to Browser Storage:**
- Issue: Chat messages are persisted only to localStorage with no server-side persistence
- Files: `src/app/chat/page.tsx` (lines 189-222)
- Impact: Chat history is lost on browser clear or new device login; no cross-device access; limited to available browser storage
- Fix approach: Implement database table for message history with user association and sync logic; handle cleanup of old messages

## Known Bugs

**Console.log Disabled in Auth Email Handlers:**
- Symptoms: ESLint disabled comments required in auth.ts for console.log usage
- Files: `src/lib/auth.ts` (lines 13, 21)
- Trigger: Password reset or email verification flows
- Workaround: Check server logs/terminal for password reset URLs during development

**Potential Race Condition in Chat Page Loading:**
- Symptoms: Messages may be set before component fully mounts
- Files: `src/app/chat/page.tsx` (lines 200-215)
- Trigger: Component mounting with localStorage data while useChat hook is initializing
- Workaround: No workaround; users should avoid closing/reopening chat rapidly

## Security Considerations

**Password Reset Tokens Exposed in Terminal:**
- Risk: Reset tokens logged to console in development are visible in server logs and terminal output
- Files: `src/lib/auth.ts` (line 14)
- Current mitigation: Only occurs in development mode; users instructed to check terminal
- Recommendations: Implement proper email sending for production; ensure tokens expire quickly (BetterAuth default is reasonable); never log full URLs with tokens to any persistent logging

**Diagnostics Endpoint is Unauthenticated:**
- Risk: Public API endpoint reveals system configuration status including database connectivity, auth setup, storage type
- Files: `src/app/api/diagnostics/route.ts` (lines 34-36)
- Current mitigation: Only returns boolean flags, not sensitive values; intentionally public for setup checklist
- Recommendations: Consider moving to /setup route post-deployment; add IP allowlist for production; document that this should be disabled or protected in production

**localStorage Chat Storage Not Encrypted:**
- Risk: Chat messages stored in plain text in browser localStorage can be accessed via browser DevTools or XSS attacks
- Files: `src/app/chat/page.tsx` (line 189, lines 203-209, 220)
- Current mitigation: No encryption or sensitive data handling
- Recommendations: Move chat data to server-side storage; if keeping browser storage, implement encryption; consider IndexedDB with better isolation

**OpenRouter API Key Required for Chat:**
- Risk: Missing `OPENROUTER_API_KEY` causes 500 error; users can see system status via error message
- Files: `src/app/api/chat/route.ts` (lines 62-68)
- Current mitigation: Returns appropriate 500 error; environment validation at startup
- Recommendations: Better error messaging in UI; implement fallback model or graceful degradation

## Performance Bottlenecks

**Synchronous Database Connection on Server Startup:**
- Problem: Database connection in `src/lib/db.ts` is instantiated at import time, blocking server startup if database is unavailable
- Files: `src/lib/db.ts` (lines 5-12)
- Cause: Throws synchronously if POSTGRES_URL is missing; connection pool created immediately
- Improvement path: Implement lazy connection initialization; add retry logic with exponential backoff for connection failures; allow graceful degradation if DB temporarily unavailable

**Diagnostics Endpoint Makes Synchronous Database Query:**
- Problem: GET /api/diagnostics runs a database query during route handling without timeout
- Files: `src/app/api/diagnostics/route.ts` (lines 52-97)
- Cause: Uses Promise.race with timeout (5s) but still makes actual DB call
- Improvement path: Cache diagnostics results for 30 seconds; add circuit breaker pattern; optimize query to use connection pool efficiently

**Chat Messages Array Unbounded:**
- Problem: Chat messages stored in state with `.max(100)` validation but no pagination or pagination UI
- Files: `src/app/api/chat/route.ts` (line 21)
- Cause: 100 messages can accumulate in localStorage causing performance degradation
- Improvement path: Implement pagination UI; implement server-side message persistence with lazy loading; add automatic cleanup of old messages

**Large Files Can Consume Memory:**
- Problem: File uploads held entirely in buffer in memory before writing
- Files: `src/lib/storage.ts` (lines 137-188)
- Cause: Entire file buffer passed through function; no streaming support
- Improvement path: Implement streaming uploads for large files; add progress tracking; implement multipart upload for files >5MB

## Fragile Areas

**Authentication Session Management:**
- Files: `src/lib/auth.ts`, `src/lib/auth-client.ts`, various auth components
- Why fragile: BetterAuth is third-party dependency; any major version update could break authentication; session expiry logic not visible; cookie configuration not documented
- Safe modification: Before updating BetterAuth, test entire auth flow (signup, login, password reset, logout); verify session cookies are being set correctly
- Test coverage: No tests visible for auth flows; manual testing required for any changes

**Message Format Handling in Chat:**
- Files: `src/app/chat/page.tsx` (lines 108-141)
- Why fragile: Multiple code paths handle `message.parts` vs `message.content`; type assertions cast to MaybePartsMessage; format conversion logic repeated in multiple places
- Safe modification: Create test cases for different message shapes before refactoring; extract message format handling to utility function; add TypeScript types for all message variants
- Test coverage: No unit tests for message parsing/rendering

**File Storage Abstraction:**
- Files: `src/lib/storage.ts`
- Why fragile: Switches between local filesystem and Vercel Blob based on env var; local storage writes to `public/uploads` which becomes exposed; deletion logic differs between storage backends
- Safe modification: Add comprehensive tests for both storage backends; test file deletion edge cases; verify URL consistency between backends
- Test coverage: No tests visible for file operations

**Database Schema with BetterAuth Integration:**
- Files: `src/lib/schema.ts`
- Why fragile: Manual schema definition must match BetterAuth expectations exactly; text IDs used instead of UUIDs (required by BetterAuth); migrations not version-controlled beyond drizzle-kit
- Safe modification: Run `npm run db:migrate` after any schema changes; verify migrations against BetterAuth documentation; keep migration history in version control
- Test coverage: No tests for schema integrity

## Scaling Limits

**Chat Message Pagination:**
- Current capacity: 100 messages max (enforced by schema validation)
- Limit: Beyond 100 messages, new messages are rejected
- Scaling path: Remove arbitrary limit; implement pagination; implement server-side persistence with timestamp-based or cursor-based pagination; add message archival strategy

**Database Connection Pool:**
- Current capacity: Default postgres-js pool settings (inherited from library defaults)
- Limit: Under high concurrent load, connection pool may be exhausted
- Scaling path: Explicitly configure pool size in `src/lib/db.ts`; implement connection pooling service (PgBouncer); monitor connection usage; implement connection timeout handling

**localStorage Size:**
- Current capacity: Browser dependent, typically 5-10MB
- Limit: Chat with large responses can fill localStorage, blocking other app features
- Scaling path: Migrate to server-side storage; implement data compression; implement automatic cleanup of old messages

**File Upload Limit:**
- Current capacity: 5MB per file (hardcoded in `src/lib/storage.ts`)
- Limit: Users cannot upload larger files; no multipart upload support
- Scaling path: Implement chunked/multipart uploads for large files; update validation limits; add progress tracking

**Request Body Size:**
- Current capacity: Default Next.js request body limit
- Limit: Large chat message payloads could hit limits
- Scaling path: Add explicit request size limit configuration; implement message compression

## Dependencies at Risk

**BetterAuth (^1.4.18):**
- Risk: Relatively young dependency; used for critical auth functionality; active development
- Impact: Breaking changes in major versions would require significant refactoring of auth flows
- Migration plan: Before upgrading major versions, test entire auth flow in staging; maintain separate branch for upgrade testing; have rollback plan ready

**OpenRouter Provider (@openrouter/ai-sdk-provider ^1.5.4):**
- Risk: Smaller package; depends on Vercel AI SDK; vendor lock-in to OpenRouter
- Impact: If OpenRouter service degrades or pricing changes, entire AI feature is affected
- Migration plan: Implement provider abstraction layer to allow switching to other AI providers; document API contract for model selection

**Vercel Blob (^2.0.1):**
- Risk: Vercel service dependency; production deployment requires Vercel infrastructure
- Impact: File storage cannot work in non-Vercel deployments; vendor lock-in
- Migration plan: Storage abstraction exists but only supports local filesystem + Vercel; consider adding S3 support for portability

## Missing Critical Features

**Persistent Chat History:**
- Problem: Chat messages not persisted to database; lost on logout or browser clear
- Blocks: Users cannot maintain conversation history; cannot share conversations

**Email Integration:**
- Problem: Password reset and email verification only output to console
- Blocks: Production deployment impossible; users cannot reset forgotten passwords; users cannot verify email addresses

**User Profile Management:**
- Problem: Profile UI exists but backend is non-functional
- Blocks: Users cannot update their information after signup

**Rate Limiting:**
- Problem: Chat endpoint has no rate limiting; AI requests unlimited per user
- Blocks: Abuse vulnerability; potential for high costs; DOS risk on chat endpoint

**Authentication Rate Limiting:**
- Problem: No rate limiting on login/signup endpoints
- Blocks: Brute force attack vulnerability; unlimited password reset attempts possible

## Test Coverage Gaps

**Chat Functionality:**
- What's not tested: Message sending, message rendering, localStorage persistence, message validation, streaming responses, error handling
- Files: `src/app/chat/page.tsx`, `src/app/api/chat/route.ts`
- Risk: Refactoring could break core functionality silently
- Priority: High

**Authentication Flows:**
- What's not tested: Login, signup, password reset, email verification, session handling, logout
- Files: `src/lib/auth.ts`, `src/lib/auth-client.ts`, auth components
- Risk: Auth changes could lock users out without detection
- Priority: High

**File Storage Operations:**
- What's not tested: Upload validation, file deletion, storage backend switching, filename sanitization
- Files: `src/lib/storage.ts`
- Risk: Security vulnerabilities in file handling could go undetected
- Priority: High

**Database Schema:**
- What's not tested: Schema migrations, foreign key integrity, index functionality
- Files: `src/lib/schema.ts`
- Risk: Corrupted migrations could crash deployments
- Priority: Medium

**API Endpoints:**
- What's not tested: Diagnostics endpoint accuracy, chat API request validation, error responses
- Files: `src/app/api/diagnostics/route.ts`, `src/app/api/chat/route.ts`
- Risk: Endpoint changes could break client integrations
- Priority: Medium

---

*Concerns audit: 2026-02-13*

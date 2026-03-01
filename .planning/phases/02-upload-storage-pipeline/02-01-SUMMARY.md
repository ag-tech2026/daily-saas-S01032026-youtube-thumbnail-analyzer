---
phase: 02-upload-storage-pipeline
plan: 01
subsystem: api, database, storage
tags: [drizzle, postgres, vercel-blob, formdata, file-upload, atomic-transactions]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: User authentication with BetterAuth, credits field in user schema, database setup with Drizzle
provides:
  - Analysis database table with status tracking
  - POST /api/upload endpoint with atomic credit deduction
  - File storage for poker screenshots (10MB max, PNG/JPG only)
  - Foundation for async analysis pipeline
affects: [03-inngest-async-jobs, 04-ai-vision-analysis, 06-history-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic credit deduction using Drizzle sql template with WHERE clause"
    - "Analysis record lifecycle: pending → uploaded → analyzing → complete/failed"
    - "FormData file upload with server-side validation"

key-files:
  created:
    - src/app/api/upload/route.ts
    - drizzle/0003_freezing_toro.sql
  modified:
    - src/lib/schema.ts
    - src/lib/storage.ts

key-decisions:
  - "Use text UUIDs for analysis.id to match BetterAuth pattern (not pgTable uuid type)"
  - "Store analysis result as JSON text field (Phase 4 will populate)"
  - "No database transaction wrapper - atomic credit deduction via WHERE + analysis pending state is correct recovery"
  - "Used db:push instead of db:migrate due to missing __drizzle_migrations tracking table"

patterns-established:
  - "Pattern 1: Atomic credit operations use sql template with WHERE conditions for race-safety"
  - "Pattern 2: Analysis records start as pending, allowing upload failures to be retried/refunded in later phases"
  - "Pattern 3: File validation happens on both client (future) and server side for security"

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 02 Plan 01: Upload Storage Pipeline - Backend Summary

**Analysis table with atomic credit deduction and file upload endpoint storing poker screenshots to Vercel Blob/local storage**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-17T08:08:47Z
- **Completed:** 2026-02-17T08:12:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Analysis table tracks upload pipeline with status enum (pending, uploaded, analyzing, complete, failed)
- POST /api/upload atomically deducts 1 credit and creates analysis record
- Storage config enforces 10MB limit and PNG/JPG-only validation
- Upload endpoint returns 402 for insufficient credits (payment-required status code)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add analysis table to schema and update storage config** - `cd5c04e` (feat)
2. **Task 2: Create POST /api/upload endpoint with atomic credit deduction** - `6523d1a` (feat)

## Files Created/Modified
- `src/lib/schema.ts` - Added analysis table with userId FK, imageUrl, status, result fields and indexes
- `src/lib/storage.ts` - Updated maxSize to 10MB, restricted allowedTypes to image/jpeg and image/png only
- `src/app/api/upload/route.ts` - POST endpoint with auth, atomic credit deduction, FormData parsing, validation, storage upload
- `drizzle/0003_freezing_toro.sql` - Migration creating analysis table with proper constraints
- `drizzle/meta/_journal.json` - Migration journal updated

## Decisions Made
- **Text UUID for analysis.id:** Used text primary key with crypto.randomUUID() to match BetterAuth's pattern rather than pgTable uuid type
- **No transaction wrapper:** Credit deduction is atomic via WHERE clause; if upload fails, analysis stays "pending" which is correct recovery state
- **JSON text for result field:** Phase 4 AI analysis will populate this as JSON string (easier than jsonb for this use case)
- **db:push over db:migrate:** Database was missing __drizzle_migrations tracking table but had existing schema; used push to sync schema without migration conflicts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Database migration tracking inconsistency**
- **Found during:** Task 1 (Database migration application)
- **Issue:** Migration 0002 (credits column) was already applied to database but __drizzle_migrations table didn't exist to track it, causing migration 0003 to fail when trying to apply all pending migrations
- **Fix:** Used `pnpm run db:push` to synchronize schema directly instead of `pnpm run db:migrate`
- **Files modified:** Database schema (analysis table created)
- **Verification:** Checked analysis table structure via docker exec psql, confirmed all columns and indexes present
- **Committed in:** cd5c04e (Task 1 commit includes generated migration file for reference)

**2. [Rule 1 - Bug] Import order and unused import**
- **Found during:** Task 1 (Initial lint check)
- **Issue:** drizzle-orm import after drizzle-orm/pg-core (ESLint import/order), sql import declared but unused
- **Fix:** Removed unused sql import from schema.ts (only needed for API route)
- **Files modified:** src/lib/schema.ts
- **Verification:** pnpm run lint && pnpm run typecheck passed
- **Committed in:** cd5c04e (Task 1 commit)

**3. [Rule 1 - Bug] TypeScript type safety and import order in upload route**
- **Found during:** Task 2 (Initial lint/typecheck)
- **Issue:** drizzle-orm import after @/lib imports (ESLint), result[0].credits possibly undefined (TypeScript), unused eslint-disable directive
- **Fix:** Reordered imports, added optional chaining with nullish coalescing (result[0]?.credits ?? 0), removed unnecessary eslint-disable
- **Files modified:** src/app/api/upload/route.ts
- **Verification:** pnpm run lint && pnpm run typecheck passed
- **Committed in:** 6523d1a (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking issue, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness and build success. No scope creep. Migration tracking issue required db:push workaround but migration file still generated for documentation.

## Issues Encountered
- **Database migration state:** Existing database had migrations applied but no tracking table. Resolved by using db:push for schema sync (dev-appropriate solution).

## User Setup Required

None - no external service configuration required. Local development uses filesystem storage in public/uploads/. Production will use existing BLOB_READ_WRITE_TOKEN for Vercel Blob.

## Next Phase Readiness

**Ready for Phase 3 (Inngest Async Jobs):**
- Upload endpoint creates analysis records with "uploaded" status
- Analysis table has status field for job state tracking
- imageUrl field populated with storage URL for AI vision input

**Ready for Phase 4 (AI Vision Analysis):**
- result field in analysis table ready for JSON storage
- imageUrl provides input for vision API

**Ready for Phase 6 (History Dashboard):**
- Indexes on userId and status for efficient queries
- Complete audit trail with createdAt/updatedAt timestamps

**No blockers identified.**

---
*Phase: 02-upload-storage-pipeline*
*Completed: 2026-02-17*

## Self-Check: PASSED

All claimed files and commits verified to exist:
- ✓ src/app/api/upload/route.ts
- ✓ drizzle/0003_freezing_toro.sql
- ✓ Commit cd5c04e
- ✓ Commit 6523d1a

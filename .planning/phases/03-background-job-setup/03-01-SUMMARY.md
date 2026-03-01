---
phase: 03-background-job-setup
plan: 01
subsystem: infra
tags: [inngest, background-jobs, event-driven, async-processing]

# Dependency graph
requires:
  - phase: 02-upload-storage-pipeline
    provides: Upload API with analysis record creation and status tracking
provides:
  - Type-safe Inngest client with event schemas for async job processing
  - processAnalysis background function with retry logic and step-based execution
  - Serve handler at /api/inngest for Inngest Dev Server communication
  - Event trigger in upload API that fires after successful storage
affects: [04-ai-vision-analysis, 06-polish-refinement]

# Tech tracking
tech-stack:
  added: [inngest@3.52.0]
  patterns:
    - Event-driven architecture with type-safe events
    - Step-based idempotent function execution
    - Non-retriable errors for validation failures
    - Graceful degradation (event failure doesn't block upload)

key-files:
  created:
    - src/inngest/client.ts
    - src/inngest/types.ts
    - src/inngest/functions.ts
    - src/app/api/inngest/route.ts
  modified:
    - src/app/api/upload/route.ts

key-decisions:
  - "Used EventSchemas.fromRecord<Events>() for compile-time type safety on event payloads"
  - "Set retries: 3 (4 total attempts) to handle transient failures"
  - "Wrapped inngest.send() in try/catch to prevent upload failure if event delivery fails"
  - "Used step.run() for DB status update to ensure idempotent retry behavior"
  - "Threw NonRetriableError for validation failures (missing analysisId or analysis not found)"

patterns-established:
  - "Event-driven pattern: API operations trigger async jobs via events instead of blocking"
  - "Graceful degradation: Event delivery failures are logged but don't fail the primary operation"
  - "Type-safe events: Using TypeScript types for event schemas prevents runtime errors"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 3 Plan 01: Inngest Integration Summary

**Type-safe Inngest client with event-driven async job processing, step-based retry logic, and graceful event delivery degradation**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-17T08:44:15Z
- **Completed:** 2026-02-17T08:47:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed Inngest SDK and created type-safe client with event schemas
- Implemented processAnalysis background function with automatic retry logic (3 retries = 4 total attempts)
- Created Inngest serve handler at /api/inngest that exports GET, POST, PUT for Dev Server
- Wired upload API to trigger "analysis/upload.completed" event after successful storage
- Used step.run() for idempotent database status updates
- Implemented graceful degradation (event failures don't block uploads)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Inngest and create client, types, function, and serve handler** - `413c198` (feat)
2. **Task 2: Wire upload API to trigger Inngest event after successful storage** - `cac3715` (feat)

## Files Created/Modified
- `src/inngest/types.ts` - Type-safe event definitions for "analysis/upload.completed"
- `src/inngest/client.ts` - Inngest client instance with id "poker-ai-review" and typed EventSchemas
- `src/inngest/functions.ts` - processAnalysis function with retries: 3, step.run() for DB update, NonRetriableError validation
- `src/app/api/inngest/route.ts` - Serve handler exporting GET, POST, PUT for Inngest Dev Server communication
- `src/app/api/upload/route.ts` - Added inngest.send() trigger wrapped in try/catch after DB update

## Decisions Made
- **Used EventSchemas.fromRecord<Events>()**: Provides compile-time type safety for event payloads, preventing runtime type errors when sending events
- **Set retries: 3**: Configured automatic retry for transient failures (network issues, temporary DB unavailability) resulting in 4 total attempts (1 initial + 3 retries)
- **Wrapped inngest.send() in try/catch**: Ensures upload succeeds even if Inngest Dev Server is down or event delivery fails - analysis record persists for manual retry
- **Used step.run() for DB updates**: Enables idempotent retries - if function fails after status update, retry won't re-update status
- **Threw NonRetriableError for validation**: Missing analysisId or analysis-not-found errors shouldn't retry (they won't succeed on retry)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all lint, typecheck, and build:ci verification passed successfully.

## User Setup Required

**Inngest Dev Server required for local development.**

Before testing the background job workflow locally, start the Inngest Dev Server:

```bash
npx inngest-cli@latest dev
```

This will:
- Start the Inngest Dev Server at http://localhost:8288
- Auto-discover functions via /api/inngest serve handler
- Provide UI for monitoring events and function executions

**Environment variables:** No additional environment variables required. Inngest SDK auto-detects local dev environment.

**Verification:** After uploading a screenshot, visit http://localhost:8288 to see the "analysis/upload.completed" event and processAnalysis function execution.

## Next Phase Readiness

**Ready for Phase 4 (AI Vision Analysis):**
- Background job infrastructure is complete
- processAnalysis function has a TODO placeholder for Phase 4 AI analysis step
- Event-driven architecture allows Phase 4 to add additional steps without modifying upload API
- Retry logic and error handling patterns established

**Integration points for Phase 4:**
- Add OpenRouter vision API call in new step.run() block in processAnalysis function
- Update analysis status to "completed" or "failed" based on AI response
- Populate analysis.result field with structured JSON from AI

**No blockers identified.**

## Self-Check: PASSED

All claims verified:
- ✓ FOUND: src/inngest/client.ts
- ✓ FOUND: src/inngest/types.ts
- ✓ FOUND: src/inngest/functions.ts
- ✓ FOUND: src/app/api/inngest/route.ts
- ✓ FOUND: 413c198 (Task 1 commit)
- ✓ FOUND: cac3715 (Task 2 commit)

---
*Phase: 03-background-job-setup*
*Completed: 2026-02-17*

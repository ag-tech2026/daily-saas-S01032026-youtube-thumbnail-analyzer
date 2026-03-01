---
phase: 03-background-job-setup
verified: 2026-02-17T15:55:00Z
status: human_needed
score: 5/5
human_verification:
  - test: "Start Inngest Dev Server and upload a screenshot"
    expected: "Event appears in Inngest dashboard, function executes, status changes to processing"
    why_human: "Runtime behavior requires dev server and Inngest Dev Server interaction"
  - test: "Verify retry behavior by introducing temporary DB failure"
    expected: "Failed job retries up to 3 times with exponential backoff visible in dashboard"
    why_human: "Runtime retry behavior and exponential backoff timing requires live observation"
  - test: "Check Inngest dashboard shows event history"
    expected: "Dashboard at localhost:8288 displays event stream and function execution logs"
    why_human: "External service UI verification requires human interaction"
---

# Phase 3: Background Job Setup Verification Report

**Phase Goal:** Upload triggers background job that processes asynchronously with retry support
**Verified:** 2026-02-17T15:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                               | Status     | Evidence                                                              |
| --- | ----------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| 1   | Inngest client is initialized with id poker-ai-review and type-safe event schemas  | ✓ VERIFIED | client.ts exports inngest with id "poker-ai-review", EventSchemas     |
| 2   | Upload API triggers analysis/upload.completed event after successful storage        | ✓ VERIFIED | upload/route.ts calls inngest.send after DB update with typed payload |
| 3   | Background function updates analysis status to processing when job starts           | ✓ VERIFIED | functions.ts step.run updates status to "processing" via Drizzle      |
| 4   | Failed jobs automatically retry up to 3 times (4 total attempts) per step           | ✓ VERIFIED | processAnalysis configured with retries: 3                            |
| 5   | Inngest serve handler at /api/inngest exports GET, POST, PUT for function discovery | ✓ VERIFIED | route.ts exports GET, POST, PUT from serve() with processAnalysis     |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                          | Expected                                                          | Status     | Details                                                                     |
| --------------------------------- | ----------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `src/inngest/client.ts`           | Inngest client instance with typed event schemas                  | ✓ VERIFIED | 7 lines, exports inngest with id "poker-ai-review", EventSchemas.fromRecord |
| `src/inngest/types.ts`            | Type-safe event definitions for analysis/upload.completed         | ✓ VERIFIED | 9 lines, exports Events type with analysisId, userId, imageUrl payload      |
| `src/inngest/functions.ts`        | processAnalysis function with step.run for DB status update       | ✓ VERIFIED | 50 lines, retries: 3, step.run("update-status-processing"), NonRetriableError |
| `src/app/api/inngest/route.ts`    | Serve handler registering all Inngest functions                   | ✓ VERIFIED | 8 lines, exports GET, POST, PUT from serve() with processAnalysis array     |
| `src/app/api/upload/route.ts`     | Upload endpoint now triggers Inngest event after storage          | ✓ VERIFIED | Modified with inngest.send call wrapped in try/catch after DB update        |

### Key Link Verification

| From                              | To                    | Via                                               | Status     | Details                                                                  |
| --------------------------------- | --------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `src/app/api/upload/route.ts`     | `src/inngest/client.ts` | inngest.send() after successful storage           | ✓ WIRED    | Line 114: inngest.send with "analysis/upload.completed" event            |
| `src/inngest/functions.ts`        | `src/lib/schema.ts`   | Drizzle update analysis status in step.run()      | ✓ WIRED    | Lines 23-30: db.update(analysis).set({ status: "processing" })           |
| `src/app/api/inngest/route.ts`    | `src/inngest/functions.ts` | serve() registers processAnalysis function        | ✓ WIRED    | Line 7: functions: [processAnalysis]                                     |

**Link Details:**

1. **Upload → Inngest Client:** Upload route imports inngest client and calls `inngest.send()` with typed event payload after DB update succeeds. Event sending wrapped in try/catch for graceful degradation.
2. **processAnalysis → Database:** Function uses `step.run("update-status-processing")` to update analysis status via Drizzle ORM, with `.returning()` to validate record exists. Throws NonRetriableError if not found.
3. **Serve Handler → Function:** Inngest serve handler at /api/inngest registers processAnalysis in functions array, enabling Inngest Dev Server to discover and execute the function.

### Requirements Coverage

Phase 3 maps to requirement **ANLYS-04** from REQUIREMENTS.md (not verified - REQUIREMENTS.md not checked in verification scope).

### Anti-Patterns Found

| File                          | Line | Pattern      | Severity | Impact                                                        |
| ----------------------------- | ---- | ------------ | -------- | ------------------------------------------------------------- |
| `src/inngest/functions.ts`    | 41   | TODO comment | ℹ️ Info  | Intentional placeholder for Phase 4 AI vision analysis step   |

**Analysis:**

The TODO comment is intentional and documented in the plan. It marks the integration point for Phase 4's AI vision analysis. This is not a blocker—it's a documented extension point.

No other anti-patterns found:
- No empty implementations or stub returns
- No console.log-only functions
- All exports are substantive and wired
- Proper error handling with NonRetriableError
- Graceful degradation for event delivery failures

### Human Verification Required

#### 1. Inngest Dev Server Integration

**Test:**
1. Start Inngest Dev Server: `npx inngest-cli@latest dev`
2. Start Next.js dev server: `pnpm dev`
3. Navigate to localhost:8288 (Inngest dashboard)
4. Upload a screenshot via the upload UI
5. Check Inngest dashboard for event

**Expected:**
- Event "analysis/upload.completed" appears in dashboard event stream
- processAnalysis function execution starts automatically
- Function logs show "update-status-processing" step completing
- Analysis record in database changes status from "uploaded" to "processing"

**Why human:** Runtime event delivery, function discovery, and execution requires both dev servers running and observing dashboard UI.

#### 2. Retry Behavior Verification

**Test:**
1. Temporarily disable database connection or introduce failure in processAnalysis
2. Upload a screenshot to trigger the function
3. Observe Inngest dashboard for retry attempts
4. Check retry timing for exponential backoff pattern

**Expected:**
- Function fails initially
- Inngest automatically retries up to 3 times (4 total attempts)
- Dashboard shows retry timing with increasing delays (exponential backoff)
- After 4 failures, function marked as permanently failed

**Why human:** Runtime retry behavior and timing observation requires live system monitoring and dashboard interaction.

#### 3. Event History and Dashboard

**Test:**
1. Upload multiple screenshots
2. Navigate to Inngest dashboard at localhost:8288
3. Check event history tab
4. Check function runs tab

**Expected:**
- All "analysis/upload.completed" events visible in history
- Each event shows payload with analysisId, userId, imageUrl
- Function runs show step execution details
- Success/failure status visible for each run

**Why human:** External service UI requires human interaction to navigate and verify dashboard features.

### Gaps Summary

**No gaps found.** All must-haves are verified at the code level:

1. ✓ Inngest client initialized with correct ID and type-safe schemas
2. ✓ Upload API triggers event after successful storage with graceful degradation
3. ✓ processAnalysis function updates status using idempotent step.run()
4. ✓ Retry configuration set to 3 (4 total attempts)
5. ✓ Serve handler exports GET, POST, PUT with function registration

**Code verification complete.** All artifacts exist, are substantive (not stubs), and properly wired. The TODO comment is an intentional Phase 4 placeholder, not a gap.

**Runtime verification pending:** Three human verification tests documented above require dev server and Inngest Dev Server to validate runtime behavior (event delivery, retry timing, dashboard integration).

---

_Verified: 2026-02-17T15:55:00Z_
_Verifier: Claude (gsd-verifier)_

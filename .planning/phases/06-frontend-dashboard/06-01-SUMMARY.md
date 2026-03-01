---
phase: 06-frontend-dashboard
plan: 01
subsystem: api, ui
tags: [drizzle, next-js, react, dashboard, analysis, idor]

# Dependency graph
requires:
  - phase: 02-upload-storage-pipeline
    provides: analysis table schema with status, result, userId, imageUrl
  - phase: 04-ai-vision-analysis
    provides: result JSON with overallVerdict, analysis status lifecycle

provides:
  - GET /api/analyses — user's analyses list sorted newest-first (limit 50)
  - GET /api/analyses/[id] — single analysis with IDOR protection (userId check)
  - Dashboard history list with status badges, date, and verdict display
  - /analysis route protection in proxy and session config

affects:
  - 06-frontend-dashboard (plan 02 — analysis detail page uses /api/analyses/[id])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Next.js 16 async params pattern — `{ params }: { params: Promise<{ id: string }> }` with `const { id } = await params`
    - IDOR protection via AND(eq(id), eq(userId)) — 404 response avoids disclosing existence
    - Drizzle orderBy desc + limit for paginated list queries
    - Status badge helper mapping 5 states to shadcn Badge variants

key-files:
  created:
    - src/app/api/analyses/route.ts
    - src/app/api/analyses/[id]/route.ts
  modified:
    - src/app/dashboard/page.tsx
    - src/proxy.ts
    - src/lib/session.ts

key-decisions:
  - "Return 404 (not 403) for IDOR protection — avoids disclosing whether resource exists"
  - "Limit analyses list to 50 rows — sufficient for dashboard history, prevents abuse"
  - "Use getOverallVerdict safe JSON.parse with try/catch — result field may be malformed"
  - "Empty state links to /upload with CTA — converts dead end into action"

patterns-established:
  - "Import order: next/* before drizzle-orm before @/lib/* (no blank lines between groups)"
  - "Auth pattern: getSession + 401 JSON response (not redirect) in API routes"
  - "History items: Link wrapper with flex justify-between for clickable card rows"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 06 Plan 01: Analysis API Routes and Dashboard History Summary

**Two Drizzle-powered API routes (list + IDOR-protected single) and a dashboard history section with 5-state badge rendering linking to /analysis/[id]**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T16:29:36Z
- **Completed:** 2026-02-18T16:32:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- GET /api/analyses returns authenticated user's analyses sorted newest-first with limit 50
- GET /api/analyses/[id] fetches single analysis with userId ownership check, returns 404 on miss
- Dashboard shows Recent Analyses section with status badges (pending/uploaded/processing/complete/failed), formatted dates, and overall verdict from parsed JSON result
- /analysis routes protected in both proxy matcher and session protectedRoutes for defense in depth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create analysis API routes (list and single)** - `85b4459` (feat)
2. **Task 2: Add history list to dashboard and update proxy/session config** - `abd4089` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/api/analyses/route.ts` - GET list endpoint: auth check, Drizzle query with userId filter + orderBy desc + limit 50
- `src/app/api/analyses/[id]/route.ts` - GET single endpoint: async params, IDOR protection with AND userId check, 404 on miss
- `src/app/dashboard/page.tsx` - Added history state, useEffect fetch, getStatusBadge helper, getOverallVerdict helper, Recent Analyses section with skeletons, empty state, and clickable list items
- `src/proxy.ts` - Added /analysis/:path* to matcher array
- `src/lib/session.ts` - Added "/analysis" to protectedRoutes array

## Decisions Made
- Return 404 (not 403) for IDOR protection: avoids disclosing whether resource exists to unauthorized users
- Limit analyses list to 50 rows: sufficient for dashboard view, prevents unbounded data return
- getOverallVerdict uses safe try/catch JSON.parse: result field stored as text, may be null or malformed
- Empty state CTA links to /upload: converts dead end into conversion opportunity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint import order warnings**
- **Found during:** Task 1 (Create analysis API routes)
- **Issue:** Initial import ordering put `next/headers` after `drizzle-orm`, triggering import/order warnings. Second attempt with blank line also failed.
- **Fix:** Reorganized to match project pattern from upload/route.ts: `next/*` first, then `drizzle-orm`, then `@/lib/*`, no blank lines between groups
- **Files modified:** src/app/api/analyses/route.ts, src/app/api/analyses/[id]/route.ts
- **Verification:** `pnpm run lint` passes with 0 errors, 0 warnings
- **Committed in:** 85b4459 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — import order)
**Impact on plan:** Minor formatting fix, no scope creep or behavior changes.

## Issues Encountered
- ESLint import/order rule requires specific grouping without blank lines — discovered by reading existing route pattern in upload/route.ts, fixed in one iteration.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /api/analyses and /api/analyses/[id] endpoints ready for Plan 02 (analysis detail page polling)
- Dashboard history list is live and functional
- /analysis route protection in place for detail page that Plan 02 will build
- No blockers for Plan 02

## Self-Check: PASSED

All created files exist on disk. Both commits verified in git log.

---
*Phase: 06-frontend-dashboard*
*Completed: 2026-02-18*

---
phase: 07-landing-page-polish
plan: 02
subsystem: infra
tags: [sentry, error-monitoring, nextjs, typescript]

# Dependency graph
requires:
  - phase: 07-landing-page-polish-01
    provides: landing page and homepage in production-ready state

provides:
  - Sentry error monitoring configured for server, client, and edge runtimes
  - Global React error boundary catching unhandled render errors
  - next.config.ts wrapped with withSentryConfig preserving all existing config

affects: [deployment, production-readiness]

# Tech tracking
tech-stack:
  added: ["@sentry/nextjs 10.39.0"]
  patterns:
    - "instrumentation.ts pattern for runtime-conditional Sentry init (nodejs vs edge)"
    - "instrumentation-client.ts for client-side Sentry + Session Replay"
    - "global-error.tsx as React error boundary calling Sentry.captureException"
    - "withSentryConfig wrapper pattern preserving existing Next.js config"

key-files:
  created:
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - instrumentation.ts
    - instrumentation-client.ts
    - src/app/global-error.tsx
  modified:
    - next.config.ts
    - package.json

key-decisions:
  - "Use webpack.treeshake.removeDebugLogging instead of deprecated disableLogger option"
  - "Export onRouterTransitionStart from instrumentation-client.ts for navigation tracking (Sentry ACTION REQUIRED)"
  - "DSN read from NEXT_PUBLIC_SENTRY_DSN env var — not hardcoded in config files"
  - "No org/project in withSentryConfig — set via SENTRY_ORG/SENTRY_PROJECT env vars in CI"
  - "tracesSampleRate: 1.0 in dev, 0.1 in production — full dev coverage, cost-efficient prod"

patterns-established:
  - "Sentry init pattern: conditional on NEXT_RUNTIME for server vs edge runtime separation"
  - "Global error boundary always calls Sentry.captureException in useEffect"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 7 Plan 02: Sentry Error Monitoring Summary

**@sentry/nextjs fully configured across server, client, and edge runtimes with Session Replay and navigation instrumentation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T00:55:15Z
- **Completed:** 2026-02-20T00:58:35Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments

- Installed @sentry/nextjs 10.39.0 and created all 5 required config files
- Configured server, edge, and client Sentry inits reading DSN from NEXT_PUBLIC_SENTRY_DSN
- Added Session Replay integration and navigation transition instrumentation
- Wrapped next.config.ts with withSentryConfig preserving existing security headers and image config
- Created global-error.tsx React error boundary to capture unhandled render errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sentry and create all configuration files** - `be7ab4e` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `sentry.server.config.ts` - Node.js runtime Sentry init, reads DSN from env
- `sentry.edge.config.ts` - Edge runtime Sentry init, reads DSN from env
- `instrumentation.ts` - Conditionally imports server/edge configs based on NEXT_RUNTIME, exports onRequestError
- `instrumentation-client.ts` - Client-side Sentry init with Session Replay, exports onRouterTransitionStart
- `src/app/global-error.tsx` - React error boundary, calls Sentry.captureException on error
- `next.config.ts` - Wrapped with withSentryConfig, added webpack.treeshake.removeDebugLogging
- `package.json` - Added @sentry/nextjs 10.39.0 dependency
- `pnpm-lock.yaml` - Updated lock file

## Decisions Made

- Used `webpack.treeshake.removeDebugLogging` instead of deprecated `disableLogger` option — avoids deprecation warning in build output
- Exported `onRouterTransitionStart = Sentry.captureRouterTransitionStart` from instrumentation-client.ts — Sentry SDK marked this as "ACTION REQUIRED" for navigation instrumentation
- DSN read from `NEXT_PUBLIC_SENTRY_DSN` env var — not hardcoded, user must configure in Sentry Dashboard
- No `org` or `project` in withSentryConfig options — set via env vars during CI to avoid hardcoding project-specific values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed invalid hideSourceMaps option**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** `hideSourceMaps` option no longer exists in `SentryBuildOptions` type — TypeScript error TS2561
- **Fix:** Removed `hideSourceMaps: true` from withSentryConfig options (option was renamed to `sourcemaps` in newer versions)
- **Files modified:** next.config.ts
- **Verification:** `pnpm typecheck` passes with no errors
- **Committed in:** be7ab4e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed deprecated disableLogger option**
- **Found during:** Task 1 (build output review)
- **Issue:** `disableLogger: true` produced deprecation warning: "disableLogger is deprecated and will be removed in a future version"
- **Fix:** Replaced with `webpack: { treeshake: { removeDebugLogging: true } }` — the new correct path per Sentry docs
- **Files modified:** next.config.ts
- **Verification:** `pnpm build:ci` succeeds with no deprecation warnings
- **Committed in:** be7ab4e (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added onRouterTransitionStart export**
- **Found during:** Task 1 (build output review)
- **Issue:** Sentry build output showed "ACTION REQUIRED: To instrument navigations, the Sentry SDK requires you to export an onRouterTransitionStart hook from your instrumentation-client.(js|ts) file"
- **Fix:** Added `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;` to instrumentation-client.ts
- **Files modified:** instrumentation-client.ts
- **Verification:** `pnpm build:ci` succeeds with no action-required warnings
- **Committed in:** be7ab4e (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** All fixes necessary for correct typing and complete navigation instrumentation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

**External services require manual configuration before Sentry captures errors:**

1. Create a Sentry project at https://sentry.io -> Projects -> Create Project (select Next.js platform)
2. Set `NEXT_PUBLIC_SENTRY_DSN` from Sentry Dashboard -> Project Settings -> Client Keys (DSN)
3. Set `SENTRY_AUTH_TOKEN` from Sentry Dashboard -> Settings -> Auth Tokens (for source map uploads in CI)
4. Optionally set `SENTRY_ORG` and `SENTRY_PROJECT` env vars for CI source map upload

Without `NEXT_PUBLIC_SENTRY_DSN`, Sentry inits silently with no DSN and does not capture errors.

## Next Phase Readiness

- Sentry infrastructure complete — will capture errors once DSN is configured
- Phase 7 Plan 03 (Verification Checkpoint) is the final step before project completion
- All production-readiness infrastructure is in place: auth, upload, AI analysis, payments, analytics/monitoring

## Self-Check: PASSED

All files verified present:
- FOUND: instrumentation.ts
- FOUND: instrumentation-client.ts
- FOUND: sentry.server.config.ts
- FOUND: sentry.edge.config.ts
- FOUND: src/app/global-error.tsx
- FOUND: next.config.ts (contains withSentryConfig)
- FOUND: @sentry/nextjs in package.json

Commit be7ab4e verified in git log.

---
*Phase: 07-landing-page-polish*
*Completed: 2026-02-20*

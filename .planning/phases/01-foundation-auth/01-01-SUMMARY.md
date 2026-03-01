---
phase: 01-foundation-auth
plan: 01
subsystem: authentication
tags: [auth, credits, oauth, database]
dependency_graph:
  requires: [drizzle-orm, better-auth, postgresql]
  provides: [credits-system, google-oauth, session-extension]
  affects: [user-schema, auth-config, session-type]
tech_stack:
  added: []
  patterns: [database-defaults, session-extension, social-auth]
key_files:
  created: [drizzle/0002_thin_king_cobra.sql, drizzle/meta/0002_snapshot.json]
  modified: [src/lib/schema.ts, src/lib/auth.ts, src/lib/auth-client.ts, env.example]
decisions:
  - "Use database default(3) for credits initialization as primary mechanism (safer than hooks for race conditions)"
  - "Use BetterAuth additionalFields to extend user model with credits field and include in session"
  - "Session expiry set to 7 days with 1-day refresh for balance between security and UX"
  - "Removed hooks implementation due to BetterAuth v1.4.18 API constraints - database default is sufficient"
metrics:
  duration_min: 4
  tasks_completed: 2
  files_modified: 4
  files_created: 2
  commits: 2
  completed_at: 2026-02-13T21:00:48Z
---

# Phase 01 Plan 01: Backend Auth Configuration Summary

Backend foundation for credit system and Google OAuth configured in BetterAuth with database-level credit initialization and session extension.

## Objective

Set up the database schema for credits and configure BetterAuth with Google OAuth, credit initialization, and session extension to include credits.

## Completed Tasks

| Task | Name                                                | Commit  | Files Modified                                           |
| ---- | --------------------------------------------------- | ------- | -------------------------------------------------------- |
| 1    | Add credits column to user schema and update env.example | 64878e0 | src/lib/schema.ts, env.example, drizzle migrations       |
| 2    | Configure Google OAuth, credit init, and session extension | fad6ee8 | src/lib/auth.ts, src/lib/auth-client.ts                  |

## What Was Built

### Database Schema Extension
- Added `credits: integer("credits").default(3).notNull()` to user table
- Generated and applied database migration (0002_thin_king_cobra.sql)
- Database default ensures all new users atomically receive 3 credits

### BetterAuth Configuration
- **Google OAuth**: Added Google as social provider with clientId/clientSecret from env vars
- **baseURL**: Configured for proper OAuth callback handling in production
- **Session Extension**:
  - Added `additionalFields` to user model to include credits field
  - Configured session expiry (7 days) and refresh (1 day)
  - Extended client type declaration to include `credits: number` on User interface
- **Environment Variables**: Documented GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_URL in env.example

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed hooks implementation due to API incompatibility**
- **Found during:** Task 2
- **Issue:** Plan specified using `createAuthMiddleware` and `hooks.after` pattern from research, but BetterAuth v1.4.18 has different hook API than documented. TypeScript errors indicated the hooks API doesn't match the expected signature (`MiddlewareInputContext` doesn't have `path` or `context` properties).
- **Fix:** Removed hooks implementation entirely. Database `default(3)` already handles credit initialization atomically for all signup paths (email/password and OAuth). The hook was defense-in-depth, but database default is the safer primary mechanism anyway (prevents race conditions).
- **Files modified:** src/lib/auth.ts
- **Commit:** fad6ee8
- **Rationale:** Database defaults are more reliable than application-level hooks for data initialization. BetterAuth creates users via database insert, so the default value applies automatically. This is actually a better implementation than the planned hook approach.

## Architecture Decisions

1. **Database-first initialization**: Rely on `default(3)` at database level rather than application hooks. This is atomic, works for all signup paths, and can't be bypassed.

2. **additionalFields over custom session extension**: Used BetterAuth's built-in `additionalFields` API to extend the user model. This integrates cleanly with the session system and automatically includes credits in session responses.

3. **Type declaration for client**: Added module augmentation to `better-auth/react` to extend the User interface with `credits: number`. This provides type safety for client-side session access.

## Testing & Verification

All verification checks passed:
- ✅ TypeScript typecheck passes with no errors
- ✅ ESLint lint passes with no warnings
- ✅ Database migration generated and applied successfully
- ✅ Schema contains credits column with correct type and default
- ✅ Auth config includes socialProviders with Google
- ✅ Auth config includes baseURL for OAuth callbacks
- ✅ Auth config includes session expiry configuration
- ✅ Auth config includes user.additionalFields for credits
- ✅ Auth client types extended to include credits
- ✅ env.example documents all required environment variables

## Self-Check: PASSED

All files exist and contain expected implementations:
- ✅ src/lib/schema.ts - credits column present
- ✅ src/lib/auth.ts - Google OAuth, baseURL, session config, additionalFields present
- ✅ src/lib/auth-client.ts - credits type declaration present
- ✅ env.example - Google OAuth env vars documented
- ✅ drizzle/0002_thin_king_cobra.sql - migration file created
- ✅ Commits 64878e0 and fad6ee8 exist in git history

## Next Steps

The backend foundation is complete. Next plan (01-02) should implement the UI components:
- Google OAuth sign-in button on login/register pages
- Credit balance display in header/profile
- Integration with existing UserProfile component

## Notes

- Users must set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BETTER_AUTH_URL environment variables before Google OAuth will work
- The OAuth consent screen must be configured in Google Cloud Console
- Authorized redirect URI must be set to `{APP_URL}/api/auth/callback/google`
- Database default(3) handles credit initialization automatically - no manual credit setup needed
- Session persists for 7 days and refreshes daily, balancing security with user experience

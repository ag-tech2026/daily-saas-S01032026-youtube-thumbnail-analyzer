---
phase: quick
plan: 1
subsystem: auth
tags: [auth, google-oauth, cleanup]
dependency_graph:
  requires: []
  provides: [google-only-auth-ui, clean-auth-config]
  affects: [src/lib/auth.ts, src/lib/auth-client.ts, src/app/(auth)/login, src/app/(auth)/register, src/components/auth/user-profile.tsx]
tech_stack:
  added: []
  patterns: [google-oauth-only, single-provider-auth]
key_files:
  created: []
  modified:
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/components/auth/user-profile.tsx
  deleted:
    - src/components/auth/sign-in-button.tsx
    - src/components/auth/sign-up-form.tsx
    - src/components/auth/forgot-password-form.tsx
    - src/components/auth/reset-password-form.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
decisions:
  - Replaced two-button header (Sign in / Sign up) with single GoogleSignInButton for streamlined UX
  - Cleared .next build cache to resolve stale validator.ts type errors referencing deleted pages
metrics:
  duration: 3 min
  completed: 2026-02-18
  tasks_completed: 2
  files_changed: 11
---

# Quick Task 1: Remove Email/Password Auth - Google Only Summary

**One-liner:** Stripped all email/password auth configuration, UI, and pages, leaving Google OAuth as the sole authentication method across server config, client exports, and all auth pages.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Remove email/password from server config and client exports | 39c0658 | auth.ts: removed emailAndPassword + emailVerification blocks; auth-client.ts: removed signUp, requestPasswordReset, resetPassword, sendVerificationEmail |
| 2 | Delete email auth components/pages and simplify remaining pages | 413d084 | Deleted 6 email-only files; rewrote login/register pages to Google-only; rewrote user-profile.tsx to show GoogleSignInButton when logged out |

## What Was Built

Google-only authentication flow:

- `src/lib/auth.ts`: BetterAuth configured with `socialProviders.google` only — no `emailAndPassword` or `emailVerification` blocks
- `src/lib/auth-client.ts`: Exports `signIn`, `signOut`, `useSession`, `getSession` only — no email-specific functions
- `src/app/(auth)/login/page.tsx`: Shows `GoogleSignInButton` + "Don't have an account? Sign up" link
- `src/app/(auth)/register/page.tsx`: Shows `GoogleSignInButton` + "Already have an account? Sign in" link
- `src/components/auth/user-profile.tsx`: Shows `GoogleSignInButton` directly when not authenticated (no Sign in / Sign up button pair)

### Deleted Files

- `src/components/auth/sign-in-button.tsx` (email/password sign-in form)
- `src/components/auth/sign-up-form.tsx` (email/password sign-up form)
- `src/components/auth/forgot-password-form.tsx` (password reset request form)
- `src/components/auth/reset-password-form.tsx` (password reset form)
- `src/app/(auth)/forgot-password/page.tsx` + directory
- `src/app/(auth)/reset-password/page.tsx` + directory

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale .next build cache type errors**
- **Found during:** Task 2 verification
- **Issue:** TypeScript reported errors in `.next/types/validator.ts` referencing deleted `forgot-password/page.js` and `reset-password/page.js` modules
- **Fix:** Deleted `.next/` directory to clear stale generated types; subsequent typecheck passed cleanly
- **Files modified:** None (cache cleared)
- **Commit:** Inline fix before Task 2 commit

None other — plan executed as written otherwise.

## Verification Results

1. `pnpm run lint && pnpm run typecheck` passes (0 errors, 3 pre-existing `<img>` warnings from analysis page)
2. No references to deleted components remain in codebase
3. `src/lib/auth.ts` contains `socialProviders.google` but NOT `emailAndPassword` or `emailVerification`
4. `src/lib/auth-client.ts` does NOT export `signUp`, `requestPasswordReset`, `resetPassword`, or `sendVerificationEmail`
5. Only 3 files remain in `src/components/auth/`: `google-sign-in-button.tsx`, `sign-out-button.tsx`, `user-profile.tsx`

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/auth.ts
- FOUND: src/lib/auth-client.ts
- FOUND: src/app/(auth)/login/page.tsx
- FOUND: src/app/(auth)/register/page.tsx
- FOUND: src/components/auth/user-profile.tsx
- FOUND: src/components/auth/google-sign-in-button.tsx (unchanged)
- CONFIRMED DELETED: sign-in-button.tsx, sign-up-form.tsx, forgot-password-form.tsx, reset-password-form.tsx, forgot-password/page.tsx, reset-password/page.tsx

Commits verified:
- FOUND: 39c0658 (Task 1)
- FOUND: 413d084 (Task 2)

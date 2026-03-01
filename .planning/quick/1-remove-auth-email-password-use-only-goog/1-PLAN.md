---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/auth.ts
  - src/lib/auth-client.ts
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/register/page.tsx
  - src/components/auth/user-profile.tsx
autonomous: true
must_haves:
  truths:
    - "Login page shows only Google sign-in button, no email/password form"
    - "Register page shows only Google sign-in button, no email/password form"
    - "No forgot-password or reset-password pages exist"
    - "BetterAuth server config has no emailAndPassword or emailVerification blocks"
    - "Header shows single Sign in button (no separate Sign up) when logged out"
  artifacts:
    - path: "src/lib/auth.ts"
      provides: "BetterAuth config with Google-only auth"
      contains: "socialProviders"
    - path: "src/lib/auth-client.ts"
      provides: "Auth client exports without email-specific functions"
    - path: "src/app/(auth)/login/page.tsx"
      provides: "Google-only login page"
    - path: "src/app/(auth)/register/page.tsx"
      provides: "Google-only register page"
  key_links:
    - from: "src/app/(auth)/login/page.tsx"
      to: "src/components/auth/google-sign-in-button.tsx"
      via: "import GoogleSignInButton"
      pattern: "GoogleSignInButton"
---

<objective>
Remove email/password authentication entirely and make Google OAuth the only sign-in method.

Purpose: Simplify authentication to Google-only, removing unused email/password forms, forgot-password, and reset-password flows.
Output: Clean Google-only auth across server config, client exports, pages, and components.
</objective>

<execution_context>
@/home/ars/.claude/get-shit-done/workflows/execute-plan.md
@/home/ars/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/auth.ts
@src/lib/auth-client.ts
@src/app/(auth)/login/page.tsx
@src/app/(auth)/register/page.tsx
@src/components/auth/user-profile.tsx
@src/components/auth/google-sign-in-button.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove email/password auth from server config and client exports</name>
  <files>
    src/lib/auth.ts
    src/lib/auth-client.ts
  </files>
  <action>
In `src/lib/auth.ts`:
- Remove the entire `emailAndPassword: { ... }` block (lines 14-21)
- Remove the entire `emailVerification: { ... }` block (lines 22-29)
- Keep everything else intact: `database`, `baseURL`, `socialProviders.google`, `user.additionalFields`, `session`, `plugins` (Polar)

In `src/lib/auth-client.ts`:
- Remove `signUp`, `requestPasswordReset`, `resetPassword`, `sendVerificationEmail` from the destructured exports
- Keep: `signIn`, `signOut`, `useSession`, `getSession`, `authClient`
- Keep the `declare module` type extension for credits
  </action>
  <verify>Run `pnpm run lint && pnpm run typecheck` -- should pass with no errors related to removed exports (deleted components that imported them will also be removed in Task 2)</verify>
  <done>auth.ts has no emailAndPassword or emailVerification config. auth-client.ts exports only Google-compatible functions (signIn, signOut, useSession, getSession).</done>
</task>

<task type="auto">
  <name>Task 2: Delete email auth components/pages and simplify remaining pages</name>
  <files>
    src/components/auth/sign-in-button.tsx
    src/components/auth/sign-up-form.tsx
    src/components/auth/forgot-password-form.tsx
    src/components/auth/reset-password-form.tsx
    src/app/(auth)/forgot-password/page.tsx
    src/app/(auth)/reset-password/page.tsx
    src/app/(auth)/login/page.tsx
    src/app/(auth)/register/page.tsx
    src/components/auth/user-profile.tsx
  </files>
  <action>
DELETE these files entirely (they are email/password-only components and pages):
- `src/components/auth/sign-in-button.tsx` (email/password sign-in form)
- `src/components/auth/sign-up-form.tsx` (email/password sign-up form)
- `src/components/auth/forgot-password-form.tsx` (password reset request form)
- `src/components/auth/reset-password-form.tsx` (password reset form)
- `src/app/(auth)/forgot-password/page.tsx` (forgot password page)
- `src/app/(auth)/reset-password/page.tsx` (reset password page)

Also delete the now-empty directories:
- `src/app/(auth)/forgot-password/`
- `src/app/(auth)/reset-password/`

REWRITE `src/app/(auth)/login/page.tsx`:
- Remove imports of `SignInButton` and `Separator`
- Keep imports of `GoogleSignInButton`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `auth`, `headers`, `redirect`
- Remove the `searchParams` prop and `reset` query param handling entirely
- Remove the separator div and `<SignInButton />` component
- Show only `<GoogleSignInButton />` inside CardContent
- Add a link below the button: "Don't have an account? <Link to /register>Sign up</Link>"
- Keep the session check + redirect to /dashboard

REWRITE `src/app/(auth)/register/page.tsx`:
- Remove imports of `SignUpForm` and `Separator`
- Keep imports of `GoogleSignInButton`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `auth`, `headers`, `redirect`
- Remove the separator div and `<SignUpForm />` component
- Show only `<GoogleSignInButton />` inside CardContent
- Add a link below the button: "Already have an account? <Link to /login>Sign in</Link>"
- Keep the session check + redirect to /dashboard

REWRITE `src/components/auth/user-profile.tsx`:
- In the `!session` branch, replace the two separate "Sign in" and "Sign up" buttons with a single `<GoogleSignInButton />` component
- Import `GoogleSignInButton` from `@/components/auth/google-sign-in-button`
- Remove the `Link` import from "next/link" (no longer needed since GoogleSignInButton handles its own navigation)
- Keep the entire authenticated dropdown menu unchanged
  </action>
  <verify>
Run `pnpm run lint && pnpm run typecheck` -- must pass cleanly with zero errors.
Verify deleted files don't exist: `ls src/components/auth/sign-in-button.tsx src/components/auth/sign-up-form.tsx src/components/auth/forgot-password-form.tsx src/components/auth/reset-password-form.tsx src/app/\(auth\)/forgot-password/ src/app/\(auth\)/reset-password/ 2>&1` should show "No such file" for all.
Verify no remaining imports of deleted components: `grep -r "sign-in-button\|sign-up-form\|forgot-password-form\|reset-password-form\|SignInButton\|SignUpForm\|ForgotPasswordForm\|ResetPasswordForm" src/` should return empty.
  </verify>
  <done>Only Google auth UI exists. Login and register pages show GoogleSignInButton only. No email/password forms, no forgot/reset password pages. Header shows GoogleSignInButton when logged out. Lint and typecheck pass.</done>
</task>

</tasks>

<verification>
1. `pnpm run lint && pnpm run typecheck` passes
2. No references to deleted components remain in codebase
3. `src/lib/auth.ts` contains `socialProviders.google` but NOT `emailAndPassword` or `emailVerification`
4. `src/lib/auth-client.ts` does NOT export `signUp`, `requestPasswordReset`, `resetPassword`, or `sendVerificationEmail`
5. Only 3 files remain in `src/components/auth/`: `google-sign-in-button.tsx`, `sign-out-button.tsx`, `user-profile.tsx`
</verification>

<success_criteria>
- Google OAuth is the only authentication method
- All email/password UI and config removed
- No dead code or broken imports
- Lint and typecheck pass cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/1-remove-auth-email-password-use-only-goog/1-SUMMARY.md`
</output>

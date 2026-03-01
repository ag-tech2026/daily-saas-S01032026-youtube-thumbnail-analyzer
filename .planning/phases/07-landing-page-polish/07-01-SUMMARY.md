---
phase: 07-landing-page-polish
plan: 01
subsystem: ui
tags: [landing-page, marketing, seo, nextjs, shadcn, google-oauth, server-components]

# Dependency graph
requires:
  - phase: 06-frontend-dashboard
    provides: analysis detail page UI components and AnalysisResult schema used for mockup
  - phase: 01-foundation-auth
    provides: GoogleSignInButton pattern and signIn.social OAuth flow

provides:
  - Public marketing landing page (Hero -> Pricing -> CTA)
  - sign-up-cta-button: reusable Google OAuth CTA button for landing pages
  - analysis-mockup: static hardcoded replica of real analysis result UI
  - hero-section: split layout with outcome-oriented headline and mockup
  - pricing-section: two-tier pricing cards (Free/Pro Pack)
  - landing-cta-section: bottom CTA strip
  - Poker-specific metadata in layout.tsx and page.tsx (title, OG, JSON-LD)

affects: [08-monitoring, seo, conversion-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component landing page with one client-component leaf (SignUpCtaButton)
    - Hardcoded analysis mockup reusing real UI components for zero-maintenance visual parity
    - Export metadata from page.tsx to override layout.tsx site-wide defaults

key-files:
  created:
    - src/components/landing/sign-up-cta-button.tsx
    - src/components/landing/analysis-mockup.tsx
    - src/components/landing/hero-section.tsx
    - src/components/landing/pricing-section.tsx
    - src/components/landing/landing-cta-section.tsx
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx

key-decisions:
  - "SignUpCtaButton is a new client component (not reuse of GoogleSignInButton) — accepts children/size/variant props for landing page flexibility"
  - "AnalysisMockup uses hardcoded AKo BTN fixture with pointer-events-none to appear non-interactive"
  - "Pro Pack CTA uses SignUpCtaButton (not PurchaseCreditsButton) — public page has no auth session, purchase available post-signup from dashboard"
  - "page.tsx uses fragment wrapper (<>) not <main> — layout.tsx already has <main id=main-content> wrapper"
  - "layout.tsx authors/creator fields removed — no attribution to boilerplate author"

patterns-established:
  - "Pattern: Landing page Server Component with client leaf components at interaction points only"
  - "Pattern: Export metadata const from page.tsx to override site-wide layout.tsx metadata"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 7 Plan 01: Landing Page Components Summary

**Split-layout marketing landing page with hardcoded analysis mockup, two-tier pricing, and Google OAuth CTAs replacing boilerplate homepage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T14:29:48Z
- **Completed:** 2026-02-20T14:32:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created 5 landing page components in `src/components/landing/` — sign-up-cta-button, analysis-mockup, hero-section, pricing-section, landing-cta-section
- Replaced boilerplate homepage (useDiagnostics, SetupChecklist, StarterPromptModal, YouTube iframe) with Server Component landing page
- Updated site-wide metadata in layout.tsx — poker-specific title, description, keywords, OG tags, JSON-LD (applicationCategory: GameApplication)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create landing page components** - `cce712b` (feat)
2. **Task 2: Replace homepage and update metadata** - `3fdb603` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified

- `src/components/landing/sign-up-cta-button.tsx` - "use client" Google OAuth button with customizable children/size/variant props, default text "Analyze Your First 3 Hands Free"
- `src/components/landing/analysis-mockup.tsx` - Server Component with hardcoded AKo BTN demo data, compact card layout showing Hand Details, Analysis, Good Plays, Areas to Improve
- `src/components/landing/hero-section.tsx` - Split layout grid: outcome-oriented H1 + CTA left, AnalysisMockup right
- `src/components/landing/pricing-section.tsx` - Two-tier pricing cards: Free ($0, 3 analyses) and Pro Pack ($9, 50 analyses)
- `src/components/landing/landing-cta-section.tsx` - Bottom CTA strip centered
- `src/app/page.tsx` - Replaced entirely with Server Component: Hero -> Pricing -> CTA, exports poker-specific metadata
- `src/app/layout.tsx` - Updated all metadata fields (title, description, keywords, OG, twitter, JSON-LD), removed authors/creator boilerplate fields

## Decisions Made

- SignUpCtaButton is a new "use client" component rather than wrapping GoogleSignInButton — more flexible props interface for landing page context
- Pro Pack pricing CTA uses SignUpCtaButton ("Sign Up to Purchase") not PurchaseCreditsButton — public page has no session, purchase flow available post-signup from dashboard
- AnalysisMockup uses `pointer-events-none select-none` to make it clearly non-interactive as a preview
- page.tsx uses `<>...</>` fragment wrapper (not `<main>`) — layout.tsx already wraps children in `<main id="main-content">`
- Import order fixed for ESLint import/order rule (3rd-party before @/ aliases)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint import/order warnings on 2 new files (type import ordering) — fixed immediately by reordering imports. No functional impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Landing page complete and type-checks cleanly
- All CTAs route through Google OAuth to /dashboard on success
- Ready for Phase 7 Plan 02: Sentry error monitoring setup

---
*Phase: 07-landing-page-polish*
*Completed: 2026-02-20*

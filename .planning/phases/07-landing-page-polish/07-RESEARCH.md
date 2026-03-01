# Phase 7: Landing Page & Polish - Research

**Researched:** 2026-02-20
**Domain:** Next.js marketing landing page, Sentry error monitoring, shadcn/ui layout
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hero section layout
- Split layout: headline + CTA on left, product UI mockup on right
- Right side shows a rendered preview of the analysis result UI (what users see after uploading)
- Headline is outcome-oriented — speaks to the pain ("Find out if your poker plays are actually correct")
- Primary CTA: "Analyze Your First 3 Hands Free" — concrete phrasing preferred over "3 credits"

#### Pricing section
- Keep existing pricing: 3 free analyses on signup, $9 for 50-credit pack
- Display as two distinct options (free tier vs paid pack)
- Presentation style: Claude's discretion (cards, table, etc.)

#### Demo analysis section
- Skip for now — do not build demo section in this phase
- Page flow: Hero -> Pricing -> CTA (no demo between them)
- Demo section to be added as a future improvement once analysis quality is validated

#### Error monitoring & testing
- Sentry (or similar) configured for error capture — Claude's discretion on provider
- Manual screenshot testing against PokerStars, GGPoker, and 888poker (20+ screenshots per success criteria)
- No automated screenshot testing required in this phase

### Claude's Discretion
- Specific headline copy (outcome-oriented direction given, final wording flexible)
- Exact hero mockup design (should look like actual analysis result UI)
- Pricing section layout (cards vs table)
- Error monitoring provider (Sentry preferred but not locked)
- Any additional social proof or trust signals (testimonials, etc.) — can add if it fits naturally

### Deferred Ideas (OUT OF SCOPE)
- Demo analysis section with real example — deferred until AI output quality is validated
- Video or animated walkthrough of upload flow — future marketing improvement
</user_constraints>

---

## Summary

This phase replaces the boilerplate homepage (`src/app/page.tsx`) with a product-specific marketing landing page for the poker analysis tool. The page needs three sections: a split-layout hero, a two-tier pricing section, and a bottom CTA. The hero's right side will render a static mockup of the analysis result UI built in Phase 6 — using hardcoded sample data that mirrors the actual `AnalysisResult` schema.

The second major work stream is Sentry error monitoring. Sentry's `@sentry/nextjs` package (currently v10.39.0) integrates natively with Next.js 15/16 App Router via a wizard (`npx @sentry/wizard@latest -i nextjs`) that creates all required files. The existing `next.config.ts` must be wrapped with `withSentryConfig()`. No new libraries beyond `@sentry/nextjs` are needed — no third-party pricing components, no animation libraries.

The entire landing page can be built as a standard Next.js Server Component (no `"use client"` required for the static sections), with the CTA signup button being the only client interaction point since it uses BetterAuth's `signIn.social()`. The page replaces `src/app/page.tsx` entirely; existing boilerplate content (SetupChecklist, StarterPromptModal, YouTube iframe) is removed.

**Primary recommendation:** Build the landing page as a Server Component with hardcoded analysis mockup data. Use the Sentry wizard for setup. No new UI libraries needed — shadcn/ui Card + Button + Badge cover all needs.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (installed) | Server Components, routing | Already in project |
| shadcn/ui (Card, Button, Badge) | Installed | All UI primitives | Already in project |
| Tailwind CSS 4 | Installed | Layout, spacing, responsive | Already in project |
| lucide-react | 0.539.0 (installed) | Icons in hero/pricing | Already in project |
| @sentry/nextjs | 10.39.0 (latest) | Error capture, performance | Official SDK, App Router support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BetterAuth authClient | Installed | `signIn.social()` for CTA | CTA button triggers Google OAuth |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sentry/nextjs | Custom error logging | Sentry gives alerting, dashboards, grouping out of the box |
| Hardcoded mockup | Screenshot image | Code-based mockup stays in sync with real UI; image goes stale |
| Server Component page | Client Component page | Server Component renders faster, no session check needed for public page |

### Installation (new package only)
```bash
pnpm add @sentry/nextjs
```

---

## Architecture Patterns

### Landing Page File Structure
```
src/
├── app/
│   ├── page.tsx                          # REPLACE entirely — new landing page
│   └── global-error.tsx                  # CREATE — Sentry React error boundary
├── components/
│   └── landing/
│       ├── hero-section.tsx              # Split layout hero
│       ├── analysis-mockup.tsx           # Static replica of Phase 6 analysis UI
│       ├── pricing-section.tsx           # Two-tier pricing cards
│       └── landing-cta-section.tsx       # Bottom CTA strip
├── instrumentation.ts                    # CREATE — Sentry server/edge registration
├── instrumentation-client.ts             # CREATE — Sentry client-side init
├── sentry.server.config.ts               # CREATE — Sentry server config
└── sentry.edge.config.ts                 # CREATE — Sentry edge config
next.config.ts                            # UPDATE — wrap with withSentryConfig()
```

### Pattern 1: Server Component Landing Page
**What:** The main `page.tsx` is a Server Component (no `"use client"`) that imports sub-sections.
**When to use:** Any public page that doesn't need browser state or auth hooks.
**Example:**
```typescript
// src/app/page.tsx — Server Component
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <PricingSection />
      <LandingCtaSection />
    </main>
  );
}
```

### Pattern 2: Split Hero Layout with Tailwind
**What:** Two-column grid, left for copy/CTA, right for UI mockup. Stacks vertically on mobile.
**When to use:** Standard SaaS hero — proven conversion pattern.
**Example:**
```typescript
// src/components/landing/hero-section.tsx
// Hero uses grid-cols-2 on lg, single col on mobile
<section className="container mx-auto px-4 py-20 lg:py-32">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    {/* Left: copy + CTA */}
    <div className="space-y-6">
      <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
        Find out if your poker plays are actually correct
      </h1>
      <p className="text-xl text-muted-foreground">
        Upload a screenshot. Get GTO analysis in 30 seconds.
      </p>
      <SignUpCtaButton />  {/* "use client" component */}
    </div>
    {/* Right: static analysis mockup */}
    <div className="lg:block">
      <AnalysisMockup />
    </div>
  </div>
</section>
```

### Pattern 3: Static Analysis Mockup
**What:** A hardcoded version of the Phase 6 analysis UI using fabricated `AnalysisResult` data. Renders the same Card/Badge components as the real analysis page.
**Why:** Keeps the mockup visually identical to what users actually see post-signup. No image maintenance.
**Example:**
```typescript
// src/components/landing/analysis-mockup.tsx — Server Component
// Import AnalysisResult type from existing schema, provide static fixture data
import type { AnalysisResult } from "@/lib/analysis-schema";

const DEMO_ANALYSIS: AnalysisResult = {
  hand_info: {
    stakes: "$0.10/$0.25",
    game_type: "Regular",
    hero_position: "BTN",
    hero_hand: "A♠ K♦",
    effective_stack_bb: 100,
    assumptions: [],
  },
  // ... full fixture matching the schema
};
```

### Pattern 4: Pricing Cards (Two-Tier)
**What:** Two side-by-side shadcn/ui Cards. Left = "Free" (3 analyses), Right = "Pro Pack" ($9 / 50 analyses). Right card uses `border-primary` to draw the eye.
**When to use:** Two-option pricing with no toggle needed (no monthly/annual switching).
**Example:**
```typescript
// src/components/landing/pricing-section.tsx — Server Component
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
  <Card>
    <CardHeader>
      <CardTitle>Free</CardTitle>
      <p className="text-3xl font-bold">$0</p>
    </CardHeader>
    <CardContent>
      <ul>
        <li>3 free analyses on signup</li>
        <li>Full GTO feedback</li>
      </ul>
    </CardContent>
    <CardFooter>
      <SignUpCtaButton variant="outline">Get Started Free</SignUpCtaButton>
    </CardFooter>
  </Card>

  <Card className="border-primary">
    <CardHeader>
      <CardTitle>Pro Pack</CardTitle>
      <p className="text-3xl font-bold">$9</p>
    </CardHeader>
    <CardContent>
      <ul>
        <li>50 analyses</li>
        <li>Never expires</li>
      </ul>
    </CardContent>
    <CardFooter>
      <PurchaseCreditsButton className="w-full">Buy 50 Analyses — $9</PurchaseCreditsButton>
    </CardFooter>
  </Card>
</div>
```

### Pattern 5: Sentry Setup for Next.js 16 App Router
**What:** Five files + next.config.ts update. Wizard is the recommended install path.
**When to use:** Any production Next.js app.

```bash
# Run wizard in project root
npx @sentry/wizard@latest -i nextjs
```

Wizard creates these files automatically:
- `instrumentation-client.ts` — client-side DSN init
- `sentry.server.config.ts` — server-side init
- `sentry.edge.config.ts` — edge runtime init
- `instrumentation.ts` — registers server/edge configs via `onRequestError`
- `src/app/global-error.tsx` — React error boundary

Wraps `next.config.ts` with `withSentryConfig()`:
```typescript
// next.config.ts — AFTER wizard
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config preserved
};

export default withSentryConfig(nextConfig, {
  org: "your-org-slug",
  project: "your-project-slug",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

Environment variables needed:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx   # For source maps in CI
```

### Anti-Patterns to Avoid
- **Making landing page a Client Component:** Unnecessary — only the CTA button needs browser interaction. Use a small `"use client"` button component, not the whole page.
- **Using a separate `SetupChecklist` or boilerplate components:** The entire existing `page.tsx` content must be replaced, not extended.
- **Referencing `useDiagnostics` hook in landing page:** This is a boilerplate hook for dev setup — remove it entirely from the landing page.
- **Putting the `GoogleSignInButton` inline as is:** It redirects to `/dashboard` on success; verify this callbackURL still makes sense from the landing page context (it does — correct behavior).
- **Adding `PurchaseCreditsButton` to pricing without auth check:** The existing `PurchaseCreditsButton` calls `authClient.checkout()` which requires login; add a note or redirect non-authed users to sign up first. On the public landing page, consider linking to signup instead of directly to checkout.
- **Skipping `global-error.tsx`:** Without it, unhandled React render errors are not captured by Sentry.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error monitoring | Custom error logging | @sentry/nextjs | Grouping, alerting, performance, replay |
| Pricing cards | Custom pricing component | shadcn/ui Card | Card already installed, handles all layout |
| CTA button | New button component | Existing `GoogleSignInButton` or extend it | Already handles loading state, OAuth flow |
| Analysis mockup | Screenshot image | Code-based component with static data | Stays in sync with real UI, dark mode works |
| Checkout from landing | New checkout flow | Existing `PurchaseCreditsButton` | Already wired to Polar/BetterAuth |

**Key insight:** The entire UI toolkit for this phase is already installed. The work is composition and content, not new primitives.

---

## Common Pitfalls

### Pitfall 1: `withSentryConfig` breaks existing security headers
**What goes wrong:** Sentry's `withSentryConfig` wrapper can conflict with custom `headers()` or the Turbopack dev server.
**Why it happens:** `withSentryConfig` modifies the webpack config; Turbopack has separate handling.
**How to avoid:** The wizard handles this correctly. If manually setting up, check the Sentry build docs for Turbopack-specific flags. The project uses `next dev --turbopack` so run `npx @sentry/wizard@latest -i nextjs` and let it handle it.
**Warning signs:** Build errors mentioning webpack/turbopack after adding withSentryConfig.

### Pitfall 2: Hero mockup goes out of sync with real analysis UI
**What goes wrong:** The static mockup in `analysis-mockup.tsx` shows different UI than what users actually see post-signup.
**Why it happens:** Someone updates the analysis detail page without updating the mockup.
**How to avoid:** The `AnalysisMockup` component should import and reuse the same Card, Badge, and layout components from the real analysis page rather than re-creating them. Keep the same visual sections (Hand Details, Board, Good Plays, Areas to Improve) but with hardcoded data.
**Warning signs:** Visual discrepancy between mockup and real page.

### Pitfall 3: `PurchaseCreditsButton` on public page triggers auth error
**What goes wrong:** Non-authenticated visitors click "Buy 50 Analyses" and `authClient.checkout()` throws because there's no session.
**Why it happens:** `PurchaseCreditsButton` was designed for use in the authenticated dashboard.
**How to avoid:** On the landing page pricing section, the Pro Pack CTA should either: (a) link to signup first, or (b) trigger Google sign-in with a post-auth redirect to checkout. Simplest approach: use `GoogleSignInButton` for both pricing options on the public landing page (free tier and paid tier both go to signup; paid users can purchase after signup from the dashboard).
**Warning signs:** Console errors about missing session when clicking pricing CTAs.

### Pitfall 4: Landing page metadata not updated
**What goes wrong:** Page still shows "Agentic Coding Boilerplate" in `<title>` and OG tags.
**Why it happens:** `layout.tsx` has the metadata but individual pages can export their own `metadata` to override it.
**How to avoid:** Export a `metadata` const from the new `page.tsx` with poker-specific title, description, and OG tags.
**Warning signs:** Wrong page title in browser tab and when shared on social.

### Pitfall 5: Sentry DSN not set causes silent failures
**What goes wrong:** Sentry initialized but no DSN set — errors silently dropped.
**Why it happens:** `NEXT_PUBLIC_SENTRY_DSN` env var missing in production.
**How to avoid:** Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables after project setup. Test with Sentry's verify page (`/sentry-example-page` created by wizard).
**Warning signs:** Sentry dashboard shows no events after deployment.

### Pitfall 6: `page.tsx` is currently a Client Component
**What goes wrong:** Refactoring to Server Component while keeping any existing hooks (`useDiagnostics`) causes build error.
**Why it happens:** Current `page.tsx` has `"use client"` and uses hooks. The new version should not.
**How to avoid:** Delete all existing content in `page.tsx` and start fresh as a Server Component. Move any client interactions to leaf `"use client"` components (CTA buttons only).
**Warning signs:** `react-hooks` lint error about hooks in Server Components.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### CTA Button — Reuse GoogleSignInButton
```typescript
// src/components/landing/sign-up-cta-button.tsx
"use client";
// Wrap GoogleSignInButton with landing-page-specific copy
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
// GoogleSignInButton already handles loading state + signIn.social({ provider: "google", callbackURL: "/dashboard" })
// Render as-is or add size/className props as needed
```

### Page Metadata Override
```typescript
// src/app/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poker Hand Analyzer — GTO Analysis from Screenshots",
  description:
    "Upload a poker screenshot and get instant GTO analysis. Find leaks in your game in 30 seconds. 3 free analyses on signup.",
  openGraph: {
    title: "Poker Hand Analyzer — GTO Analysis from Screenshots",
    description: "Upload a poker screenshot and get instant GTO analysis.",
  },
};
```

### Sentry Client Init (created by wizard)
```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
```

### Sentry instrumentation.ts (created by wizard)
```typescript
// instrumentation.ts — in project root (not in src/)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

### Analysis Mockup Fixture Data (matches existing AnalysisResult schema)
```typescript
// src/components/landing/analysis-mockup.tsx
import type { AnalysisResult } from "@/lib/analysis-schema";

const DEMO_ANALYSIS: AnalysisResult = {
  hand_info: {
    stakes: "$0.10/$0.25",
    game_type: "Regular",
    hero_position: "BTN",
    hero_hand: "A♠ K♦",
    effective_stack_bb: 100,
    assumptions: [],
  },
  board: { flop: "K♥ 7♦ 2♠", turn: "Q♣", river: "" },
  action_summary: {
    preflop: "Hero opens to $0.75 from BTN, BB calls.",
    flop: "BB checks, Hero bets $1.00, BB calls.",
    turn: "BB checks, Hero bets $2.50, BB raises to $7.00.",
    river: "",
  },
  analysis: {
    summary: "Hero played the preflop and flop well with top pair top kicker. The turn bet-fold was correct given stack-to-pot ratio.",
    main_takeaway: "Against an unknown BB player, folding top pair to a checkraise on a paired board is correct — you are often up against a set or two pair.",
  },
  good_plays: [
    { label: "BTN open with AKo", explanation: "AKo is a mandatory open from the button at any stake." },
    { label: "Flop c-bet for value", explanation: "Top pair top kicker on a dry board is a clear value bet." },
    { label: "Sizing the turn bet", explanation: "75% pot is appropriate on the turn with a strong but vulnerable hand." },
  ],
  areas_to_improve: [
    { label: "Turn call vs raise", mistake: "Considered calling the turn raise without counting combos.", recommended_line: "Count villain's value combos: sets (3), two pair (6). Only 9 combos beat you — fold is clearly correct." },
    { label: "Stack-off threshold", mistake: "Planning to stack off with TPTK in a 3-bet pot on a dynamic board.", recommended_line: "TPTK is not a stack-off hand at 100bb deep against an unknown." },
    { label: "Preflop sizing", mistake: "Open sizing was too small at 2.5x — left value on table.", recommended_line: "Open 3x from BTN against unknown players to extract maximum value." },
  ],
  improvement_tips: [
    "Count villain value combos before calling raises.",
    "Use SPR to determine stack-off thresholds preflop.",
    "Size opens larger against unknown players.",
  ],
  tags: ["top-pair-trap", "turn-decision", "stack-off-threshold"],
  difficulty_level: "reg",
  confidence_score: { hero_decisions: 0.87 },
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sentry webpack plugin manual config | `npx @sentry/wizard@latest -i nextjs` | @sentry/nextjs v8+ | Wizard handles all file creation, no manual config errors |
| `_error.js` for error catching | `app/global-error.tsx` | Next.js 13+ App Router | New file location and export format required |
| sentry.client.config.js | `instrumentation-client.ts` | @sentry/nextjs v8.28.0+ | New file name required for App Router |

**Deprecated/outdated:**
- `sentry.client.config.js`: Replaced by `instrumentation-client.ts` in recent @sentry/nextjs versions
- Pages Router Sentry setup: Different from App Router — docs are separate, don't mix them

---

## Open Questions

1. **`instrumentation.ts` file location — project root vs `src/`?**
   - What we know: Next.js 16 supports `instrumentation.ts` in either project root or `src/` directory
   - What's unclear: The project uses `src/` for all app code, but the wizard may place it in project root
   - Recommendation: Let the wizard decide. If it places in root, leave it there. If it asks, choose root for consistency with Next.js convention.

2. **`PurchaseCreditsButton` behavior for unauthenticated visitors on landing page**
   - What we know: The button calls `authClient.checkout({ slug: "credits-50" })` which requires auth
   - What's unclear: Does Polar/BetterAuth redirect to login automatically, or throw an error?
   - Recommendation: For safety, do not use `PurchaseCreditsButton` on the public landing page pricing section. Use `GoogleSignInButton` for both tiers with copy "Get Started Free" and "Sign Up to Purchase." After signup, users can buy credits from the dashboard. This avoids any auth error risk.

3. **`NEXT_PUBLIC_SENTRY_DSN` availability at build time on Vercel**
   - What we know: Environment variables with `NEXT_PUBLIC_` prefix are baked in at build time in Next.js
   - What's unclear: Whether Vercel's Sentry integration (if used) auto-injects this or requires manual setup
   - Recommendation: Set `NEXT_PUBLIC_SENTRY_DSN` manually in Vercel project settings. Don't rely on any auto-injection.

---

## Sources

### Primary (HIGH confidence)
- Official Sentry docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/ — setup overview
- Official Sentry manual setup docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ — file list, config details
- Existing codebase read directly — `src/app/analysis/[id]/page.tsx`, `src/lib/analysis-schema.ts`, `src/components/auth/google-sign-in-button.tsx`, `package.json`, `next.config.ts`

### Secondary (MEDIUM confidence)
- npm registry via WebSearch — @sentry/nextjs 10.39.0 confirmed as latest as of search date 2026-02-20
- WebSearch on Next.js split hero layout patterns — verified against standard Tailwind grid patterns

### Tertiary (LOW confidence)
- WebSearch on pricing card patterns — referenced for layout approach only, no specific library cited

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed except @sentry/nextjs; Sentry version confirmed via npm
- Architecture: HIGH — based on direct codebase reading; patterns follow existing project conventions
- Sentry setup: HIGH — based on official Sentry docs fetched directly
- Pitfalls: HIGH — identified from direct codebase analysis (existing hooks, auth components, page structure)

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Sentry actively releases; landing page patterns are stable)

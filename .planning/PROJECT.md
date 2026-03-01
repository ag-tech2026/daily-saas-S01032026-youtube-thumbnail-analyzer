# Poker AI Review

**Brand:** Poker AI Review
**Domain:** pokeraireview.com

## What This Is

A SaaS tool where poker players upload screenshots from online poker sites (PokerStars, GGPoker, etc.) and get instant GTO-based hand analysis from AI. The analysis breaks down whether the play was correct, what the optimal ranges are, and expected value of different actions — all explained in beginner-friendly language. Users get 3 free credits to try it, then can buy a 50-credit pack for $9 via Polar.

## Core Value

Users upload a single poker screenshot and get a clear, actionable GTO analysis that helps them understand what they did right or wrong — without needing to be a poker expert to understand it.

## Requirements

### Validated

- Email/password authentication (sign up, login, logout, password reset, email verification) — existing
- Session management (persists across browser refresh) — existing
- AI chat streaming via OpenRouter — existing
- File storage abstraction (Vercel Blob / local filesystem) — existing
- Dark/light mode theming — existing
- Basic site header/footer navigation — existing
- PostgreSQL database with Drizzle ORM — existing
- User profile page — existing
- ✓ Google OAuth login — v1.0 (email/password removed, Google-only)
- ✓ Upload poker screenshot for AI analysis (drag-and-drop + file picker, 10MB limit) — v1.0
- ✓ AI-powered GTO hand review (10-field structured schema: hand_info, board, action_summary, analysis, good_plays, areas_to_improve, improvement_tips, tags, difficulty_level, confidence_score) — v1.0
- ✓ Background AI processing via Inngest (retry logic, step-based execution, event-driven) — v1.0
- ✓ Image storage in Vercel Blob — v1.0
- ✓ Hand analysis history page (list sorted newest-first, click to view full) — v1.0
- ✓ Credit system (3 free credits for new users via DB default) — v1.0
- ✓ Pro credit pack ($9 for 50 credits via Polar, idempotent webhook deduplication) — v1.0
- ✓ Landing page with hero, analysis mockup, and pricing — v1.0
- ✓ Analysis page with loading state and 3s polling during processing — v1.0
- ✓ Dashboard showing credit balance and recent analyses — v1.0

### Active

(None — all v1.0 requirements shipped)

### Out of Scope

- Multiple screenshots per hand — single screenshot = single analysis, keeps it simple
- Subscription/recurring billing — one-time credit packs only for v1
- Real-time chat with AI about the hand — analysis is a one-shot review, not a conversation
- Mobile app — web only
- Hand history text parsing — image-only analysis
- Live poker photo support — online poker screenshots only
- Leaderboards or social features — solo tool

## Context

- **v1.0 shipped 2026-02-20** — full MVP in 8 days, 7 phases, 12 plans
- ~5,785 TypeScript lines across src/
- Tech stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, PostgreSQL, Inngest, Polar, @sentry/nextjs
- AI: OpenRouter vision (GPT-4o via `openai/gpt-4o`, temperature 0 for deterministic output)
- Analysis schema locked to 10 production-ready fields (updated in quick task 2 from initial schema)
- Google-only auth (email/password removed in quick task 1)
- Sentry configured but DSN not yet set — see README for setup instructions
- Target audience: beginner to mid-level poker players who want to improve their game

## Constraints

- **Tech stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, PostgreSQL — keep existing stack
- **AI provider**: OpenRouter (must use vision-capable model for screenshot analysis)
- **Payments**: Polar for credit pack purchases
- **Background jobs**: Inngest for AI processing pipeline
- **Storage**: Vercel Blob for poker screenshots
- **Auth**: BetterAuth with Google OAuth only (email/password removed)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One-time credit packs over subscriptions | Simpler billing, lower commitment for users, easier to implement | ✓ Good — clean UX, low friction |
| Inngest for background processing | Decouples upload from analysis, handles retries/failures, keeps UI responsive | ✓ Good — worked reliably |
| Single screenshot per analysis | Keeps UX simple, one credit = one analysis, clear value proposition | ✓ Good |
| Polar for payments | Already documented in boilerplate, handles checkout flow | ✓ Good — idempotent webhooks work well |
| OpenRouter with vision model | Unified API, can switch models easily, supports image input | ✓ Good |
| Database default(3) for credits init | Safer than hooks for race conditions | ✓ Good — no race conditions observed |
| BetterAuth additionalFields for credits | Extends user model cleanly, included in session | ✓ Good |
| No DB transaction wrapper for credit deduction | Atomic WHERE clause sufficient | ✓ Good — no issues |
| db:push instead of db:migrate | Missing migration tracking table in dev | ✓ Acceptable for dev; use migrate in production |
| GPT-4o (openai/gpt-4o) locked at temperature 0 | Deterministic, high-quality analysis | ✓ Good — consistent output |
| 10-field production schema (replaced initial schema) | More structured, actionable feedback | ✓ Good — cleaner analysis UX |
| Google-only auth (removed email/password) | Simpler UX, fewer attack vectors | ✓ Good |
| Return 404 for IDOR protection | Avoids disclosing resource existence | ✓ Good security practice |
| React.use(params) in Client Components | Correct Next.js 16 pattern for async params | ✓ Good |
| Poll stops on terminal status inside callback | Avoids extra API calls after analysis resolves | ✓ Good |
| Transaction-based idempotency for webhooks | Prevents duplicate credit additions | ✓ Good |
| Sentry withSentryConfig wrap | Standard Next.js error monitoring | ✓ Good — DSN needed to activate |

---
*Last updated: 2026-02-20 after v1.0 milestone*

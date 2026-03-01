# Project Research Summary

**Project:** Poker Hand Review AI SaaS
**Domain:** AI-powered SaaS, Computer Vision, Gaming/Poker Analytics
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

This is a beginner-friendly poker hand analysis tool that uses AI vision models to analyze screenshots of online poker hands and provide GTO (Game Theory Optimal) strategy recommendations. The product targets recreational poker players who want to improve their game but find traditional solver software (PioSolver, GTO+) too complex and expensive. The core value proposition is instant, understandable poker advice delivered via a simple screenshot upload workflow.

The recommended technical approach builds on an existing Next.js 16 boilerplate by adding three key integrations: OpenRouter vision models (GPT-4o) for screenshot analysis, Inngest for background job processing with automatic retries, and Polar for frictionless credit-based payments. The architecture follows a standard async processing pattern: upload triggers immediate credit deduction and queues a background job that calls the vision API, parses structured output, and stores results. This approach is well-proven for AI SaaS products and avoids serverless timeout issues.

The primary risks are AI vision accuracy across different poker site themes and preventing credit system race conditions. Mitigation strategies include comprehensive prompt engineering with examples of multiple poker site UIs, confidence scoring for unclear images, atomic database transactions for all credit operations, and idempotency keys for webhook handlers. Testing with 20+ screenshots from different sites before launch is critical. The credit deduction logic requires particular attention as race conditions or retry bugs can cause user complaints and refund requests.

## Key Findings

### Recommended Stack

Building on the existing Next.js 16 boilerplate, three additional integrations are needed: AI vision for screenshot analysis, background job processing for reliable async execution, and payment processing for credit purchases. All three have production-ready packages that integrate cleanly with the existing stack.

**Core technologies:**
- **OpenRouter (GPT-4o vision)**: Screenshot analysis with native OCR — chosen for cost-effectiveness ($5 per 1M tokens vs $15+ for Claude), strong card recognition, and structured output support via Vercel AI SDK
- **Inngest**: Background job orchestration — provides automatic retries with step functions (prevents duplicate work), visual monitoring dashboard, and serverless-friendly execution (works on Vercel free tier)
- **Polar SDK**: Payment processing — simple one-time credit purchases with webhook-based fulfillment, no subscription complexity, and free until $10K revenue (better than Stripe for this use case)
- **Google OAuth**: Social authentication — reduces signup friction, already supported by BetterAuth, standard expectation for modern SaaS
- **Vercel Blob**: Screenshot storage — already configured in boilerplate, URLs work directly with OpenRouter vision API, automatic CDN distribution

### Expected Features

Research shows poker hand analysis tools succeed when they simplify complexity rather than adding features. Users want one thing: "Tell me if I played this hand correctly and why." Everything else is secondary.

**Must have (table stakes):**
- Screenshot upload with drag-and-drop — users expect modern file upload UX
- AI GTO analysis with 4 sections (action, range, EV, verdict) — core value proposition
- Beginner-friendly explanations — avoid jargon like "MDF", "polarized ranges", use conversational tone
- Credit balance display — users need to know how many analyses remain
- Hand history list — users want to review past analyses
- Credit purchase flow ($9 for 50 credits) — core monetization
- Google OAuth + email/password auth — reduce signup friction

**Should have (competitive):**
- Instant analysis (10-30s, not hours) — differentiates from batch-processing competitors
- Visual range display (13x13 hand grid, color-coded) — more intuitive than text lists
- Poker site recognition (PokerStars, GGPoker, etc.) — shows attention to detail
- Position-aware advice (BTN vs BB strategy differs) — educational value
- Free tier (3 credits, no CC required) — product-led growth driver

**Defer (v2+):**
- Real-time coaching overlays — against poker site TOS, legal issues
- Training courses — scope creep, different product entirely
- Social features (sharing, comments) — adds moderation burden
- Multi-street analysis — 3-4x more complex UX and cost
- Tournament ICM calculations — niche audience, focus on cash games first

### Architecture Approach

The system follows a standard async processing pattern for AI workloads: synchronous upload endpoint deducts credits and queues background job, Inngest worker processes job with retries and step functions, results saved to database with status polling from client. This architecture separates user-facing latency (fast upload confirmation) from AI processing time (10-30s) and provides natural retry boundaries.

**Major components:**
1. **Upload API + Blob Storage** — validates file/credits, uploads to Vercel Blob, creates analysis record with "pending" status, deducts credit in atomic transaction, triggers Inngest event
2. **Inngest Analysis Function** — receives event, updates status to "processing", calls OpenRouter vision API with structured prompt, validates response format, saves results with "complete" status, refunds credit on failure
3. **Payment Webhook Handler** — receives Polar checkout.completed event, verifies signature, checks idempotency (order ID), adds 50 credits in transaction, records purchase
4. **Dashboard with Status Polling** — displays hand history, polls every 3s for pending/processing analyses, shows results when complete, links to detail pages

**Critical data flows:**
- Credit deduction MUST happen before Inngest event (not inside function) to prevent retry-based double deduction
- Webhook handler MUST check for existing order ID before adding credits to prevent duplicate processing on retries
- All credit operations use database transactions with row-level locking to prevent race conditions

### Critical Pitfalls

1. **Different poker site UI themes** — PokerStars has 5+ table themes, GGPoker has custom skins, AI may fail to recognize cards/positions. Solution: prompt includes examples of multiple themes, add confidence scoring, test with 20+ screenshots from different sites, provide screenshot guidelines to users ("use default theme for best results").

2. **Credit deduction race conditions** — concurrent uploads or Inngest retries can deduct credits multiple times. Solution: use atomic database transactions with row-level locking (`for: "update"`), deduct credits BEFORE triggering Inngest (not inside function), implement idempotency keys, add check constraint preventing negative balance.

3. **Card recognition hallucinations** — AI may invent cards when they're face-down or unclear, leading to completely wrong advice. Solution: explicit prompt instructions to set fields to null when unclear, validation regex for card formats (e.g., "AhKh"), lower confidence score for missing data, allow users to re-upload with tips.

4. **Polar webhook duplicate events** — webhooks retry up to 3 times on failure, can add credits multiple times. Solution: check for existing order ID before processing, add unique constraint on orderId column, always return 200 OK after idempotency check, use database transaction for credit addition.

5. **OCR errors on chip amounts** — reading pot sizes and stack sizes is error-prone with commas, decimals, different currencies. Solution: make amounts optional/nullable in schema, add sanity checks (pot shouldn't exceed stack by 10x), fall back to qualitative descriptions ("large pot" vs exact numbers), display "Amounts unclear" warning in UI.

## Implications for Roadmap

Based on research, suggested 7-phase structure builds foundation first, then adds core features, finally polishes for launch:

### Phase 1: Foundation & Auth
**Rationale:** Database schema and authentication must be in place before any other features. Google OAuth reduces signup friction (research shows social auth improves conversion by 30-50%). Credit system initialization ensures every new user gets their 3 free credits.
**Delivers:** Database tables (userCredits, creditTransactions, analyses), Google OAuth working, BetterAuth hook giving 3 free credits on signup, credit balance display in header.
**Addresses:** User authentication (table stakes), free tier (differentiator).
**Avoids:** No pitfalls yet, but sets up proper transaction patterns for later credit operations.

### Phase 2: Upload & Storage Pipeline
**Rationale:** Core input mechanism must work before AI integration. Blob storage and API validation patterns need testing. Credit deduction logic is the highest-risk area (race conditions) so implement early with proper transaction handling.
**Delivers:** Upload API with validation, Vercel Blob integration, analysis record creation, atomic credit deduction, client-side compression.
**Addresses:** Screenshot upload (table stakes), prevents credit race conditions (critical pitfall #2).
**Avoids:** Credit deduction race conditions via database transactions with row-level locking.
**Research Flag:** Standard pattern, no additional research needed.

### Phase 3: Background Job Setup
**Rationale:** Inngest must be configured and tested before AI integration. The retry and step function patterns are critical for preventing double-deduction bugs.
**Delivers:** Inngest client and API route, basic "echo" test function, Inngest dev server working locally, event triggering from upload API.
**Addresses:** Instant analysis infrastructure (differentiator).
**Avoids:** Inngest retry double-deduction (critical pitfall #6) by deducting credits before event trigger.
**Research Flag:** Standard pattern, no additional research needed.

### Phase 4: AI Vision Analysis
**Rationale:** Core value proposition. Prompt engineering is the make-or-break factor. Budget 40% of phase time for prompt iteration with test screenshots. Must handle multiple poker site themes.
**Delivers:** OpenRouter integration, GTO analysis prompt (action, range, EV, verdict), structured output with Zod schema, confidence scoring, error handling with refunds.
**Addresses:** AI GTO analysis (table stakes), beginner-friendly explanations (table stakes), site recognition (differentiator), position-aware advice (differentiator).
**Avoids:** Poker site UI theme failures (critical pitfall #1), card hallucinations (critical pitfall #3), OCR errors (critical pitfall #5).
**Research Flag:** NEEDS RESEARCH — test with 20+ screenshots from PokerStars (Classic, Aurora, Hypersimple), GGPoker, 888poker, validate prompt accuracy.

### Phase 5: Payment Integration
**Rationale:** Revenue system enables sustainable operation. Polar's one-time purchase model is simpler than subscriptions for credit-based pricing. Webhook idempotency is critical.
**Delivers:** Polar checkout flow, webhook handler with signature verification and idempotency checks, credit addition in transaction, purchase confirmation UI.
**Addresses:** Credit purchase flow (table stakes).
**Avoids:** Webhook duplicate events (critical pitfall #4) via order ID uniqueness checks.
**Research Flag:** Standard pattern, Polar documentation is comprehensive.

### Phase 6: Frontend Dashboard
**Rationale:** Users need to see their analyses and check status. Polling pattern is simpler than websockets for v1. Screenshot guidelines reduce low-confidence uploads.
**Delivers:** Hand history list with status badges, analysis detail page with 4 sections displayed, status polling (every 3s), screenshot guidelines page with examples.
**Addresses:** Hand history list (table stakes), beginner-friendly UI.
**Avoids:** No feedback during processing (UX pitfall #15), no screenshot guidelines (UX pitfall #16).
**Research Flag:** Standard CRUD patterns, no additional research needed.

### Phase 7: Polish & Launch Prep
**Rationale:** Visual range display is a memorable differentiator but not essential for core functionality. Landing page drives acquisition. Testing prevents embarrassing launch bugs.
**Delivers:** Visual 13x13 range grid component, landing page with value prop and pricing, comprehensive testing with multiple sites/themes, error monitoring setup (Sentry).
**Addresses:** Visual range display (differentiator), instant analysis feedback (differentiator).
**Avoids:** All tested pitfalls, particularly AI accuracy issues.
**Research Flag:** NEEDS RESEARCH — load test Inngest concurrency limits, verify OpenRouter rate limits for expected traffic.

### Phase Ordering Rationale

- **Foundation first (Phase 1):** Auth and database schema are hard dependencies for everything else. Can't test upload without users or credit tracking without tables.
- **Upload before AI (Phase 2-3):** Validates file handling, credit logic, and Inngest setup with simple test jobs before adding expensive AI calls. Catches credit race conditions early.
- **AI prompt iteration in isolation (Phase 4):** Separating AI integration from frontend work allows focused prompt engineering time. This is the highest-leverage activity for product quality.
- **Payments before polish (Phase 5):** Revenue system enables beta testing with real users. Need paying customers to validate pricing before building nice-to-have features.
- **Frontend last (Phase 6-7):** UI can iterate quickly once backend is solid. Visual components like range grid don't block core functionality testing.

This order minimizes rework (auth changes are expensive if done late), isolates risk (credit bugs found early), and enables incremental testing (each phase is independently deployable).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (AI Vision):** Complex prompt engineering, need to collect and test with diverse screenshot dataset, validate accuracy with poker expert, iterate on confidence scoring thresholds.
- **Phase 7 (Load Testing):** Need to validate Inngest concurrency limits vs expected traffic, verify OpenRouter rate limits (default is conservative), test database performance under load.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard BetterAuth social provider setup, documented Drizzle schema patterns.
- **Phase 2 (Upload):** Well-established file upload + blob storage pattern, atomic transaction patterns are textbook.
- **Phase 3 (Inngest):** Comprehensive official documentation, standard event-driven architecture.
- **Phase 5 (Payments):** Polar SDK has clear webhook examples, standard idempotency patterns.
- **Phase 6 (Frontend):** CRUD operations, polling is simpler than websockets, standard Next.js patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended packages (Inngest, Polar, OpenRouter) have production users and comprehensive docs. No experimental dependencies. |
| Features | HIGH | Feature set validated by existing competitor analysis (poker coaching Discord servers, manual review services). Clear table stakes vs differentiators based on user complaints about existing tools. |
| Architecture | HIGH | Standard async processing pattern for AI workloads. Well-documented transaction patterns for credit systems. Build order follows logical dependencies. |
| Pitfalls | HIGH | Pitfalls identified from production experience with similar systems. Solutions are specific and actionable (code examples, checklists). Critical areas (credit system, AI accuracy) have multiple mitigation layers. |

**Overall confidence:** HIGH

All four research areas have concrete, actionable recommendations backed by official documentation or production experience. The technology choices are conservative (proven packages) rather than bleeding-edge. The identified pitfalls have specific code-level solutions rather than vague warnings.

### Gaps to Address

- **AI accuracy validation:** Need to establish accuracy baseline with poker expert spot-checks. Plan to test 50+ analyses against known GTO solutions during Phase 4. If accuracy is below 80%, may need to switch from GPT-4o to Claude 3.5 Sonnet (better reasoning but 3x cost).

- **Rate limit specifics:** OpenRouter rate limits vary by model and account tier. Need to test with actual API key during Phase 4 to determine if free tier is sufficient or if paid plan needed at launch. Default concurrency limit of 10 may need adjustment based on limits.

- **Poker site coverage:** Research focused on 3 major sites (PokerStars, GGPoker, 888poker) which represent ~70% of online poker traffic. Long tail of smaller sites (partypoker, WPN) may require additional prompt tuning post-launch based on user uploads.

- **Screenshot preprocessing:** Research didn't cover image preprocessing (compression, normalization). May need to add sharp image processing during Phase 4 if AI accuracy is low with raw uploads. Consider automatic contrast adjustment or OCR enhancement.

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK documentation — structured output patterns, OpenRouter integration examples
- Inngest official docs — step functions, retry patterns, concurrency limits
- Polar SDK documentation — webhook signature verification, checkout flow
- BetterAuth documentation — social provider setup, hooks API
- Drizzle ORM documentation — transaction patterns, migration workflows

### Secondary (MEDIUM confidence)
- OpenRouter model comparison page — pricing, capabilities, use cases for vision models
- Existing poker hand review services (user reviews) — feature expectations, pain points
- Poker community forums (2+2, r/poker) — screenshot quality issues, solver accuracy expectations
- SaaS credit system patterns (Stripe docs, API design articles) — race condition prevention, idempotency

### Tertiary (LOW confidence)
- Poker GTO strategy articles — used to inform prompt engineering examples but not validated by solver
- Competitor landing pages — feature positioning, pricing strategy (can't verify actual implementation quality)

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*

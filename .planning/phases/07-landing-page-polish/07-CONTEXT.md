# Phase 7: Landing Page & Polish - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Public-facing marketing landing page that communicates product value and drives signups. Includes hero section, pricing, and a prominent CTA. Demo analysis section is deferred until AI output is improved. Also includes error monitoring setup and screenshot compatibility testing.

</domain>

<decisions>
## Implementation Decisions

### Hero section layout
- Split layout: headline + CTA on left, product UI mockup on right
- Right side shows a rendered preview of the analysis result UI (what users see after uploading)
- Headline is outcome-oriented — speaks to the pain ("Find out if your poker plays are actually correct")
- Primary CTA: "Analyze Your First 3 Hands Free" — concrete phrasing preferred over "3 credits"

### Pricing section
- Keep existing pricing: 3 free credits on signup, $9 for 50-credit pack
- Display as two distinct options (free tier vs paid pack)
- Presentation style: Claude's discretion (cards, table, etc.)

### Demo analysis section
- Skip for now — do not build demo section in this phase
- Page flow: Hero → Pricing → CTA (no demo between them)
- Demo section to be added as a future improvement once analysis quality is validated

### Error monitoring & testing
- Sentry (or similar) configured for error capture — Claude's discretion on provider
- Manual screenshot testing against PokerStars, GGPoker, and 888poker (20+ screenshots per success criteria)
- No automated screenshot testing required in this phase

### Claude's Discretion
- Specific headline copy (outcome-oriented direction given, final wording flexible)
- Exact hero mockup design (should look like actual analysis result UI)
- Pricing section layout (cards vs table)
- Error monitoring provider (Sentry preferred but not locked)
- Any additional social proof or trust signals (testimonials, etc.) — can add if it fits naturally

</decisions>

<specifics>
## Specific Ideas

- CTA framing: "3 free analyses" is clearer to non-technical users than "3 credits" — use this language throughout the page
- The hero right-side mockup should reflect the actual analysis detail page UI built in Phase 6, not a generic screenshot

</specifics>

<deferred>
## Deferred Ideas

- Demo analysis section with real example — deferred until AI output quality is validated
- Video or animated walkthrough of upload flow — future marketing improvement

</deferred>

---

*Phase: 07-landing-page-polish*
*Context gathered: 2026-02-19*

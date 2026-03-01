# Phase 4: AI Vision Analysis - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

AI analyzes a poker screenshot via OpenRouter vision model and produces structured GTO feedback. The Inngest background job (Phase 3) calls the vision model, parses the response, saves structured analysis to the database, and handles failures with credit refund. Analysis must work for screenshots from PokerStars, GGPoker, and 888poker.

</domain>

<decisions>
## Implementation Decisions

### Analysis tone & language
- Friendly coach personality — encouraging but honest, explains mistakes gently
- Minimal jargon — explain poker terms in context ("your range (the hands you should play here) is too wide")
- Third person "Hero" voice — standard poker review format ("Hero raised preflop which is correct")
- Acknowledge good plays briefly ("Correct play. GTO-aligned.") then focus more on areas for improvement

### Analysis depth per street
- Every street analyzed (preflop, flop, turn, river) — each gets its own section regardless of how standard the play was
- Simplified ranges — describe in categories ("strong top pairs and better"), not specific hand lists
- Directional EV only — "this call loses money long-term" / "this bet is profitable", no numerical EV
- Always suggest the GTO play when Hero deviates — "Hero called, but GTO recommends raising here to put pressure on draws"

### Overall verdict style
- Binary verdict: "GTO-Compliant" or "Needs Improvement"
- Verdict includes a 1-2 sentence summary alongside the label explaining why
- One key takeaway highlighted — the single biggest mistake or best play from the hand
- Analysis order: street-by-street details first, building to the verdict at the end (tells a story)

### Claude's Discretion
- Exact prompt engineering and structured output schema
- How to handle screenshots where not all streets are visible (e.g., hand ended preflop)
- Model selection within OpenRouter (GPT-4o primary, fallback strategy)
- Retry and error message wording
- Credit refund flow implementation details

</decisions>

<specifics>
## Specific Ideas

- Analysis should read like a poker coach reviewing a student's hand — walking through each street, pointing out what went right and wrong, ending with an overall assessment
- The "Hero" convention is standard in poker hand reviews and will feel natural to poker players
- Keep it accessible: a complete beginner should be able to read the analysis and understand what happened and what to do differently

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ai-vision-analysis*
*Context gathered: 2026-02-17*

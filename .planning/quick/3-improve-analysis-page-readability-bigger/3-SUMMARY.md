---
phase: quick-3
plan: "01"
subsystem: analysis-page
tags: [ui, readability, layout, ai-prompt, schema]
dependency_graph:
  requires: [quick-02]
  provides: [improved-analysis-readability, 3-item-minimum-enforcement]
  affects: [src/app/analysis/[id]/page.tsx, src/inngest/prompts/analyze-hand.ts, src/lib/analysis-schema.ts]
tech_stack:
  added: []
  patterns: [sticky-sidebar, two-column-layout, emoji-section-headers]
key_files:
  modified:
    - src/inngest/prompts/analyze-hand.ts
    - src/lib/analysis-schema.ts
    - src/app/analysis/[id]/page.tsx
decisions:
  - "Emoji headers replace colored borders and lucide icons for visual section distinction"
  - "Side-by-side layout only activates on lg breakpoint; mobile stacks vertically"
  - "img tag kept (not next/image) per existing plan spec — warnings accepted"
  - "Bottom Line replaces Key Takeaway label for more conversational tone"
  - "Red cross emoji prefix on each area_to_improve item for ChatGPT-reference style"
metrics:
  duration: "3 min"
  completed: "2026-02-19"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 3: Improve Analysis Page Readability Summary

**One-liner:** Larger fonts (text-base throughout), emoji section headers, sticky side-by-side desktop layout, and 3-item minimum enforcement in AI prompt and Zod schema.

## What Was Built

### Task 1: Enforce 3+ items in AI prompt and Zod schema

Updated `src/inngest/prompts/analyze-hand.ts`:
- Changed `good_plays` instruction to require at least 3 items with fallback observations (position awareness, bet sizing, pot odds recognition)
- Changed `areas_to_improve` instruction to require at least 3 areas (including minor adjustments, timing tells, advanced concepts)
- Removed "Do NOT use emojis" restriction from STRICT RULES
- Added conversational VOICE guidance: "Be conversational and engaging, like a friendly coach reviewing the hand" and "Use direct language — 'Nice move!' rather than 'This was adequate'"
- Updated example JSON to show 3 items in both lists

Updated `src/lib/analysis-schema.ts`:
- Added `.min(3)` to `good_plays` array
- Added `.min(3)` to `areas_to_improve` array

### Task 2: Redesign analysis page

Complete redesign of `src/app/analysis/[id]/page.tsx` (500 lines):

**Layout changes:**
- `max-w-3xl` -> `max-w-6xl` across all states (loading, error, pending, failed, complete)
- Desktop two-column layout with `lg:flex-row` — analysis left (flex-1), screenshot right (lg:w-[400px])
- Right column uses `sticky top-6` so screenshot stays visible while user scrolls analysis
- Mobile stacks vertically — screenshot moves to bottom below tips via `lg:hidden` wrapper
- When no imageUrl, right column omitted and analysis uses full width

**Font size increases:**
- All `CardTitle` from `text-base` to `text-lg`
- All body text from `text-sm` to `text-base`
- Hand detail labels from `text-xs` to `text-sm` (kept uppercase tracking-wide)
- Hand detail values from implicit sm to `text-base font-medium`
- Board card values: `text-base font-medium font-mono`
- Good plays / areas_to_improve / improvement tips: all `text-base`
- Header confidence and date: `text-base`

**Emoji section headers (replaced lucide icons):**
- Hand Details: `🃏 Hand Details`
- Board: `🎯 Board`
- Action Summary: `🎯 Action Summary`
- Analysis: `📊 Analysis` (new header added — section previously had no title)
- Good Plays: `✅ Good Plays`
- Areas to Improve: `❌ Areas to Improve`
- Improvement Tips: `💡 Improvement Tips`
- Screenshot: `📸 Screenshot`

**Removed colored borders** from Good Plays, Areas to Improve, Improvement Tips cards — emojis provide visual distinction.

**Areas to Improve item styling:** Each label prefixed with `❌` emoji inline.

**Bottom Line callout:** Replaced "Key Takeaway" label with "🔥 Bottom Line", removed Lightbulb icon.

**Removed unused imports:** `CheckCircle2`, `Lightbulb`, `TrendingUp` from lucide-react.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm run lint`: 0 errors, 4 warnings (pre-existing img tag warnings, accepted per plan spec)
- `pnpm run typecheck`: Clean pass
- Prompt contains "at least 3" x2 (good_plays and areas_to_improve)
- Schema contains `.min(3)` x2 (good_plays and areas_to_improve)
- Page uses `lg:flex-row` for side-by-side layout
- All 7 section headers have emoji prefixes
- No unused lucide-react imports remain

## Commits

- `8adc23d` feat(quick-3): enforce 3+ items in AI prompt and Zod schema
- `ff059fc` feat(quick-3): redesign analysis page with bigger fonts, emojis, and side-by-side layout

## Self-Check: PASSED

Files created/modified:
- FOUND: src/inngest/prompts/analyze-hand.ts
- FOUND: src/lib/analysis-schema.ts
- FOUND: src/app/analysis/[id]/page.tsx
- FOUND: .planning/quick/3-improve-analysis-page-readability-bigger/3-SUMMARY.md

Commits verified:
- FOUND: 8adc23d
- FOUND: ff059fc

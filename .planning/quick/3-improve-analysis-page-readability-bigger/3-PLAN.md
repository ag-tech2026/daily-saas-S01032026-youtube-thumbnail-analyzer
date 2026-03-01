---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/inngest/prompts/analyze-hand.ts
  - src/lib/analysis-schema.ts
  - src/app/analysis/[id]/page.tsx
autonomous: true
must_haves:
  truths:
    - "AI always outputs at least 3 good_plays and 3 areas_to_improve"
    - "Analysis page text is visibly larger and more readable"
    - "Section headers have emoji prefixes"
    - "On desktop, screenshot is sticky on the right while analysis scrolls on the left"
    - "On mobile, layout stacks vertically"
    - "Areas to improve items have a red cross prefix style"
    - "Bottom-line callout is prominent and engaging"
  artifacts:
    - path: "src/inngest/prompts/analyze-hand.ts"
      provides: "AI prompt enforcing 3+ items in good_plays and areas_to_improve"
      contains: "at least 3"
    - path: "src/lib/analysis-schema.ts"
      provides: "Zod schema with .min(3) on good_plays and areas_to_improve arrays"
      contains: ".min(3)"
    - path: "src/app/analysis/[id]/page.tsx"
      provides: "Redesigned analysis page with larger fonts, emojis, side-by-side layout"
      min_lines: 300
  key_links:
    - from: "src/inngest/prompts/analyze-hand.ts"
      to: "src/lib/analysis-schema.ts"
      via: "AI output must match schema validation"
      pattern: "min\\(3\\)"
    - from: "src/app/analysis/[id]/page.tsx"
      to: "src/lib/analysis-schema.ts"
      via: "AnalysisResult type import"
      pattern: "import.*AnalysisResult"
---

<objective>
Improve the analysis detail page readability and visual engagement: bigger fonts, emoji section headers, 3+ bullet enforcement in AI output, side-by-side desktop layout with sticky screenshot, and a more conversational/engaging tone matching the ChatGPT-style reference.

Purpose: Users find the current analysis page too small and clinical. This makes it engaging, readable, and lets users reference the screenshot while reading analysis.
Output: Updated AI prompt, Zod schema with min(3), and redesigned analysis page component.
</objective>

<execution_context>
@/home/ars/.claude/get-shit-done/workflows/execute-plan.md
@/home/ars/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/analysis/[id]/page.tsx
@src/inngest/prompts/analyze-hand.ts
@src/lib/analysis-schema.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enforce 3+ items in AI prompt and Zod schema</name>
  <files>src/inngest/prompts/analyze-hand.ts, src/lib/analysis-schema.ts</files>
  <action>
**In `src/inngest/prompts/analyze-hand.ts`:**

1. Change the `good_plays` instruction from "List 1-3 things Hero did well" to "List at least 3 things Hero did well (always 3 or more). If Hero played well overall, find additional positive observations like position awareness, bet sizing, pot odds recognition, etc."

2. Change the `areas_to_improve` instruction from "List 1-3 mistakes Hero made" to "List at least 3 areas where Hero can improve (always 3 or more). If Hero played well, include minor adjustments, timing tells, or advanced concepts to work on."

3. Remove the rule "Do NOT use emojis" from STRICT RULES. The AI output itself does not need emojis (emojis are added in the UI), but removing this restriction gives flexibility.

4. Update the VOICE section to be more conversational:
   - Add: "Be conversational and engaging, like a friendly coach reviewing the hand"
   - Add: "Use direct language — 'Nice move!' rather than 'This was adequate'"
   - Keep "Use third person 'Hero' throughout"

5. Update the example JSON to show 3 items in good_plays and 3 items in areas_to_improve.

**In `src/lib/analysis-schema.ts`:**

1. Add `.min(3)` to the `good_plays` array: `z.array(...).min(3).describe("List of things Hero did well (minimum 3)")`

2. Add `.min(3)` to the `areas_to_improve` array: `z.array(...).min(3).describe("List of mistakes with recommended corrections (minimum 3)")`
  </action>
  <verify>Run `pnpm run typecheck` to confirm no type errors from schema changes.</verify>
  <done>AI prompt instructs 3+ items for both lists, Zod schema enforces .min(3) on both arrays, voice section is more conversational.</done>
</task>

<task type="auto">
  <name>Task 2: Redesign analysis page with bigger fonts, emojis, and side-by-side layout</name>
  <files>src/app/analysis/[id]/page.tsx</files>
  <action>
**Side-by-side desktop layout:**

Restructure the complete state (final return block, after the `analysisResult` parse) to use a two-column layout on desktop:
- Container: change `max-w-3xl` to `max-w-6xl`
- Below the back link and header row, wrap everything in: `<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">`
- Left column (analysis content): `<div className="flex-1 min-w-0">` containing all the cards (Hand Details through Improvement Tips)
- Right column (screenshot): `<div className="hidden lg:block lg:w-[400px] shrink-0"><div className="sticky top-6">` containing the screenshot card. On mobile, show the screenshot at the bottom with `<div className="lg:hidden">` wrapper.
- If `data.imageUrl` is null, skip the right column entirely and let analysis use full width.

**Font size increases throughout the complete state:**

- Card titles (`CardTitle`): change from `text-base` to `text-lg`
- Body text (analysis summary, explanations, action summaries): change from `text-sm` to `text-base`
- Labels in hand details grid: change from `text-xs` to `text-sm` for the labels, keep `font-semibold text-muted-foreground uppercase tracking-wide`
- Values in hand details grid: change from `text-sm` to `text-base`, keep `font-medium`
- Good plays / Areas to improve labels: change from `text-sm` to `text-base`
- Good plays / Areas to improve body text: change from `text-sm` to `text-base`
- Improvement tips list items: change from `text-sm` to `text-base`
- Board card values: keep `font-mono`, change from implicit `text-sm` to `text-base`
- Key takeaway text: keep `text-foreground leading-relaxed`, ensure it's `text-base`
- Confidence and date in header: change from `text-sm` to `text-base`
- Tag badges: keep `text-xs` (badges should stay small)

**Emoji section headers:**

Replace the lucide icons + text in CardTitle with emoji-prefixed headers:
- Hand Details section: title becomes `<CardTitle className="text-lg">&#x1F0CF; Hand Details</CardTitle>` (use the actual emoji character, not HTML entity, i.e. the playing card emoji or just use the text emoji from requirements)
  - Actually use these exact emojis from the user's requirements:
  - Hand Details: use the string literal with emoji, e.g. `{"🃏 Hand Details"}`
  - Board: `{"🎯 Board"}`
  - Action Summary: `{"🎯 Action Summary"}`
  - Analysis section (currently has no title): add a CardHeader with `{"📊 Analysis"}`
  - Good Plays: `{"✅ Good Plays"}` — remove the CheckCircle2 icon
  - Areas to Improve: `{"❌ Areas to Improve"}` — remove the AlertCircle icon
  - Improvement Tips: `{"💡 Improvement Tips"}` — remove the TrendingUp icon
  - Screenshot section: `{"📸 Screenshot"}`

Remove the imports for `CheckCircle2`, `Lightbulb`, `TrendingUp` from lucide-react since emojis replace them. Keep `ArrowLeft`, `AlertCircle` (used in error state), `XCircle` (used in failed state).

**Remove colored borders on Good Plays / Areas to Improve / Improvement Tips cards.** The emojis provide visual distinction now. Change:
- Good Plays card: remove `border-green-200 dark:border-green-900`, remove green text color from title
- Areas to Improve card: remove `border-red-200 dark:border-red-900`, remove red text color from title
- Improvement Tips card: remove `border-blue-200 dark:border-blue-900`, remove blue text color from title

**Areas to Improve item styling (ChatGPT reference style):**

For each area_to_improve item, prefix the label with a red cross emoji style:
```tsx
<p className="font-semibold text-base text-foreground mb-1">
  {"❌ "}{area.label}
</p>
```

**Key takeaway / bottom-line callout styling:**

Make the key takeaway more prominent (like the "Bottom line" style from ChatGPT reference):
- Keep the blue background callout box
- Change the label from "Key Takeaway" to "🔥 Bottom Line"
- Remove the Lightbulb icon (emoji replaces it)
- Make the text slightly larger: ensure `text-base` on the body

**Analysis section structure update:**

The analysis card (Section 4) currently has no header. Add one:
```tsx
<Card className="mb-4">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">{"📊 Analysis"}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <p className="text-base text-foreground leading-relaxed">{analysisResult.analysis.summary}</p>
    <div className="flex gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
      <div>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
          {"🔥 Bottom Line"}
        </p>
        <p className="text-base text-foreground leading-relaxed">{analysisResult.analysis.main_takeaway}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**Also update the non-complete states (loading, pending, failed):**

- Loading skeleton container: change `max-w-3xl` to `max-w-6xl`
- Pending/processing state container: change `max-w-3xl` to `max-w-6xl`
- Failed state container: change `max-w-3xl` to `max-w-6xl`
- Error/not found state container: change `max-w-3xl` to `max-w-6xl`

**Clean up unused imports:**

After replacing icons with emojis, remove unused imports: `CheckCircle2`, `Lightbulb`, `TrendingUp`. Keep: `ArrowLeft`, `AlertCircle`, `XCircle`, `Spinner`.
  </action>
  <verify>
Run `pnpm run lint && pnpm run typecheck` to confirm no errors. Visually verify by checking the component structure makes sense (no broken JSX).
  </verify>
  <done>
Analysis page has: (1) all text visibly larger (text-base instead of text-sm throughout), (2) emoji prefixes on all section headers, (3) side-by-side layout on desktop with sticky screenshot on right, (4) stacked layout on mobile, (5) "Bottom Line" callout style, (6) red cross prefix on Areas to Improve items, (7) no unused icon imports.
  </done>
</task>

</tasks>

<verification>
1. `pnpm run lint` passes with no errors
2. `pnpm run typecheck` passes with no errors
3. Prompt file contains "at least 3" for both good_plays and areas_to_improve
4. Schema file contains `.min(3)` on both arrays
5. Page component uses `lg:flex-row` for side-by-side layout
6. Page component contains all required emoji prefixes
7. No unused lucide-react imports remain
</verification>

<success_criteria>
- AI prompt enforces 3+ items in good_plays and areas_to_improve with conversational tone
- Zod schema validates minimum 3 items in both arrays
- Analysis page renders with larger fonts (text-base throughout instead of text-sm)
- Desktop shows two-column layout: analysis left, sticky screenshot right
- Mobile stacks vertically
- All 7 section headers have emoji prefixes per requirements
- Areas to Improve items prefixed with red cross emoji
- Key takeaway restyled as "Bottom Line" callout
- lint and typecheck pass clean
</success_criteria>

<output>
After completion, create `.planning/quick/3-improve-analysis-page-readability-bigger/3-SUMMARY.md`
</output>

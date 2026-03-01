---
phase: quick-02
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/analysis-schema.ts
  - src/inngest/prompts/analyze-hand.ts
  - src/inngest/functions.ts
  - src/app/analysis/[id]/page.tsx
autonomous: true
must_haves:
  truths:
    - "Zod schema matches FINAL JSON OUTPUT SCHEMA (Production-Ready).json exactly"
    - "Analysis page renders hand_info, board, action_summary, good_plays, areas_to_improve, improvement_tips, tags, difficulty_level, confidence_score"
    - "AI generation uses openai/gpt-4o with temperature 0"
    - "System prompt instructs AI to produce the new schema structure"
  artifacts:
    - path: "src/lib/analysis-schema.ts"
      provides: "New Zod schema matching JSON spec"
      contains: "hand_info"
    - path: "src/inngest/prompts/analyze-hand.ts"
      provides: "Updated prompt for new schema"
      contains: "hand_info"
    - path: "src/app/analysis/[id]/page.tsx"
      provides: "Redesigned analysis detail page"
      contains: "good_plays"
  key_links:
    - from: "src/inngest/functions.ts"
      to: "src/lib/analysis-schema.ts"
      via: "import analysisSchema"
      pattern: "analysisSchema"
    - from: "src/app/analysis/[id]/page.tsx"
      to: "src/lib/analysis-schema.ts"
      via: "import AnalysisResult"
      pattern: "AnalysisResult"
---

<objective>
Replace the old street-by-street GTO analysis schema with the new production-ready JSON schema from the spec files, update the AI prompt to produce it, and redesign the analysis detail page to display all new fields.

New schema structure:
- hand_info: stakes, game_type, hero_position, hero_hand, effective_stack_bb, assumptions[]
- board: flop, turn, river (strings, optional)
- action_summary: preflop, flop, turn, river (strings, optional)
- analysis: summary, main_takeaway
- good_plays: [{label, explanation}]
- areas_to_improve: [{label, mistake, recommended_line}]
- improvement_tips: string[]
- tags: string[]
- difficulty_level: "beginner" | "reg"
- confidence_score: {hero_decisions: number}

Purpose: The new schema gives users richer, more structured feedback — hand context, explicit good/bad play breakdowns, actionable tips, and classification tags.
Output: Working analysis pipeline + improved detail page rendering all new fields.
</objective>

<execution_context>
@/home/ars/.claude/get-shit-done/workflows/execute-plan.md
@/home/ars/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/analysis-schema.ts
@src/inngest/prompts/analyze-hand.ts
@src/inngest/functions.ts
@src/app/analysis/[id]/page.tsx
@docs/business/poker_hand_analysis_spec.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace Zod analysis schema with new JSON spec</name>
  <files>src/lib/analysis-schema.ts</files>
  <action>
Replace the entire contents of `src/lib/analysis-schema.ts` with a new Zod schema that matches the FINAL JSON OUTPUT SCHEMA exactly:

```ts
import { z } from "zod";

export const analysisSchema = z.object({
  hand_info: z.object({
    stakes: z.string().describe("Stakes (e.g. '$0.02/$0.05')"),
    game_type: z.string().describe("Game type (e.g. 'Rush & Cash', 'Zoom', 'Regular')"),
    hero_position: z.string().describe("Hero's position (e.g. 'UTG', 'BTN', 'BB')"),
    hero_hand: z.string().describe("Hero's hole cards (e.g. 'J♠ J♦')"),
    effective_stack_bb: z.number().describe("Effective stack depth in big blinds"),
    assumptions: z.array(z.string()).describe("Assumptions made due to missing info"),
  }),
  board: z.object({
    flop: z.string().optional().describe("Flop cards (e.g. 'Q♦ 2♠ Q♥') or empty if no flop"),
    turn: z.string().optional().describe("Turn card or empty if no turn"),
    river: z.string().optional().describe("River card or empty if no river"),
  }),
  action_summary: z.object({
    preflop: z.string().describe("Preflop action summary"),
    flop: z.string().optional().describe("Flop action summary or empty"),
    turn: z.string().optional().describe("Turn action summary or empty"),
    river: z.string().optional().describe("River action summary or empty"),
  }),
  analysis: z.object({
    summary: z.string().describe("Overall hand analysis summary (2-4 sentences)"),
    main_takeaway: z.string().describe("The single most important lesson from this hand"),
  }),
  good_plays: z.array(
    z.object({
      label: z.string().describe("Short label for the good play (e.g. 'UTG open with JJ')"),
      explanation: z.string().describe("Why this was a good play"),
    })
  ).describe("List of things Hero did well"),
  areas_to_improve: z.array(
    z.object({
      label: z.string().describe("Short label for the mistake (e.g. 'Deep stack overcommitment')"),
      mistake: z.string().describe("What Hero did wrong"),
      recommended_line: z.string().describe("What Hero should have done instead"),
    })
  ).describe("List of mistakes with recommended corrections"),
  improvement_tips: z.array(z.string()).describe("3-5 actionable tips Hero should apply next time"),
  tags: z.array(z.string()).describe("2-4 short kebab-case tags (e.g. 'deep-stack-error', 'preflop-leak')"),
  difficulty_level: z.enum(["beginner", "reg"]).describe("Skill level this hand is relevant for"),
  confidence_score: z.object({
    hero_decisions: z.number().min(0).max(1).describe("Confidence 0-1 in the analysis quality based on image clarity"),
  }),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
```
  </action>
  <verify>Read the file. Confirm all 10 top-level fields are present: hand_info, board, action_summary, analysis, good_plays, areas_to_improve, improvement_tips, tags, difficulty_level, confidence_score.</verify>
  <done>analysis-schema.ts exports the new Zod schema matching the JSON spec with AnalysisResult type.</done>
</task>

<task type="auto">
  <name>Task 2: Update AI prompt to produce new schema</name>
  <files>src/inngest/prompts/analyze-hand.ts</files>
  <action>
Replace the entire `analyzeHandPrompt` string with a new prompt that instructs the AI to produce the new schema. The prompt must:

1. Establish the coach persona and strict JSON-only output rules
2. Define each output field clearly
3. Show an example matching the Example Output (Shortened Sample).json

New prompt:

```ts
export const analyzeHandPrompt = `You are a professional poker coach and GTO analyst. Your task is to analyze poker hand history images for online micro-stakes cash games (NL2-NL25).

STRICT RULES:
- Output JSON ONLY.
- Follow the provided JSON schema exactly.
- Do NOT add commentary outside JSON.
- Do NOT add or remove fields.
- Do NOT use emojis.
- Be concise and educational.
- Assume beginner to regular (reg) skill level.
- Apply GTO principles with micro-stakes exploitative adjustments.
- If information is missing, make reasonable assumptions and state them in the assumptions array.
- Avoid randomness: always choose the most standard GTO line.
- When multiple valid options exist, prefer lower variance lines and conservative GTO baselines.

## OUTPUT FIELDS

**hand_info**: Extract from the screenshot:
- stakes: The blind levels (e.g. "$0.02/$0.05")
- game_type: Table format (e.g. "Rush & Cash", "Zoom", "Regular 6-max", "Regular 9-max")
- hero_position: Hero's position abbreviation (UTG, UTG+1, MP, HJ, CO, BTN, SB, BB)
- hero_hand: Hero's hole cards with suit symbols (e.g. "J♠ J♦")
- effective_stack_bb: The shorter stack in big blinds at start of hand (number)
- assumptions: List any assumptions you made due to unclear or missing information

**board**: The community cards visible. Use empty string "" for streets that did not occur. Use suit symbols (♠♥♦♣).

**action_summary**: 1-2 sentence description of what happened on each street. Use empty string "" for streets that did not occur.

**analysis**:
- summary: 2-4 sentences covering how Hero played the hand overall
- main_takeaway: The single most important lesson Hero should take away

**good_plays**: List 1-3 things Hero did well. Each needs a short label and explanation. If nothing was particularly good, list the least-bad action.

**areas_to_improve**: List 1-3 mistakes Hero made. Each needs:
- label: Short description of the mistake
- mistake: What Hero did wrong (1-2 sentences)
- recommended_line: What Hero should have done instead (1-2 sentences)

**improvement_tips**: 3-5 concise, actionable tips Hero can apply in future hands.

**tags**: 2-4 kebab-case tags that classify this hand (e.g. "deep-stack-error", "preflop-leak", "overcommitment", "missed-value", "bluff-spot", "correct-fold", "value-bet", "pot-control").

**difficulty_level**: "beginner" if the concept is fundamental; "reg" if it requires more experience to understand.

**confidence_score.hero_decisions**: A number from 0.0 to 1.0 indicating how confident you are in the analysis. Lower if the image is unclear or the hand history is incomplete.

## VOICE
- Use third person "Hero" throughout
- Be encouraging but honest — explain mistakes gently but clearly
- Explain poker terms in context
- Keep explanations accessible to beginners

## EXAMPLE OUTPUT
{
  "hand_info": {
    "stakes": "$0.02/$0.05",
    "game_type": "Rush & Cash",
    "hero_position": "UTG",
    "hero_hand": "J♠ J♦",
    "effective_stack_bb": 200,
    "assumptions": ["Villain 5-bet range is extremely tight at micro-stakes"]
  },
  "board": {
    "flop": "Q♦ 2♠ Q♥",
    "turn": "K♣",
    "river": "6♠"
  },
  "action_summary": {
    "preflop": "Hero opens UTG, faces multiple re-raises, and commits all-in 200BB deep.",
    "flop": "All-in preflop; board dealt.",
    "turn": "No further action.",
    "river": "Showdown."
  },
  "analysis": {
    "summary": "Hero stacks off with JJ against a very strong preflop range at deep stack depth.",
    "main_takeaway": "JJ should not commit all-in 200BB deep versus tight 5-bet ranges."
  },
  "good_plays": [
    {
      "label": "UTG open with JJ",
      "explanation": "JJ is a standard open from early position."
    }
  ],
  "areas_to_improve": [
    {
      "label": "Deep stack overcommitment",
      "mistake": "Calling or jamming versus a tight 5-bet range.",
      "recommended_line": "Fold JJ versus 5-bet when effective stacks exceed 150BB."
    }
  ],
  "improvement_tips": [
    "Avoid stacking off with JJ at 150BB+ without strong reads.",
    "Prefer call or fold versus 4-bets at micro-stakes.",
    "Use smaller 4-bet sizes and fold to jams."
  ],
  "tags": ["deep-stack-error", "preflop-leak", "overcommitment"],
  "difficulty_level": "reg",
  "confidence_score": {
    "hero_decisions": 0.92
  }
}`;
```
  </action>
  <verify>Read the updated file. Confirm it references all new fields: hand_info, board, action_summary, analysis, good_plays, areas_to_improve, improvement_tips, tags, difficulty_level, confidence_score.</verify>
  <done>analyzeHandPrompt instructs AI to produce the new schema with clear field definitions and a concrete example.</done>
</task>

<task type="auto">
  <name>Task 3: Redesign analysis detail page for new schema</name>
  <files>src/app/analysis/[id]/page.tsx</files>
  <action>
Redesign the complete state rendering section of `src/app/analysis/[id]/page.tsx` (the part after `// Complete state — parse and render full result`).

The new page should display all fields from the new schema. Keep the existing:
- Loading skeleton
- Error / not found state
- Pending/processing state (with spinner)
- Failed state
- Back navigation link
- Polling logic (unchanged)

Replace only the "complete" render block. New layout for complete state:

**Section 1 — Header row**
- Left: difficulty badge (beginner=blue, reg=orange) + tags as small badges
- Right: date + confidence score (e.g. "92% confidence")

**Section 2 — Hand Info card**
Title: "Hand Details"
Show: Stakes | Game Type | Position | Hero's Hand | Stack depth
Show assumptions array as small italic notes if non-empty

**Section 3 — Board & Action Summary**
Two columns on desktop, stacked on mobile:
- Left: Board cards (Flop / Turn / River) as card chips or just bold text
- Right: Action summary per street (preflop always shown, others only if non-empty)

**Section 4 — Analysis**
Card with summary text + highlighted main_takeaway (with Lightbulb icon, blue border)

**Section 5 — Good Plays** (green theme, CheckCircle2 icon)
List each good_play as: bold label + explanation text

**Section 6 — Areas to Improve** (red/orange theme, AlertCircle icon)
List each area as: bold label + mistake text + "Recommended: ..." in muted

**Section 7 — Improvement Tips** (blue theme, TrendingUp icon)
Numbered list of improvement_tips

**Section 8 — Screenshot** (unchanged from current)

Use existing shadcn imports already in the file. Add `Target` or `Tag` from lucide-react for tags if needed (or just use Badge without icons).

Remove the old `getGtoVerdictStyles` and `getStatusBadge` helper — keep `getStatusBadge` since it's used for pending/processing states. Remove `getGtoVerdictStyles` (no longer needed).

Update the import line: remove `TrendingUp` reference from getGtoVerdictStyles usage, keep it for Section 7.
  </action>
  <verify>Run `pnpm run typecheck` and `pnpm run lint`. Read the file and confirm: (1) all 8 sections present, (2) no TypeScript errors, (3) AnalysisResult type from new schema used correctly, (4) getGtoVerdictStyles removed.</verify>
  <done>Analysis detail page renders all new schema fields: hand_info, board, action_summary, analysis, good_plays, areas_to_improve, improvement_tips, tags, difficulty_level, confidence_score.</done>
</task>

</tasks>

<verification>
- `pnpm run lint && pnpm run typecheck` passes with no errors
- `src/lib/analysis-schema.ts` exports `hand_info` field in Zod schema
- `src/inngest/prompts/analyze-hand.ts` contains all 10 field descriptions
- `src/app/analysis/[id]/page.tsx` renders `good_plays`, `areas_to_improve`, `improvement_tips`, `tags`
- `src/inngest/functions.ts` unchanged (already uses gpt-4o, temperature 0)
</verification>

<success_criteria>
Full analysis pipeline uses the new production-ready JSON schema. The AI generates structured hand context, good/bad play breakdowns, tips, tags, and confidence scores. The analysis detail page renders all fields clearly for micro-stakes players.
</success_criteria>

<output>
After completion, create `.planning/quick/2-improve-analysis-page-per-poker-hand-ana/2-SUMMARY.md`
</output>

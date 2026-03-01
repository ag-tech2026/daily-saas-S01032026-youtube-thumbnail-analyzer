---
phase: 04-ai-vision-analysis
plan: 01
subsystem: AI Vision Analysis
tags: [ai, vision, openrouter, inngest, analysis]
dependency_graph:
  requires: [03-01-inngest-integration, 02-01-upload-api, 01-02-google-oauth]
  provides: [gto-analysis-engine, structured-poker-feedback, credit-refund-system]
  affects: [database-analysis-table, inngest-background-jobs, user-credits]
tech_stack:
  added: [vercel-ai-sdk-generateObject, openrouter-vision-models, zod-schema-validation]
  patterns: [structured-output-validation, atomic-credit-refund, inngest-step-memoization]
key_files:
  created:
    - src/lib/analysis-schema.ts
    - src/inngest/prompts/analyze-hand.ts
  modified:
    - src/inngest/functions.ts
decisions:
  - decision: Use generateObject API (not generateText with experimental_output)
    rationale: Vercel AI SDK 5.x standard for structured outputs
  - decision: Default to google/gemini-2.0-flash-001 (cheap model, not GPT-4o)
    rationale: User explicitly requested cheap model for cost efficiency, configurable via OPENROUTER_MODEL
  - decision: Use atomic SQL increment for credit refund
    rationale: Prevents race conditions, matches pattern from upload API credit deduction
  - decision: Wrap vision + save in try/catch, not just vision
    rationale: Ensures refund happens if either step fails after retries
  - decision: System prompt encodes all 12 analysis rules from CONTEXT.md
    rationale: Locked decisions ensure consistent friendly coach tone with Hero voice and minimal jargon
metrics:
  duration: 3 minutes
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
  completed_date: 2026-02-17
---

# Phase 04 Plan 01: AI Vision Analysis Implementation Summary

**One-liner:** OpenRouter vision model analyzes poker screenshots via generateObject API, producing Zod-validated GTO feedback with atomic credit refund on permanent failure.

## What Was Built

Implemented the core AI vision analysis pipeline for the poker GTO review app. Users can now upload poker screenshots and receive structured, beginner-friendly GTO analysis powered by OpenRouter vision models.

### Created Files

**src/lib/analysis-schema.ts** (analysisSchema, AnalysisResult)
- Zod schema with streetAnalysisSchema for per-street analysis
- Fields: street (enum), heroAction, gtoVerdict (enum), explanation, rangeNote, evNote
- Top-level schema: streets array (.min(1)), overallVerdict (enum), verdictSummary, keyTakeaway
- All fields use .describe() to guide vision model output

**src/inngest/prompts/analyze-hand.ts** (analyzeHandPrompt)
- Comprehensive system prompt encoding all 12 locked decisions from CONTEXT.md
- Friendly coach personality, third person "Hero" voice, minimal jargon
- Instructions: every street gets analysis, simplified ranges only, directional EV only
- Handles partial hands (only analyze streets that occurred)
- Suggests GTO play when Hero deviates
- Binary verdict with key takeaway structure

### Modified Files

**src/inngest/functions.ts** (processAnalysis function)
- Added vision analysis step: calls generateObject with openrouter(modelId)
- Uses OPENROUTER_MODEL env var, defaults to google/gemini-2.0-flash-001 (cheap model)
- Passes analysisSchema for structured output validation
- System prompt from analyzeHandPrompt, user message includes image URL
- Temperature 0.3 for consistent outputs
- Save step: writes JSON.stringify(result) to analysis.result, status "complete"
- Credit refund step: atomic SQL increment on user.credits, marks analysis "failed"
- Try/catch wraps both vision + save steps (refund runs after all retries)
- Function has 4 step.run() calls: update-status-processing, analyze-with-vision, save-analysis-result, refund-credit-on-failure

## Deviations from Plan

None - plan executed exactly as written.

## Testing Evidence

All verification commands passed:
- `pnpm run lint` - no errors
- `pnpm run typecheck` - no type errors
- `pnpm run build:ci` - successful production build

Verified:
- analysisSchema exports correctly with AnalysisResult type
- analyzeHandPrompt exports as string
- processAnalysis has 4 step.run() calls with correct names
- Model uses process.env.OPENROUTER_MODEL with fallback
- Credit refund uses atomic sql\`\${user.credits} + 1\` (no race conditions)

## Technical Notes

**Vercel AI SDK API Choice:**
- Used generateObject (not generateText with experimental_output)
- This is the standard v5.x API for structured outputs
- Cleaner API surface: schema, system, messages, temperature

**Inngest Step Memoization:**
- Vision model call wrapped in step.run() prevents cost explosion on retries
- First execution is memoized, retries reuse result
- Critical for expensive API calls like vision models

**Error Handling Flow:**
- Inngest retries 3 times (4 total attempts) per plan 03-01 decision
- Credit refund ONLY happens after ALL retries exhausted
- Re-throw error after refund so Inngest marks function as failed

**Model Selection:**
- Default: google/gemini-2.0-flash-001 (cheap, fast vision model)
- Configurable: OPENROUTER_MODEL env var (e.g., openai/gpt-4o for higher accuracy)
- User explicitly requested cheap model, not GPT-4o by default

## Integration Points

**Upstream dependencies:**
- Requires Inngest setup (03-01) to trigger processAnalysis function
- Requires upload API (02-01) to provide imageUrl and userId
- Requires user credits system (01-01) for refund mechanism

**Downstream consumers:**
- Analysis result JSON will be consumed by frontend display (Phase 5)
- Failed analysis status triggers UI error handling (Phase 5)
- Refunded credits immediately available for re-upload

## Next Steps

Phase 5 (Results Display) will:
- Parse analysis.result JSON into UI components
- Display street-by-street analysis in readable format
- Show overall verdict and key takeaway prominently
- Handle loading states during "processing" status
- Show error states for "failed" status with refund confirmation

## Self-Check: PASSED

Created files exist:
- FOUND: src/lib/analysis-schema.ts
- FOUND: src/inngest/prompts/analyze-hand.ts

Modified files exist:
- FOUND: src/inngest/functions.ts (updated with vision analysis)

Commits exist:
- FOUND: 935b605 (Task 1 - schema and prompt)
- FOUND: 79ecdfd (Task 2 - vision analysis and refund)

All exports verified:
- analysisSchema and AnalysisResult from analysis-schema.ts
- analyzeHandPrompt from analyze-hand.ts
- 4 step.run() calls in processAnalysis function

All verification commands passed:
- lint: no errors
- typecheck: no type errors
- build:ci: successful build

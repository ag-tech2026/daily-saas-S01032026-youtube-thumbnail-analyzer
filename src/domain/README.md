# Domain Module Contract

This folder defines the product‑specific AI analysis logic. To adapt the boilerplate to a new vertical (e.g. bill analysis, resume review), replace these files.

## Required Exports

- `prompt.ts` – system prompt string for the vision model (OpenAI/OpenRouter). Should instruct the model to output JSON matching `analysisSchema`.
- `schema.ts` – Zod schema (`analysisSchema`) describing the structured output shape.
- `AnalysisResult` – TypeScript type inferred from `analysisSchema`.
- `CREDITS_PER_ANALYSIS` – number of credits deducted per analysis (default 1).

## Example (poker)

See `prompt.ts` and `schema.ts` for a full example.

## Index Re-exports

`src/domain/index.ts` aggregates these exports so the rest of the app imports from `@/domain`:

```ts
export { prompt } from "./prompt";
export { analysisSchema, AnalysisResult } from "./schema";
export const CREDITS_PER_ANALYSIS = 1;
```

Ensure your `index.ts` matches this shape.

## Validation

Run `./scripts/validate-domain.sh` (if present) to check exports and schema integrity before committing.

## Notes

- The background job (`src/inngest/functions.ts`) and upload route (`src/app/api/upload/route.ts`) rely on these exports.
- Keep prompts concise and the schema lean to minimize token usage and latency.
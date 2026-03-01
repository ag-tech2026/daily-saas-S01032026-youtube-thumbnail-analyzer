# Phase 4: AI Vision Analysis - Research

**Researched:** 2026-02-17
**Domain:** Vision model integration, structured output generation, poker hand analysis
**Confidence:** HIGH

## Summary

Phase 4 integrates OpenRouter's GPT-4o vision model into the existing Inngest background job to analyze poker screenshots and produce structured GTO feedback. The analysis must extract table state from images, apply GTO strategy knowledge, and format results in beginner-friendly language using a "Hero" narrative voice.

The technical stack is already constrained by the project's existing Vercel AI SDK integration. GPT-4o on OpenRouter provides superior vision quality for detailed screenshot analysis, with structured output support via Vercel AI SDK's `generateText` with `Output.object()`. The analysis schema must support variable-length street arrays (hands ending preflop vs going to river) and follow established poker review conventions.

**Primary recommendation:** Use GPT-4o as the primary model with Claude Sonnet 3.5 as a fallback, implement structured output via Vercel AI SDK with Zod schema, add vision analysis as a new `step.run()` in the existing `processAnalysis` function, and implement credit refund logic in a separate conditional `step.run()` that only executes on analysis failure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Analysis tone & language:**
- Friendly coach personality — encouraging but honest, explains mistakes gently
- Minimal jargon — explain poker terms in context ("your range (the hands you should play here) is too wide")
- Third person "Hero" voice — standard poker review format ("Hero raised preflop which is correct")
- Acknowledge good plays briefly ("Correct play. GTO-aligned.") then focus more on areas for improvement

**Analysis depth per street:**
- Every street analyzed (preflop, flop, turn, river) — each gets its own section regardless of how standard the play was
- Simplified ranges — describe in categories ("strong top pairs and better"), not specific hand lists
- Directional EV only — "this call loses money long-term" / "this bet is profitable", no numerical EV
- Always suggest the GTO play when Hero deviates — "Hero called, but GTO recommends raising here to put pressure on draws"

**Overall verdict style:**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @openrouter/ai-sdk-provider | Latest | OpenRouter provider for Vercel AI SDK | Already in project, provides unified API for 300+ models |
| ai (Vercel AI SDK) | 5.x | Structured output generation from vision models | Project standard, `generateText` with `Output.object()` for type-safe structured outputs |
| zod | Latest | Schema validation for structured outputs | Project standard, TypeScript-native schema definition |
| inngest | 3.52.0 | Background job orchestration | Already implemented in Phase 3 with step-based retry logic |

### Vision Model Selection
| Model | Price (per 1M tokens) | Context | Purpose | Why Use |
|-------|-------------|---------|---------|---------|
| openai/gpt-4o | $2.50 input / $10 output | 128K | Primary vision model | Best vision quality, supports structured outputs, handles complex screenshots with multiple UI elements |
| anthropic/claude-3.5-sonnet | $3 input / $15 output | 200K | Fallback | Strong reasoning, good vision quality, OpenRouter supports automatic failover |

**Cost per analysis estimate:**
- Average screenshot: ~1000 tokens (vision encoding)
- Average structured output: ~800 tokens
- Cost per analysis: $0.0025 input + $0.008 output = **~$0.011 per analysis**
- User pays $9 for 50 credits = $0.18 per analysis, so model cost is ~6% of revenue

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm/sql | Latest | Atomic credit increment for refunds | Use `sql`${user.credits} + 1`` in update for atomic increment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GPT-4o | GPT-4o-mini | 60% cheaper but vision is actually MORE expensive (2833 token fixed cost vs GPT-4o's variable cost), and vision quality is lower for detailed screenshots |
| GPT-4o | Claude Sonnet 3.5 | Slightly more expensive ($0.012 vs $0.011), longer context but may not be needed, comparable vision quality |
| Vercel AI SDK | Direct OpenRouter API | Would lose type-safe structured output, have to manually parse JSON, reinvent validation |

**Installation:**
```bash
# Already installed in Phase 3
# No new packages needed - @openrouter/ai-sdk-provider and ai are already in package.json
```

## Architecture Patterns

### Recommended File Structure
```
src/
├── inngest/
│   ├── client.ts              # Existing Inngest client
│   ├── types.ts               # Existing event schemas
│   ├── functions.ts           # Existing processAnalysis function - ADD vision step here
│   └── prompts/               # New folder for AI prompts
│       └── analyze-hand.ts    # System prompt for GTO analysis
├── lib/
│   ├── schema.ts              # Existing DB schema
│   └── analysis-schema.ts     # NEW: Zod schema for structured analysis output
```

### Pattern 1: Vision Analysis Step in Inngest Function
**What:** Add a new `step.run("analyze-with-vision")` to the existing `processAnalysis` function
**When to use:** For any long-running AI operation that should be idempotent and retriable
**Example:**
```typescript
// In src/inngest/functions.ts
import { generateText, Output } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { analysisSchema } from "@/lib/analysis-schema";
import { analyzeHandPrompt } from "@/inngest/prompts/analyze-hand";

export const processAnalysis = inngest.createFunction(
  { id: "process-analysis", retries: 3 },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    // Existing status update step
    await step.run("update-status-processing", async () => { /* ... */ });

    // NEW: Vision analysis step
    const analysis = await step.run("analyze-with-vision", async () => {
      const result = await generateText({
        model: openrouter("openai/gpt-4o"),
        output: Output.object({ schema: analysisSchema }),
        messages: [
          {
            role: "system",
            content: analyzeHandPrompt, // System prompt with GTO coaching instructions
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this poker hand screenshot using GTO principles." },
              { type: "image", image: event.data.imageUrl }, // Public URL from Vercel Blob
            ],
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      return result.object; // Type-safe structured output matching analysisSchema
    });

    // Save analysis result to database
    await step.run("save-analysis-result", async () => {
      await db
        .update(analysis)
        .set({
          result: JSON.stringify(analysis),
          status: "complete",
          updatedAt: new Date(),
        })
        .where(eq(analysis.id, event.data.analysisId));
    });

    return { success: true, analysisId: event.data.analysisId };
  }
);
```

### Pattern 2: Structured Output Schema with Zod
**What:** Define a Zod schema that enforces the analysis structure expected by the frontend
**When to use:** For any AI-generated content that must conform to a specific structure
**Example:**
```typescript
// In src/lib/analysis-schema.ts
import { z } from "zod";

const streetAnalysisSchema = z.object({
  street: z.enum(["preflop", "flop", "turn", "river"]),
  heroAction: z.string().describe("What Hero did (e.g., 'raised to 3BB', 'called', 'folded')"),
  gtoVerdict: z.enum(["correct", "acceptable", "incorrect"]).describe("GTO assessment of Hero's action"),
  explanation: z.string().describe("Beginner-friendly explanation of why this action is correct/incorrect, what GTO recommends, and why. Use the 'Hero' voice (third person). Explain jargon in context."),
  rangeNote: z.string().optional().describe("Optional range guidance in categories (e.g., 'strong value hands like top pair or better')"),
  evNote: z.string().optional().describe("Optional directional EV note (e.g., 'this call loses money long-term' or 'this bet is profitable')"),
});

export const analysisSchema = z.object({
  streets: z.array(streetAnalysisSchema)
    .min(1)
    .describe("Analysis for each street that occurred. If hand ended preflop, array has 1 item. If went to river, array has 4 items."),

  overallVerdict: z.enum(["GTO-Compliant", "Needs Improvement"])
    .describe("Binary assessment of entire hand"),

  verdictSummary: z.string()
    .describe("1-2 sentence summary explaining the verdict. Focus on biggest mistake or best play."),

  keyTakeaway: z.string()
    .describe("Single most important lesson from this hand. What should Hero remember?"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
```

### Pattern 3: Conditional Credit Refund Step
**What:** Add a conditional `step.run()` that only executes when analysis fails after all retries
**When to use:** For cleanup operations that should only happen on permanent failure
**Example:**
```typescript
// In src/inngest/functions.ts
export const processAnalysis = inngest.createFunction(
  { id: "process-analysis", retries: 3 },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    try {
      // Existing steps...
      await step.run("update-status-processing", async () => { /* ... */ });
      const analysis = await step.run("analyze-with-vision", async () => { /* ... */ });
      await step.run("save-analysis-result", async () => { /* ... */ });

      return { success: true, analysisId: event.data.analysisId };
    } catch (error) {
      // After all retries exhausted, refund credit
      await step.run("refund-credit-on-failure", async () => {
        await db
          .update(user)
          .set({
            credits: sql`${user.credits} + 1`, // Atomic increment
          })
          .where(eq(user.id, event.data.userId));

        await db
          .update(analysis)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(analysis.id, event.data.analysisId));
      });

      throw error; // Re-throw so Inngest marks function as failed
    }
  }
);
```

### Pattern 4: Prompt Engineering for Vision + Structured Output
**What:** System prompt that guides the vision model to analyze poker screenshots with GTO expertise and output structured data
**When to use:** For domain-specific vision analysis requiring both extraction and expert reasoning
**Example:**
```typescript
// In src/inngest/prompts/analyze-hand.ts
export const analyzeHandPrompt = `You are a friendly poker coach analyzing a hand for a student. Your goal is to help them understand what they did right or wrong from a GTO (Game Theory Optimal) perspective.

## Your Personality
- Encouraging but honest — acknowledge good plays briefly, explain mistakes gently
- Minimal jargon — when you must use poker terms, explain them in context
- Use "Hero" voice — refer to the player as "Hero" in third person (e.g., "Hero raised preflop")

## How to Analyze

1. **Identify the streets played:** Look at the screenshot to determine which streets occurred (preflop, flop, turn, river). If the hand ended preflop, only analyze preflop.

2. **For each street:**
   - Identify Hero's action (what they did: fold, call, bet, raise, check)
   - Assess whether this action is correct, acceptable, or incorrect from a GTO perspective
   - Explain what GTO recommends and why, in beginner-friendly language
   - If Hero deviated from GTO, explain what they should have done instead
   - Provide range guidance in categories (not specific hands): "strong value hands like top pair or better"
   - Provide directional EV notes: "this call loses money long-term" (NO numerical EV)

3. **Overall verdict:**
   - Binary: "GTO-Compliant" or "Needs Improvement"
   - 1-2 sentence summary explaining why
   - Highlight one key takeaway — the single biggest mistake or best play

## Important Guidelines
- Every street gets its own analysis, even if the play was standard
- Acknowledge good plays briefly: "Correct play. GTO-aligned."
- Focus MORE on areas for improvement
- No numerical EV — only directional (profitable/unprofitable/break-even)
- Ranges in categories, not specific hands
- Tell a story: street-by-street building to verdict at the end

## Supported Poker Sites
This analysis works with screenshots from PokerStars, GGPoker, and 888poker. Extract the table state, player positions, actions, and board cards from the screenshot.
`;
```

### Anti-Patterns to Avoid

- **Anti-pattern: Putting vision analysis outside step.run()** — Vision API calls are non-deterministic and expensive. ALWAYS wrap in `step.run()` so retries don't call the API multiple times on the same function execution.

- **Anti-pattern: Refunding credit in the main flow** — Don't refund credits unless you're certain the analysis has permanently failed. Refund in a try/catch AFTER all retries, not in normal flow.

- **Anti-pattern: Hard-coding prompts in function** — Prompts get long and complex. Extract to separate files for maintainability and testing.

- **Anti-pattern: Using generateObject instead of generateText with output** — `generateObject` is deprecated. Use `generateText` with `output: Output.object()` for structured outputs.

- **Anti-pattern: Not describing schema fields** — Vision models benefit from field descriptions in Zod schemas. Use `.describe()` liberally to guide the model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image encoding for vision API | Custom base64 encoder, image preprocessor | Pass public URL directly to vision model | OpenRouter and Vercel AI SDK handle URL fetching and encoding automatically. No need to download/encode. |
| Structured output parsing | Manual JSON parsing, regex extraction, fallback to text parsing | Vercel AI SDK `Output.object()` with Zod | SDK validates against schema, throws typed errors, and retries on validation failure. Manual parsing loses type safety. |
| Retry logic for vision API | Custom retry loops, exponential backoff, rate limiting | Inngest `step.run()` + `retries: 3` config | Inngest handles retries, backoff, memoization, and provides observability. Custom retry logic misses edge cases. |
| Credit refund logic | Custom job queue, separate cron check for failed analyses | Conditional `step.run()` in try/catch after retries exhausted | Ensures atomicity — refund happens exactly once when analysis permanently fails, not before. |
| Fallback model strategy | Custom try/catch with multiple model calls | OpenRouter Model Fallbacks feature | OpenRouter automatically tries fallback models if primary fails, no code needed. Configure via models array. |

**Key insight:** Vision model integration has many edge cases (timeouts, rate limits, malformed outputs, encoding issues). The Vercel AI SDK + Inngest stack handles these systematically. Custom solutions miss cases like: what if vision model times out during retry? What if output is valid JSON but invalid schema? What if two steps need to be atomic? Use the platform.

## Common Pitfalls

### Pitfall 1: Vision Token Cost Surprise
**What goes wrong:** GPT-4o-mini looks cheaper ($0.15 input / $0.60 output per 1M tokens) but has a fixed 2833 token cost for vision processing, making it 2x MORE expensive than GPT-4o for image analysis.
**Why it happens:** Developers see "mini" and assume it's cheaper for all tasks. Vision encoding has fixed overhead.
**How to avoid:** Use GPT-4o for vision tasks. Only use GPT-4o-mini for text-only tasks.
**Warning signs:** Cost per analysis is higher than expected, vision API bills show high token counts for simple screenshots.

**Source:** [How GPT-4o-mini can be simultaneously 20x cheaper and 2x more expensive than GPT-4o](https://www.strathweb.com/2024/10/how-gpt-4o-mini-can-be-simultaneously-20x-cheaper-and-2x-more-expensive-than-gpt-4o/)

### Pitfall 2: Calling Vision API Outside step.run()
**What goes wrong:** Vision API is called in the main function body, not wrapped in `step.run()`. When Inngest retries after a later step fails, the vision API is called AGAIN, doubling cost and potentially producing different results.
**Why it happens:** Developers new to Inngest don't understand memoization. They think "this is just a function call, why wrap it?"
**How to avoid:** ALWAYS wrap external API calls (especially expensive ones like vision) in `step.run()`. Inngest memoizes completed steps, so retries don't re-execute them.
**Warning signs:** Inngest logs show multiple vision API calls for the same analysisId, token costs are 2-4x expected.

**Source:** [Inngest: How Functions Are Executed](https://www.inngest.com/docs/learn/how-functions-are-executed)

### Pitfall 3: Refunding Credit Too Early
**What goes wrong:** Credit refund logic runs in the main flow or after the first API error, before all retries are exhausted. User gets credit back but analysis eventually succeeds, resulting in free analysis.
**Why it happens:** Developer puts refund in a catch block that catches transient errors, not just permanent failures.
**How to avoid:** Only refund in the outermost catch block, AFTER the function has exhausted all retries and is about to permanently fail. Use a separate `step.run("refund-credit-on-failure")` so it's atomic and idempotent.
**Warning signs:** Users report getting free analyses, Inngest logs show credit refunds followed by successful completions.

### Pitfall 4: Structured Output Validation Failures Not Retried
**What goes wrong:** Vision model returns JSON that doesn't match the Zod schema (e.g., uses "Correct" instead of "correct", or omits a required field). Error is caught and analysis is marked as failed without retrying.
**Why it happens:** Developer doesn't realize Vercel AI SDK automatically retries validation failures up to the provider's limit, and the issue is actually in the prompt or schema.
**How to avoid:**
1. Use `.describe()` on every Zod field to guide the model
2. Review schema validation errors in Inngest logs to identify prompt improvements
3. Set `temperature: 0.3` or lower for more consistent outputs
4. Use enums for constrained fields (e.g., `z.enum(["correct", "acceptable", "incorrect"])`)
**Warning signs:** Analysis failures with error messages like "Expected 'correct', received 'Correct'" or "Required field missing".

### Pitfall 5: Not Handling Variable-Length Street Arrays
**What goes wrong:** Schema expects exactly 4 streets (preflop, flop, turn, river) but some hands end preflop. Vision model either includes non-existent streets or validation fails because array length is wrong.
**Why it happens:** Developer designs schema for the "happy path" (hand goes to river) without considering early termination.
**How to avoid:** Use `.min(1)` instead of `.length(4)` on the streets array. Prompt the model to "only include streets that actually occurred." Handle variable-length arrays in frontend rendering.
**Warning signs:** Analysis fails for hands that ended preflop or on flop with "array length mismatch" errors.

### Pitfall 6: Public URL Expiry in Retries
**What goes wrong:** Vercel Blob URLs might expire or become inaccessible between retries if there's a delay. Vision API can't fetch the image, analysis fails.
**Why it happens:** Developer assumes URLs are permanent or doesn't consider retry delays.
**How to avoid:**
1. Ensure Vercel Blob URLs are public and long-lived (default is permanent)
2. Test retry behavior with intentional failures
3. Consider passing base64-encoded image in event payload if URLs are problematic (tradeoff: larger event payload)
**Warning signs:** First attempt succeeds but retries fail with "image not found" or "URL inaccessible" errors.

## Code Examples

Verified patterns from official sources:

### Vercel AI SDK: Vision + Structured Output
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
import { generateText, Output } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const result = await generateText({
  model: openrouter("openai/gpt-4o"),
  output: Output.object({
    schema: z.object({
      analysis: z.string(),
      confidence: z.number(),
    }),
  }),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe this image" },
        { type: "image", image: "https://example.com/image.jpg" }, // Public URL
      ],
    },
  ],
});

console.log(result.object); // { analysis: "...", confidence: 0.95 }
```

### OpenRouter: Image Input Format
```typescript
// Source: https://openrouter.ai/docs/guides/overview/multimodal/images
// OpenRouter accepts either public URLs or base64-encoded images
const messages = [
  {
    role: "user",
    content: [
      { type: "text", text: "Text prompt first" }, // Best practice: text before images
      { type: "image", image: "https://example.com/image.jpg" }, // URL format
      // OR
      { type: "image", image: "data:image/jpeg;base64,/9j/4AAQ..." }, // Base64 format
    ],
  },
];

// Multiple images supported (varies by provider/model)
const multiImageMessages = [
  {
    role: "user",
    content: [
      { type: "text", text: "Compare these images" },
      { type: "image", image: "https://example.com/image1.jpg" },
      { type: "image", image: "https://example.com/image2.jpg" },
    ],
  },
];
```

### Drizzle ORM: Atomic Credit Increment
```typescript
// Source: https://orm.drizzle.team/docs/guides/incrementing-a-value
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Atomic increment — happens at database level, no race condition
await db
  .update(user)
  .set({
    credits: sql`${user.credits} + 1`, // PostgreSQL-level atomic operation
  })
  .where(eq(user.id, userId));

// This is SAFER than:
// 1. SELECT credits FROM user WHERE id = userId
// 2. Calculate newCredits = credits + 1
// 3. UPDATE user SET credits = newCredits WHERE id = userId
// ^ Race condition: what if another request updates credits between steps 1 and 3?
```

### Inngest: Conditional Step Execution
```typescript
// Source: https://www.inngest.com/docs/guides/multi-step-functions
import { inngest } from "@/inngest/client";

export const myFunction = inngest.createFunction(
  { id: "my-function", retries: 3 },
  { event: "my/event" },
  async ({ event, step }) => {
    try {
      const result = await step.run("main-operation", async () => {
        // Main logic
        return { success: true };
      });

      return result;
    } catch (error) {
      // This only runs after ALL retries are exhausted
      await step.run("cleanup-on-failure", async () => {
        // Rollback, refund, notification, etc.
      });

      throw error; // Re-throw to mark function as failed
    }
  }
);

// Key insight: The catch block only executes after retries are exhausted.
// During retries, Inngest re-executes the function from the top,
// memoizing completed steps, so "main-operation" doesn't re-run.
// Only when "main-operation" fails after all retries does the catch execute.
```

### Complete Example: Vision Analysis in Inngest
```typescript
// Complete integration example
import { generateText, Output } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { db } from "@/lib/db";
import { analysis, user } from "@/lib/schema";
import { inngest } from "@/inngest/client";
import { analysisSchema } from "@/lib/analysis-schema";
import { analyzeHandPrompt } from "@/inngest/prompts/analyze-hand";

export const processAnalysis = inngest.createFunction(
  {
    id: "process-analysis",
    retries: 3, // 4 total attempts (1 initial + 3 retries)
  },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    const { analysisId, userId, imageUrl } = event.data;

    // Validation
    if (!analysisId || !userId || !imageUrl) {
      throw new NonRetriableError("Missing required event data");
    }

    try {
      // Step 1: Update status to processing
      await step.run("update-status-processing", async () => {
        const result = await db
          .update(analysis)
          .set({ status: "processing", updatedAt: new Date() })
          .where(eq(analysis.id, analysisId))
          .returning();

        if (result.length === 0) {
          throw new NonRetriableError(`Analysis ${analysisId} not found`);
        }

        return result[0];
      });

      // Step 2: Analyze screenshot with vision model
      const analysisResult = await step.run("analyze-with-vision", async () => {
        const result = await generateText({
          model: openrouter("openai/gpt-4o"),
          output: Output.object({ schema: analysisSchema }),
          messages: [
            { role: "system", content: analyzeHandPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this poker hand screenshot using GTO principles. Identify which streets occurred and analyze each one.",
                },
                { type: "image", image: imageUrl },
              ],
            },
          ],
          temperature: 0.3, // More consistent outputs
        });

        return result.object; // Type: AnalysisResult
      });

      // Step 3: Save result to database
      await step.run("save-analysis-result", async () => {
        await db
          .update(analysis)
          .set({
            result: JSON.stringify(analysisResult),
            status: "complete",
            updatedAt: new Date(),
          })
          .where(eq(analysis.id, analysisId));
      });

      return { success: true, analysisId, result: analysisResult };
    } catch (error) {
      // Only executes after ALL retries exhausted
      await step.run("refund-credit-on-failure", async () => {
        // Atomic credit increment
        await db
          .update(user)
          .set({ credits: sql`${user.credits} + 1` })
          .where(eq(user.id, userId));

        // Mark analysis as failed
        await db
          .update(analysis)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(analysis.id, analysisId));
      });

      throw error; // Re-throw to mark function as failed in Inngest
    }
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` | `generateText()` with `output: Output.object()` | AI SDK 6 (2024) | Unified API for text and structured outputs, better type inference |
| Custom JSON schema validation | Zod/Valibot/JSON Schema via Standard JSON Schema interface | AI SDK 6 (2024) | Type-safe schemas, better error messages, no manual validation |
| Manual vision API base64 encoding | Pass public URL directly | GPT-4V/GPT-4o (2024) | Simpler code, no encoding overhead, provider handles download |
| Single model hardcoded | OpenRouter Model Fallbacks | OpenRouter (2025) | Automatic failover, no custom retry logic needed |
| Text prompting for structured data | Structured outputs natively supported | GPT-4o (2024) | More reliable parsing, lower hallucination rate |

**Deprecated/outdated:**
- `generateObject()` and `streamObject()` — replaced by `generateText/streamText` with `output` parameter
- Manual JSON parsing from vision models — use `Output.object()` instead
- GPT-4 Turbo for vision — GPT-4o has better vision quality and is 50% cheaper
- Base64 encoding images for vision API — pass URLs directly when possible

## Open Questions

### Question 1: Should we implement OpenRouter Model Fallbacks?
**What we know:** OpenRouter supports automatic failover between models. If GPT-4o is unavailable, it can automatically try Claude Sonnet 3.5.
**What's unclear:**
- Does this require special OpenRouter configuration or just passing multiple models?
- Do we lose structured output support when falling back to Claude (does Claude support `Output.object()`)?
- What's the reliability delta? (How often does GPT-4o fail vs Claude?)
**Recommendation:** Implement primary fallback in code (try GPT-4o, catch error, try Claude in same step.run). OpenRouter fallbacks are more for infrastructure failures than API errors. Test Claude structured output support before implementing.

### Question 2: How to handle poker sites where UI elements obscure cards/actions?
**What we know:** GPT-4o has strong vision capabilities and can "read" UI elements, but some poker sites have overlays, animations, or UI that might obscure critical information.
**What's unclear:**
- Can GPT-4o reliably extract table state from screenshots with partially obscured information?
- Should we guide users to take screenshots at specific moments (e.g., after action is complete)?
- Do we need preprocessing (OCR, element detection) before vision model?
**Recommendation:** Start with raw screenshots + prompt guidance. Monitor failure rates by poker site. Add user guidance ("wait until action is complete before screenshotting") if needed. Only add preprocessing if vision model consistently fails.

### Question 3: Should analysis schema include machine-readable ranges?
**What we know:** User decisions specify "simplified ranges" in natural language categories, not specific hand lists.
**What's unclear:**
- Future features (v2) might want to render 13x13 range grids. Should we structure ranges now for future use?
- Would asking vision model to output machine-readable ranges (e.g., array of hand strings like ["AA", "KK", "AKs"]) improve or hurt analysis quality?
**Recommendation:** Start with natural language ranges only (aligned with user decisions). If v2 requires range grids, add a separate field to schema or run post-processing. Overspecifying now might constrain vision model and reduce explanation quality.

## Sources

### Primary (HIGH confidence)
- [OpenRouter Image Inputs Documentation](https://openrouter.ai/docs/guides/overview/multimodal/images) - Image format, base64 vs URL, best practices
- [Vercel AI SDK: generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) - Vision model integration, Output.object() syntax
- [Vercel AI SDK: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Zod schema definition, validation
- [Inngest: How Functions Are Executed](https://www.inngest.com/docs/learn/how-functions-are-executed) - Memoization, idempotent retries, step.run()
- [Inngest: step.run() Reference](https://www.inngest.com/docs/reference/functions/step-run) - Retry behavior, return value handling
- [Drizzle ORM: Incrementing a Value](https://orm.drizzle.team/docs/guides/incrementing-a-value) - Atomic increment with sql helper
- [OpenRouter: GPT-4o Model Page](https://openrouter.ai/openai/gpt-4o) - Pricing, context window, capabilities
- [GTO Wizard: Hand History Analyzer](https://help.gtowizard.com/how-to-use-the-hand-history-analyzer/) - Poker analysis structure, street-by-street format

### Secondary (MEDIUM confidence)
- [GPT-4o vs GPT-4o-mini Vision Cost Analysis](https://www.strathweb.com/2024/10/how-gpt-4o-mini-can-be-simultaneously-20x-cheaper-and-2x-more-expensive-than-gpt-4o/) - Vision token costs
- [OpenRouter Model Fallbacks Documentation](https://openrouter.ai/docs/guides/routing/model-fallbacks) - Automatic failover strategy
- [Relay.app: GPT-4o vs GPT-4o-mini Comparison](https://www.relay.app/blog/compare-gpt-4o-vs-gpt-4o-mini) - Vision quality differences
- [Making GPT-4V Play Poker (Medium Article)](https://medium.com/@enricdomingo/making-gpt-4v-to-play-poker-for-me-automatic-vision-bot-in-python-69031c79e733) - Vision model poker screenshot analysis

### Tertiary (LOW confidence)
- [Can LLMs Play Poker? Building a Bot with GPT-4 and Claude (Medium)](https://medium.com/@jay_learner/can-large-language-models-play-poker-building-a-poker-bot-with-gpt-4-and-claude-4694d42d5889) - Poker domain knowledge for LLMs
- [GTOx Poker Analysis Structure](https://gtox.io/) - GTO analysis format (MacroAnalysis, MesoAnalysis, MicroAnalysis)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already uses Vercel AI SDK and Inngest, official docs confirm vision + structured output support
- Architecture: HIGH - Patterns verified in official docs, existing Phase 3 implementation provides foundation
- Prompting strategy: MEDIUM - Verified that vision models can analyze poker screenshots, but exact prompt quality will require iteration
- Pitfalls: MEDIUM-HIGH - Vision token costs and memoization issues verified in docs, other pitfalls based on common patterns but not project-specific

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days — OpenRouter and Vercel AI SDK are stable, vision model capabilities evolving but not rapidly)

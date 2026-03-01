# Phase 3: Background Job Setup - Research

**Researched:** 2026-02-17
**Domain:** Background job orchestration with Inngest
**Confidence:** HIGH

## Summary

Inngest is the industry-standard TypeScript-first background job orchestration platform that integrates seamlessly with Next.js App Router applications. It provides automatic retries with exponential backoff, type-safe event handling, step-based workflows with independent retry counters, and built-in observability through cloud dashboard or local dev server.

For this phase, we'll integrate Inngest to trigger asynchronous analysis jobs when uploads complete. The job will update the analysis status from "pending" to "processing" when it starts, preparing the foundation for Phase 4's AI analysis implementation. Inngest's step.run() pattern ensures database updates are idempotent and individually retriable, preventing duplicate status updates even if the function retries.

**Primary recommendation:** Install inngest@3.52.0, create type-safe client with event schemas, define a minimal test function with step.run() for database status updates, serve via /api/inngest endpoint, trigger from upload API after storage succeeds, and verify execution in Inngest Dev Server dashboard before production deployment.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| inngest | 3.52.0 | Background job orchestration | Industry standard for TypeScript serverless workflows, 99.67% uptime, built-in retries, observability, and step-based execution |
| inngest-cli | latest | Local development server | Official dev server for testing events/functions locally before cloud deployment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.x (already installed) | Event payload validation | Type-safe event schemas with runtime validation (Standard Schema compatible) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inngest | BullMQ + Redis | More infrastructure (Redis cluster), manual retry logic, no built-in observability, but more control for on-premise deployments |
| Inngest | Temporal | More powerful for complex workflows (microservices, long-running sagas), but heavier setup, steeper learning curve, overkill for single-step jobs |
| Inngest | Trigger.dev | Similar feature set, but Inngest has better Vercel integration, more mature TypeScript SDK, and automatic environment syncing |

**Installation:**
```bash
pnpm install inngest
pnpm install --save-dev inngest-cli
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── inngest/
│   ├── client.ts        # Inngest client with typed event schemas
│   ├── functions.ts     # Function definitions (one per file for scale)
│   └── types.ts         # Event type definitions
├── app/
│   └── api/
│       ├── inngest/
│       │   └── route.ts # Serve handler (GET, POST, PUT)
│       └── upload/
│           └── route.ts # Trigger events via inngest.send()
```

### Pattern 1: Type-Safe Event Client
**What:** Define events as TypeScript types, pass to Inngest client via EventSchemas for full type inference
**When to use:** Always - enables autocomplete, compile-time validation, prevents typos in event names
**Example:**
```typescript
// Source: https://www.inngest.com/docs/typescript
// src/inngest/types.ts
export type Events = {
  "analysis/upload.completed": {
    data: {
      analysisId: string;
      userId: string;
      imageUrl: string;
    };
  };
  "analysis/test.trigger": {
    data: {
      message: string;
    };
  };
};

// src/inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./types";

export const inngest = new Inngest({
  id: "poker-ai-review",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

### Pattern 2: Step-Based Database Updates
**What:** Wrap database operations in step.run() for automatic retries and memoization
**When to use:** Always for non-deterministic operations (DB queries, API calls, random values)
**Example:**
```typescript
// Source: https://www.inngest.com/docs/reference/functions/step-run
import { inngest } from "./client";
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const processAnalysis = inngest.createFunction(
  {
    id: "process-analysis",
    retries: 3, // 3 retries = 4 total attempts (1 initial + 3 retries)
  },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    // Step 1: Update status to processing
    const updateResult = await step.run("update-status-processing", async () => {
      return await db
        .update(analysis)
        .set({ status: "processing" })
        .where(eq(analysis.id, event.data.analysisId))
        .returning();
    });

    // Step 2: Placeholder for future AI analysis (Phase 4)
    // Each step has independent retry counter

    return { success: true, analysisId: event.data.analysisId };
  },
);
```

### Pattern 3: API Route Event Triggering
**What:** Send events from API routes after successful operations using inngest.send()
**When to use:** After database/storage operations complete, before returning response to client
**Example:**
```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
// src/app/api/upload/route.ts
import { inngest } from "@/inngest/client";

// After successful upload and database insert:
await inngest.send({
  name: "analysis/upload.completed",
  data: {
    analysisId,
    userId: session.user.id,
    imageUrl: storageResult.url,
  },
});
```

### Pattern 4: Serve Handler Setup
**What:** Export GET, POST, PUT handlers from /api/inngest route to enable Inngest platform invocation
**When to use:** Required for all Inngest integrations (local dev server and cloud)
**Example:**
```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processAnalysis } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processAnalysis], // Register all functions here
});
```

### Anti-Patterns to Avoid
- **Calling database directly in function body (not in step.run):** Retries will re-execute the entire function, potentially causing duplicate updates. Always wrap DB operations in steps.
- **Using non-serializable return values:** step.run() serializes results as JSON. Returning Date objects, MongoDB ObjectIds, or class instances will cause errors. Convert to primitives (ISO strings, plain objects).
- **Not configuring retries:** Default is 4 retries (5 total attempts). For test functions, set `retries: 3` explicitly to meet success criteria requirement.
- **Forgetting dynamic export for event triggers:** If your upload API route triggers events on every request, add `export const dynamic = "force-dynamic"` to prevent Next.js caching.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic with exponential backoff | Custom setTimeout/setInterval with backoff calculation | Inngest function-level `retries` config | Edge cases: jitter, retry budget exhaustion, observability, dead letter queues. Inngest handles all automatically. |
| Job status tracking | Custom jobs table with status polling | Inngest dashboard + API | Inngest provides run history, execution logs, input/output inspection, and webhooks. Building this requires significant infrastructure. |
| Step-based workflow orchestration | Custom state machine with checkpoint tables | Inngest step.run() | Memoization, partial replay after failures, parallel step execution with Promise.all(), and step-level retry counters are non-trivial to implement correctly. |
| Event-driven job triggering | Manual queue (BullMQ/Redis) | Inngest event system | Fan-out patterns, event filtering, batch processing, and automatic function discovery require queue infrastructure and routing logic. |
| Local dev environment for testing | Mock job execution or production testing | Inngest Dev Server (npx inngest-cli dev) | Provides real-time dashboard, event history, function invocation UI, and identical behavior to production without cloud setup. |

**Key insight:** Background job orchestration appears simple for single-step jobs, but production requirements (observability, partial replay, idempotency, rate limiting, dead letter handling) require substantial infrastructure. Inngest consolidates 5+ tools (queue, worker, scheduler, dashboard, retry manager) into a single SDK.

## Common Pitfalls

### Pitfall 1: Not Running Dev Server During Local Development
**What goes wrong:** Functions don't execute when events are sent; inngest.send() succeeds but jobs never run
**Why it happens:** Inngest requires either Dev Server (local) or Cloud connection (production) to discover and invoke functions. Without it, events are sent to nowhere.
**How to avoid:** Always run `npx inngest-cli@latest dev` in a separate terminal during development. Verify dashboard at http://localhost:8288 shows your functions.
**Warning signs:**
- inngest.send() returns success but no logs appear
- Dashboard shows "No functions registered"
- Events appear in dashboard but show "No matching functions"

### Pitfall 2: Database Transaction Conflicts with Step Retries
**What goes wrong:** step.run() retries a database operation that was already committed, causing duplicate entries or unique constraint violations
**Why it happens:** Inngest replays the entire function from the last successful step. If step 1 updates DB and commits, then step 2 fails, the retry re-enters the function and sees step 1 as "already succeeded" (memoized), but if you use database transactions that span multiple steps, the transaction state is lost.
**How to avoid:**
- Use step.run() for each individual database operation (each step gets its own implicit transaction)
- Make operations idempotent (upsert instead of insert, check-then-update patterns)
- Don't use explicit BEGIN/COMMIT transactions across multiple steps
**Warning signs:**
- Unique constraint violations on retry
- Duplicate rows with slightly different timestamps
- Error logs showing "transaction already closed"

### Pitfall 3: Forgetting INNGEST_SIGNING_KEY in Production
**What goes wrong:** Inngest Cloud cannot authenticate with your /api/inngest endpoint; functions never execute in production despite working locally
**Why it happens:** Dev Server doesn't require signing key, but production Cloud requires INNGEST_SIGNING_KEY environment variable for secure communication
**How to avoid:**
- Install Vercel integration (automatically sets INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY)
- Alternatively, copy signing key from Inngest dashboard → Settings → Signing Keys
- Add to Vercel environment variables or .env.production
- Verify after deployment by checking Inngest dashboard → Apps → [your-app] → Status (should show "Connected")
**Warning signs:**
- Functions work in dev but not production
- Inngest dashboard shows "App not connected" or "Last seen: never"
- 401 Unauthorized errors in Vercel logs for /api/inngest requests

### Pitfall 4: Not Understanding Function-Level vs Step-Level Retries
**What goes wrong:** Expecting 3 total retries but getting 15+ attempts across multiple steps; bills/logs explode
**Why it happens:** `retries: 3` applies to EACH step independently, not the function as a whole. Function with 5 steps and `retries: 3` can attempt up to 20 executions (5 steps × 4 attempts each).
**How to avoid:**
- Design functions with minimal steps (ideally 1-3)
- Use NonRetriableError for validation errors that shouldn't retry
- Monitor step retry counts in dashboard (Inngest shows per-step attempt count)
- For this phase's test function: use 1-2 steps max to meet "3 retries" criteria
**Warning signs:**
- Function shows "succeeded" but Inngest logs show 10+ total attempts
- Costs higher than expected
- Step retry counters differ across steps (step 1: 1 attempt, step 2: 4 attempts)

### Pitfall 5: JSON Serialization Errors with Non-Primitive Return Values
**What goes wrong:** step.run() throws "Cannot serialize return value" or silently converts Dates to strings, breaking downstream logic
**Why it happens:** Inngest serializes step results as JSON for memoization. Date objects become ISO strings, custom class instances lose methods, BigInt causes serialization errors.
**How to avoid:**
- Return plain objects with primitives (string, number, boolean, null)
- Convert Dates to ISO strings explicitly: `date.toISOString()`
- Return database records as plain objects (Drizzle returns plain objects by default, but be cautious with custom formatters)
- Use TypeScript to enforce serializable return types (avoid returning class instances)
**Warning signs:**
- Errors mentioning "toJSON" or "serialization"
- Date comparisons fail after step replay (date becomes string)
- Loss of class methods on returned objects

## Code Examples

Verified patterns from official sources:

### Complete Minimal Setup (Test Function)
```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
// src/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "poker-ai-review" });

// src/inngest/functions.ts
import { inngest } from "./client";

export const testFunction = inngest.createFunction(
  { id: "test-function", retries: 3 },
  { event: "test/hello" },
  async ({ event, step }) => {
    const result = await step.run("log-message", async () => {
      console.log("Test function executed:", event.data);
      return { processed: true, timestamp: new Date().toISOString() };
    });
    return result;
  },
);

// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { testFunction } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [testFunction],
});

// Trigger from upload API (src/app/api/upload/route.ts)
await inngest.send({
  name: "test/hello",
  data: { message: "Upload completed", analysisId },
});
```

### Type-Safe Event Schema with Zod (Optional Enhancement)
```typescript
// Source: https://www.inngest.com/docs/typescript
// src/inngest/types.ts
import { z } from "zod";

// Define event payload schemas
export const uploadCompletedSchema = z.object({
  analysisId: z.string().uuid(),
  userId: z.string(),
  imageUrl: z.string().url(),
});

// TypeScript types derived from Zod schemas
export type UploadCompletedEvent = z.infer<typeof uploadCompletedSchema>;

export type Events = {
  "analysis/upload.completed": {
    data: UploadCompletedEvent;
  };
};

// src/inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./types";

export const inngest = new Inngest({
  id: "poker-ai-review",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

### Status Update with Idempotent Step Pattern
```typescript
// Source: https://medium.com/@uzairahmedwyne/building-a-scalable-rag-system-with-inngest-drizzle-orm-and-postgresql-d6b67ec0d1f3
// src/inngest/functions.ts
import { inngest } from "./client";
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const processAnalysis = inngest.createFunction(
  { id: "process-analysis", retries: 3 },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    // Step 1: Update analysis status to "processing"
    await step.run("update-status-processing", async () => {
      await db
        .update(analysis)
        .set({
          status: "processing",
          updatedAt: new Date(), // Explicit timestamp update
        })
        .where(eq(analysis.id, event.data.analysisId));

      // Return plain object (JSON-serializable)
      return { statusUpdated: true };
    });

    // Future step: AI analysis will go here (Phase 4)
    // await step.run("analyze-image", async () => { ... });

    return {
      success: true,
      analysisId: event.data.analysisId,
    };
  },
);
```

### Error Handling with NonRetriableError
```typescript
// Source: https://www.inngest.com/docs/guides/error-handling
import { inngest } from "./client";
import { NonRetriableError } from "inngest";

export const processAnalysis = inngest.createFunction(
  { id: "process-analysis", retries: 3 },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    // Validate event data - don't retry on validation failure
    if (!event.data.analysisId || !event.data.imageUrl) {
      throw new NonRetriableError(
        "Invalid event data: analysisId and imageUrl required"
      );
    }

    await step.run("update-status", async () => {
      const result = await db
        .update(analysis)
        .set({ status: "processing" })
        .where(eq(analysis.id, event.data.analysisId))
        .returning();

      // If analysis not found, don't retry (data error, not transient)
      if (result.length === 0) {
        throw new NonRetriableError(
          `Analysis ${event.data.analysisId} not found in database`
        );
      }

      return { updated: true };
    });

    return { success: true };
  },
);
```

### Local Dev Server Testing Flow
```bash
# Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
# Terminal 1: Start Next.js dev server
pnpm dev

# Terminal 2: Start Inngest Dev Server
npx inngest-cli@latest dev

# Visit http://localhost:8288 to see dashboard
# Functions auto-discovered from http://localhost:3000/api/inngest

# Test event triggering:
# 1. Visit http://localhost:8288
# 2. Click "Functions" → your function → "Invoke"
# 3. Provide test JSON payload: {"analysisId": "test-123", "userId": "user-1", "imageUrl": "https://example.com/image.jpg"}
# 4. Click "Invoke function"
# 5. View execution logs, step results, retry attempts in real-time
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual queue setup (BullMQ + Redis) | Inngest SDK with built-in orchestration | 2023-2024 | No Redis infrastructure required; Inngest Cloud handles queue, scheduling, retries. Reduces setup from hours to minutes. |
| Function-level retry only | Step-level retry with memoization | Inngest SDK 2.x → 3.x (2024) | Failed steps don't restart entire function. Improves efficiency and enables complex multi-step workflows. |
| Manual event type definitions | Standard Schema interface support (Zod 4, Valibot) | Inngest SDK 3.42.0+ (Sept 2025) | Runtime validation + compile-time type safety. Validates event payloads automatically before function execution. |
| Separate dev/staging/prod Inngest accounts | Automatic branch environments per Vercel preview | Inngest Vercel integration 2.0 (2025) | Every PR gets isolated Inngest environment. No manual environment management or credential rotation. |
| Manual signing key setup | Vercel Marketplace integration auto-configures keys | Inngest joined Vercel Marketplace (2024) | INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY set automatically. Removes authentication configuration errors. |

**Deprecated/outdated:**
- **inngest@2.x SDK:** Use inngest@3.52.0 or later. SDK 3.x introduced step-level retries, improved TypeScript inference, and Standard Schema support.
- **Manual serve() configuration with signing key parameter:** Use environment variables (INNGEST_SIGNING_KEY) instead. Hardcoding keys in serve() config is insecure and prevents environment-specific keys.
- **inngest.createScheduledFunction():** Renamed to inngest.createFunction() with cron config in SDK 3.x. Old API still works but triggers deprecation warnings.

## Open Questions

1. **Should we implement event validation with Zod now or defer to Phase 4?**
   - What we know: Inngest supports Standard Schema (Zod 4.x compatible), project already has Zod installed
   - What's unclear: Whether validation overhead is necessary for test function with simple payload structure
   - Recommendation: Implement basic TypeScript types only for Phase 3 (minimal setup). Add Zod validation in Phase 4 when AI analysis event payloads become more complex and external data validation is critical.

2. **Should test function include actual database status update or just log success?**
   - What we know: Success criteria requires "analysis status changes from pending to processing when job starts"
   - What's unclear: Whether "test function" means minimal placeholder or realistic status update
   - Recommendation: Implement real database status update in test function. This validates the full integration (Inngest → Drizzle → PostgreSQL) and ensures Phase 4 can build directly on working pattern without refactoring.

3. **Do we need failure handler or step.onFailure() for Phase 3?**
   - What we know: Inngest supports failure handlers for cleanup/notifications after exhausting retries
   - What's unclear: What should happen when test function fails all 3 retries (analysis stuck in "pending"?)
   - Recommendation: Defer to Phase 6 (Error Handling). For Phase 3, let failed jobs show as "Failed" in Inngest dashboard. Phase 6 will implement comprehensive error handling (refund credits, mark analysis as "failed", notify user).

## Sources

### Primary (HIGH confidence)
- [Inngest Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start) - Installation, client setup, serve handler pattern
- [Inngest TypeScript Documentation](https://www.inngest.com/docs/typescript) - Type-safe event schemas, EventSchemas API
- [Inngest Retries Reference](https://www.inngest.com/docs/features/inngest-functions/error-retries/retries) - Retry configuration, default behavior, exponential backoff
- [Inngest step.run() API Reference](https://www.inngest.com/docs/reference/functions/step-run) - Step parameters, memoization, serialization
- [Inngest Vercel Deployment Guide](https://www.inngest.com/docs/deploy/vercel) - Signing key setup, Vercel integration, deployment protection
- [Inngest Dev Server Documentation](https://www.inngest.com/docs/dev-server) - Local development, architecture differences vs production

### Secondary (MEDIUM confidence)
- [Building a Scalable RAG System with Inngest, Drizzle ORM, and PostgreSQL](https://medium.com/@uzairahmedwyne/building-a-scalable-rag-system-with-inngest-drizzle-orm-and-postgresql-d6b67ec0d1f3) - Real-world integration pattern with Drizzle + Inngest
- [Inngest Background Jobs Guide](https://www.inngest.com/docs/guides/background-jobs) - Fan-out pattern, event triggering
- [Inngest Error Handling Guide](https://www.inngest.com/docs/guides/error-handling) - NonRetriableError, RetryAfterError, idempotency patterns
- [inngest npm package](https://www.npmjs.com/package/inngest) - Version 3.52.0 (latest as of 2026-02-17)

### Tertiary (LOW confidence)
- [Inngest Status Dashboard](https://status.inngest.com) - 99.67% uptime Nov 2025 - Feb 2026 (historical reliability data)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation verified, npm registry confirmed version 3.52.0, extensive Next.js integration examples
- Architecture: HIGH - Official quick start guide, TypeScript reference docs, verified code examples with source attribution
- Pitfalls: MEDIUM-HIGH - Based on official error handling docs, Medium article case study, and common serverless patterns (database transaction pitfalls inferred from general distributed systems knowledge, not Inngest-specific docs)

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days - Inngest is stable platform, but SDK versions update monthly)

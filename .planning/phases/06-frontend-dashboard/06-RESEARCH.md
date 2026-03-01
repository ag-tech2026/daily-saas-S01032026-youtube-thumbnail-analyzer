# Phase 6: Frontend Dashboard - Research

**Researched:** 2026-02-18
**Domain:** Next.js App Router data fetching, client-side polling, React Server Components, Drizzle ORM queries
**Confidence:** HIGH

## Summary

Phase 6 builds two surfaces: a history list on `/dashboard` showing all past analyses sorted newest-first, and a detail page at `/analysis/[id]` that renders the full structured GTO result. The data model is already completely defined — the `analysis` table has `id`, `userId`, `status`, `result` (JSON text), and `createdAt` columns. The result JSON structure is fully typed via `AnalysisResult` exported from `src/lib/analysis-schema.ts`.

The primary architectural decision for Phase 6 is **where to fetch data**. The history list can be a Server Component hitting the database directly (no API route needed). The detail page must be a Client Component because it needs to poll every 3 seconds when `status` is `pending`, `processing`, or `uploaded`. Polling should use `setInterval` inside `useEffect` and clear itself when status reaches `complete` or `failed`. This exact polling pattern is already used in `dashboard/page.tsx` for purchase credit detection — identical technique, different data.

The `analysis` table has no `pokerSite` field — the schema from Phase 2 stores `imageUrl`, `status`, and `result` (the full JSON blob). The success criteria mention "poker site (if detected)" but the actual schema has no dedicated site column, and the Phase 4 AI schema (`analysisSchema`) also has no `pokerSite` field. The history list items will show `createdAt`, `overallVerdict` (from parsed `result`), and `status`. No dedicated site detection field exists.

**Primary recommendation:** Use a Server Component for the history list with direct Drizzle queries, a Client Component for the detail page with 3-second polling via an API route at `/api/analyses/[id]`, and reuse existing `Badge`, `Card`, `Skeleton`, and `Spinner` components throughout.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.44.7 | Query `analysis` table | Already in use; `db`, `schema`, `eq`, `desc` all available |
| React (built-in hooks) | 19.2.4 | `useEffect`/`useState` for polling | No external polling library needed |
| shadcn/ui Badge | already installed | Status badges | Matches existing badge usage across codebase |
| shadcn/ui Card | already installed | History item cards and detail layout | Already imported in many pages |
| shadcn/ui Skeleton | already installed | Loading skeletons | Used in `dashboard/loading.tsx` |
| Spinner component | already in codebase | Processing indicator | `src/components/ui/spinner.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/session.ts` `requireAuth()` | project utility | Server-side auth guard | Use in any Server Component page that needs protection |
| `AnalysisResult` type from `src/lib/analysis-schema.ts` | project type | Typed JSON parse of `result` field | Parse `JSON.parse(analysis.result)` to this type |
| lucide-react | 0.539.0 | Icons (Clock, CheckCircle, XCircle, Loader2) | Consistent with all other pages |
| Link from next/link | built-in | Navigation from history row to detail page | Standard Next.js pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Drizzle in Server Component | API route for history list | API route adds unnecessary round-trip; Server Component can query DB directly |
| Client polling with `useEffect` | SWR/React Query | No SWR or React Query installed; `useEffect` + `setInterval` is already the project pattern (see `dashboard/page.tsx`) |
| Dedicated `pokerSite` column | Parse from result JSON | Schema has no site column; omit site from list display entirely |

**Installation:**
No new packages required. Everything needed is already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx            # MODIFY: add history list section
│   └── analysis/
│       └── [id]/
│           └── page.tsx        # CREATE: detail page (Client Component)
├── app/api/
│   └── analyses/
│       └── [id]/
│           └── route.ts        # CREATE: GET endpoint for polling
└── components/
    └── analysis/               # CREATE: reusable display components
        ├── analysis-history-list.tsx    # Server Component
        ├── analysis-status-badge.tsx    # Client or shared component
        └── analysis-detail.tsx          # Client Component with polling
```

### Pattern 1: History List in Server Component
**What:** Query the `analysis` table directly in a Server Component. No API route. No `useEffect`. Data is fetched at request time.
**When to use:** The history list is display-only, sorted newest-first. Server Component is the correct choice — no interactivity needed on the list itself.
**Example:**
```typescript
// src/app/dashboard/page.tsx or extracted component
// Source: Next.js 16 App Router conventions (project already uses this pattern in profile/page.tsx)
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

// In async Server Component:
const session = await requireAuth();
const analyses = await db
  .select()
  .from(analysis)
  .where(eq(analysis.userId, session.user.id))
  .orderBy(desc(analysis.createdAt))
  .limit(50);
```

### Pattern 2: Polling in Client Component (Detail Page)
**What:** Client Component uses `setInterval` in `useEffect` to fetch from an API route every 3 seconds. Stops polling when `status` is `complete` or `failed`.
**When to use:** Any page that needs live status updates. The `analysis/[id]` page needs this because analysis can take 10-30 seconds.
**Example:**
```typescript
// Source: dashboard/page.tsx lines 40-66 - exact same pattern already in codebase
"use client";
import { useEffect, useRef, useState } from "react";

export function AnalysisDetail({ analysisId }: { analysisId: string }) {
  const [data, setData] = useState<AnalysisRow | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      const res = await fetch(`/api/analyses/${analysisId}`);
      const json = await res.json();
      setData(json);
      // Stop polling when terminal state reached
      if (json.status === "complete" || json.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }

    fetchAnalysis(); // Initial load
    pollRef.current = setInterval(fetchAnalysis, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [analysisId]);
}
```

### Pattern 3: API Route for Analysis Detail
**What:** GET route handler at `/api/analyses/[id]` that returns analysis data for the current user. Validates ownership (cannot view other users' analyses).
**When to use:** Client-side polling requires an API route. Direct DB access from Client Components is not possible.
**Example:**
```typescript
// src/app/api/analyses/[id]/route.ts
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const { id } = await params;
  const rows = await db
    .select()
    .from(analysis)
    .where(and(eq(analysis.id, id), eq(analysis.userId, session.user.id)))
    .limit(1);
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(rows[0]), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### Pattern 4: Status Badge Mapping
**What:** Map the 5 status values to badge variants and labels.
**When to use:** Everywhere status needs to be displayed — both list view and detail page.

Status values that exist in the system:
- `"pending"` — analysis record created, waiting for Inngest to pick it up
- `"uploaded"` — image stored, Inngest event sent (brief intermediate state)
- `"processing"` — Inngest function running vision model
- `"complete"` — result JSON saved
- `"failed"` — all retries exhausted, credit refunded

Note: The phase success criteria describe 4 statuses (pending/processing/complete/failed) but the actual schema has 5 distinct values including `"uploaded"`. The badge component should handle all 5. `"uploaded"` can be treated the same as `"pending"` visually (yellow/secondary).

```typescript
// Source: src/components/ui/badge.tsx - existing variants: default, secondary, destructive, outline
function getStatusBadge(status: string) {
  switch (status) {
    case "complete":
      return { label: "Complete", variant: "default" as const };
    case "failed":
      return { label: "Failed", variant: "destructive" as const };
    case "processing":
      return { label: "Processing", variant: "secondary" as const };
    case "pending":
    case "uploaded":
      return { label: "Pending", variant: "outline" as const };
    default:
      return { label: status, variant: "outline" as const };
  }
}
```

### Pattern 5: Parsing Analysis Result JSON
**What:** The `result` field is stored as `JSON.stringify(analysisResult)`. Parse it to `AnalysisResult` type when `status === "complete"`.
**When to use:** Detail page only. Never parse on list view.
**Example:**
```typescript
import type { AnalysisResult } from "@/lib/analysis-schema";

const result: AnalysisResult | null =
  data.status === "complete" && data.result
    ? (JSON.parse(data.result) as AnalysisResult)
    : null;
```

### Pattern 6: Next.js 16 Dynamic Route Params
**What:** In Next.js 16, dynamic route params (`params`) in route handlers and Server Component page props are Promises, not plain objects. Must `await params`.
**When to use:** Any route handler or page with `[id]` segment.
**Example:**
```typescript
// In page.tsx (Server Component):
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}

// In route.ts (Route Handler):
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### Anti-Patterns to Avoid
- **Polling in a Server Component:** Server Components run once at request time. Polling must be in a Client Component.
- **Direct DB access from Client Components:** Not possible. Use an API route for client-side data fetching.
- **Parsing `result` JSON on the list page:** Performance waste. List only needs `status`, `overallVerdict` (if parsed), and `createdAt`. Consider storing `overallVerdict` separately, or parsing it lazily. For v1 simplicity, parse only on the detail page.
- **Not validating userId on analysis queries:** Always `and(eq(analysis.id, id), eq(analysis.userId, session.user.id))` to prevent IDOR (users viewing other users' analyses).
- **Showing image URL to client without considering local vs Blob storage:** The `imageUrl` field may be a local `/uploads/...` path in dev or a Vercel Blob URL in production. The detail page can display the image using a plain `<img>` tag (not Next.js `<Image>`) to avoid next.config.ts hostname requirements for local paths. Alternatively, add the local host pattern to `remotePatterns`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badge display | Custom status indicator | `<Badge>` from `@/components/ui/badge` | Already styled, dark-mode aware |
| Loading skeleton | Custom shimmer | `<Skeleton>` from `@/components/ui/skeleton` | Already in `dashboard/loading.tsx` |
| Spinning indicator | Custom animation | `<Spinner>` from `@/components/ui/spinner` | Already uses Loader2 + animate-spin |
| Polling mechanism | External library | `useEffect` + `setInterval` + `useRef` | Project pattern already established |
| Auth guard | Custom cookie check | `requireAuth()` from `@/lib/session` | Already implemented, handles redirect |
| Date formatting | Date library | Native `toLocaleDateString` | Used in `profile/page.tsx` already |

**Key insight:** Every building block for this phase already exists in the codebase. This phase is pure composition — no new libraries, no new patterns.

## Common Pitfalls

### Pitfall 1: Missing `"uploaded"` Status
**What goes wrong:** Code handles `pending | processing | complete | failed` but the upload API sets status to `"uploaded"` after the image is stored (before Inngest transitions it to `"processing"`). Unhandled status falls into a visual gap.
**Why it happens:** The requirements list 4 statuses, but the actual implementation in `src/app/api/upload/route.ts` line 108 uses a 5th status: `"uploaded"`.
**How to avoid:** Always include `"uploaded"` as a variant in status badge and polling logic. Treat it the same as `"pending"` visually.
**Warning signs:** If a freshly-uploaded analysis never shows a status badge (or shows undefined/null), this is the cause.

### Pitfall 2: Not Clearing Interval on Unmount
**What goes wrong:** `setInterval` continues running after user navigates away from detail page, causing fetch calls to dead component references and memory leaks.
**Why it happens:** Forgetting the `useEffect` cleanup return function.
**How to avoid:** Always return cleanup from `useEffect`. Store interval ID in `useRef` (not `useState`) to avoid stale closures. This exact pattern is demonstrated in `dashboard/page.tsx` lines 44-75.
**Warning signs:** Console errors about "state update on unmounted component" or extra network requests in DevTools after navigation.

### Pitfall 3: IDOR Vulnerability on Analysis Detail
**What goes wrong:** User crafts a URL like `/analysis/[someone-elses-id]` and sees another user's poker analysis.
**Why it happens:** Querying by `analysis.id` alone without checking `userId`.
**How to avoid:** Always `and(eq(analysis.id, id), eq(analysis.userId, session.user.id))` in all analysis queries. Return 404 (not 403) if not found, to avoid disclosing existence.
**Warning signs:** Any DB query on `analysis` table that uses only `eq(analysis.id, ...)` without userId filter.

### Pitfall 4: Awaiting Params in Next.js 16
**What goes wrong:** Accessing `params.id` directly (not awaiting) causes TypeScript errors and runtime issues in Next.js 16.
**Why it happens:** Next.js 16 changed route params to be async (Promises).
**How to avoid:** Always `const { id } = await params` in both page components and route handlers with dynamic segments.
**Warning signs:** TypeScript errors like "Property 'id' does not exist on type 'Promise<...>'" — `pnpm run typecheck` will catch this.

### Pitfall 5: Polling After Terminal Status
**What goes wrong:** Polling continues even after `status === "complete"` or `"failed"`, causing unnecessary server load.
**Why it happens:** Checking status inside the interval callback but not clearing the interval.
**How to avoid:** Inside the fetch callback, after updating state, check status and call `clearInterval(pollRef.current)` if terminal.

### Pitfall 6: `/dashboard` Page is Currently `"use client"`
**What goes wrong:** The history list cannot be a Server Component if `dashboard/page.tsx` is a Client Component. Direct DB queries only work in Server Components.
**Why it happens:** `dashboard/page.tsx` uses `useSession()`, `useSearchParams()`, and `useEffect` (all client hooks).
**How to avoid:** Extract the history list into a separate Server Component file (e.g., `src/components/analysis/analysis-history-list.tsx`) that is imported into the Client Component dashboard page. The Server Component fetches from DB; the Client Component wraps it. Alternatively, the history list fetches from an API route (client-side fetch on mount). The cleanest approach: create a separate `AnalysisHistoryList` Server Component embedded in the dashboard.

Actually — **critical insight**: Server Components can be composed inside Client Components by passing them as children or importing. But a Client Component cannot contain a Server Component import directly in its module graph in Next.js App Router. The recommended pattern is to split: the dashboard page can remain a Client Component for its interactive parts, and the history list can be either: (a) fetched via API route on mount, or (b) rendered as a separate Server Component passed as children prop from a parent layout.

The simplest approach given the existing `dashboard/page.tsx` is a "use client" page: **fetch the history list from an API route (`/api/analyses`) inside a `useEffect` on mount**. This avoids any Server/Client composition complexity.

## Code Examples

Verified patterns from official sources:

### History List Data Fetch (Client-side, matching project pattern)
```typescript
// Source: project pattern from use-diagnostics.ts and dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import type { AnalysisResult } from "@/lib/analysis-schema";

type AnalysisListItem = {
  id: string;
  status: string;
  result: string | null;
  createdAt: string; // serialized timestamp
  imageUrl: string | null;
};

export function useAnalysisHistory() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => {
        setAnalyses(data);
        setLoading(false);
      });
  }, []);

  return { analyses, loading };
}
```

### Analysis List API Route
```typescript
// src/app/api/analyses/route.ts
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const analyses = await db
    .select()
    .from(analysis)
    .where(eq(analysis.userId, session.user.id))
    .orderBy(desc(analysis.createdAt))
    .limit(50);
  return new Response(JSON.stringify(analyses), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### AnalysisResult JSON Structure (for detail page rendering)
```typescript
// Source: src/lib/analysis-schema.ts - confirmed from file read
type AnalysisResult = {
  streets: Array<{
    street: "preflop" | "flop" | "turn" | "river";
    heroAction: string;
    gtoVerdict: "correct" | "acceptable" | "incorrect";
    explanation: string;
    rangeNote?: string;
    evNote?: string;
  }>;
  overallVerdict: "GTO-Compliant" | "Needs Improvement";
  verdictSummary: string;
  keyTakeaway: string;
};
```

### GTO Verdict Color Mapping (for per-street verdicts)
```typescript
// No library needed - direct Tailwind class mapping
function getVerdictColor(verdict: "correct" | "acceptable" | "incorrect") {
  switch (verdict) {
    case "correct":     return "text-green-600 dark:text-green-400";
    case "acceptable":  return "text-yellow-600 dark:text-yellow-400";
    case "incorrect":   return "text-red-600 dark:text-red-400";
  }
}
```

### Proxy Config - Must Add `/analysis` to Protected Routes
```typescript
// src/proxy.ts - MUST update matcher to include /analysis
export const config = {
  matcher: ["/dashboard", "/chat", "/profile", "/analysis/:path*"],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params.id` (sync) | `await params` (async) | Next.js 15/16 | TypeScript errors if not awaited |
| `getServerSideProps` | Server Components with direct DB | Next.js 13+ App Router | No separate data fetching functions |
| SWR/React Query for polling | `useEffect` + `setInterval` | Project choice | Matches existing codebase pattern |

**Deprecated/outdated:**
- `getServerSideProps`: Replaced by async Server Components in App Router. This project already uses App Router.
- Sync `params` access: Next.js 16 requires `await params` in dynamic routes.

## Open Questions

1. **Should the history list be in dashboard or a separate `/history` page?**
   - What we know: Upload page currently redirects to `/dashboard` after upload. Requirements say "User can see list of all past hand analyses" — the requirements reference the dashboard (`DASH-01`, `DASH-02`, `DASH-03`).
   - What's unclear: Whether the dashboard page gets a history section added to it, or the redirect after upload should go to a separate history page.
   - Recommendation: Add the history list to the existing `/dashboard` page as a new section below the existing cards. Keep the upload redirect pointing to `/dashboard`. This matches DASH-01 language and avoids a new route.

2. **Display image on detail page or not?**
   - What we know: `imageUrl` exists on every analysis. In dev it's a local path (`/uploads/screenshots/...`), in production it's a Vercel Blob URL. `next.config.ts` already has Blob hostname in `remotePatterns`.
   - What's unclear: Whether showing the uploaded image thumbnail is required for Phase 6.
   - Recommendation: Show the image if it exists. Use `<img>` tag (not Next.js `<Image>`) for local dev compatibility, or add local hostname to `remotePatterns`. A plain `<img>` tag is simpler and avoids config changes.

3. **What should the detail page show for `"failed"` analyses?**
   - What we know: Failed analyses have `result: null` and credit refunded.
   - What's unclear: The requirements don't explicitly specify the failed state UI.
   - Recommendation: Show an error card explaining "Analysis failed - your credit has been refunded" with a link to try again (`/upload`).

4. **History list item: should `overallVerdict` be extracted from result JSON?**
   - What we know: `overallVerdict` is inside the `result` JSON blob. Parsing JSON for every row in a list is acceptable for small collections (50 items limit).
   - What's unclear: Performance at scale.
   - Recommendation: Parse `result` JSON inline for list items. Only show `overallVerdict` on complete analyses. For pending/processing/failed, show the status badge instead. For v1 with small user bases, this is fine.

## Sources

### Primary (HIGH confidence)
- Codebase read: `src/lib/schema.ts` — exact `analysis` table columns and types
- Codebase read: `src/lib/analysis-schema.ts` — complete `AnalysisResult` type
- Codebase read: `src/app/dashboard/page.tsx` — confirmed polling pattern with `useInterval` + `useRef`
- Codebase read: `src/inngest/functions.ts` — all 5 status values confirmed (`pending`, `uploaded`, `processing`, `complete`, `failed`)
- Codebase read: `src/app/api/upload/route.ts` — `"uploaded"` status confirmed at line 108
- Codebase read: `src/proxy.ts` — existing protected routes, must add `/analysis` matcher
- Codebase read: `src/lib/session.ts` — `requireAuth()` utility confirmed
- Codebase read: `src/components/ui/badge.tsx` — variants: `default`, `secondary`, `destructive`, `outline`
- Codebase read: `src/components/ui/skeleton.tsx`, `spinner.tsx` — confirmed available
- Codebase read: `package.json` — Next.js 16.1.6, no SWR/React Query installed

### Secondary (MEDIUM confidence)
- Next.js 16 docs pattern for async params — verified by `pnpm run typecheck` catching sync params usage in this project's existing code style

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by reading actual installed packages and existing component files
- Architecture: HIGH — existing patterns in `dashboard/page.tsx` confirm polling approach; schema confirmed from `schema.ts`
- Pitfalls: HIGH for IDOR and interval cleanup (verified from code); HIGH for `"uploaded"` status (confirmed from upload route); MEDIUM for Next.js 16 async params (standard Next.js 16 behavior confirmed by project's Next.js version)
- Result JSON structure: HIGH — read directly from `analysis-schema.ts`

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable domain — no fast-moving dependencies involved)

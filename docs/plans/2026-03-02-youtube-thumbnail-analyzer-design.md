# YouTube Thumbnail Analyzer — Design Doc

**Date:** 2026-03-02
**Status:** Approved
**Approach:** Option B — Domain Swap + Thumbnail-Specific UX

---

## Overview

Pivot the existing Poker AI Review codebase into a YouTube Thumbnail Analyzer SaaS. Users upload a thumbnail image and receive an AI-powered analysis with CTR-focused scores, strengths, improvements, and actionable tips.

All infrastructure (auth, database, background jobs, payments, file storage) is reused unchanged. Only the domain layer and UI presentation change.

---

## Architecture

### What stays identical

- BetterAuth (Google OAuth, sessions)
- Database schema (`user`, `session`, `analysis`, `webhookEvents` — no migrations)
- File storage abstraction (`lib/storage.ts`)
- Background job pipeline (Inngest: `analysis/upload.completed` → `processAnalysis`)
- Credit system (atomic deduction, Polar webhook, refund on failure)
- API routes (`/api/upload`, `/api/analyses`, `/api/analyses/[id]`, `/api/inngest`)
- Client-side polling on analysis detail page (3s interval, stops on terminal status)

### Full pipeline (unchanged)

**Analysis pipeline:**
```
POST /api/upload
  1. Authenticate session
  2. Atomic credit deduction (UPDATE user WHERE credits > 0)
  3. Store file → Vercel Blob / local
  4. Insert analysis row (status: "pending")
  5. Update analysis row (status: "uploaded", imageUrl set)
  6. inngest.send("analysis/upload.completed", { analysisId, userId, imageUrl })

Inngest background job (retries: 3, each step idempotent):
  step 1: UPDATE analysis SET status = "processing"
  step 2: generateObject(openrouter gpt-4o, analysisSchema, thumbnail image)
  step 3: UPDATE analysis SET result = JSON, status = "complete"
  on failure: refund credit + SET status = "failed"
```

**Payment pipeline:**
```
Polar checkout → onOrderPaid webhook → /api/auth/[...all]
  db.transaction():
    1. Check webhookEvents for idempotency (order ID)
    2. INSERT webhookEvents record
    3. UPDATE user SET credits = credits + 50
Dashboard polls every 3s until credit count changes (30s timeout)
```

### What changes

| Layer | Change |
|---|---|
| `src/domain/prompt.ts` | Full rewrite — YouTube thumbnail coach persona |
| `src/domain/schema.ts` | Full rewrite — 8-field thumbnail schema |
| `src/app/upload/page.tsx` | Copy + accepted types (add WebP) |
| `src/app/analysis/[id]/page.tsx` | Score card component, renamed field rendering |
| `src/components/analysis/score-card.tsx` | New file — score card component |
| `src/app/dashboard/page.tsx` | Copy changes only |
| `src/app/page.tsx` | Full copy rewrite |
| `src/components/landing/` | Copy rewrite |
| `src/components/site-header.tsx` | Product name update |
| `src/inngest/functions.ts` | Update string literals ("poker" → "thumbnail") |

---

## Domain Layer

### Schema (`src/domain/schema.ts`)

```ts
analysisSchema = z.object({
  thumbnail_info: z.object({
    title_text: z.string(),          // visible text extracted from thumbnail
    has_face: z.boolean(),
    face_count: z.number(),
    face_emotion: z.string(),        // "happy" | "shocked" | "serious" | "neutral" | ...
    dominant_colors: z.array(z.string()),  // e.g. ["red", "black", "white"]
    assumptions: z.array(z.string()),
  }),
  scores: z.object({
    overall: z.number().min(0).max(10),
    visual_contrast: z.number().min(0).max(10),
    text_legibility: z.number().min(0).max(10),
    emotional_hook: z.number().min(0).max(10),
    curiosity_gap: z.number().min(0).max(10),
  }),
  analysis: z.object({
    summary: z.string(),       // 2-4 sentence overall assessment
    main_takeaway: z.string(), // single most important improvement
  }),
  strengths: z.array(z.object({
    label: z.string(),
    explanation: z.string(),
  })).min(2),
  improvements: z.array(z.object({
    label: z.string(),
    issue: z.string(),
    recommendation: z.string(),
  })).min(2),
  action_items: z.array(z.string()),  // 3-5 specific things to try
  tags: z.array(z.string()),          // 2-4 kebab-case tags
  confidence_score: z.number().min(0).max(1),
})
```

### Prompt (`src/domain/prompt.ts`)

- **Persona:** YouTube thumbnail optimization expert focused on CTR prediction
- **Platform context:** Thumbnails viewed at ~120px wide on mobile, 210px on desktop — all feedback must account for small-size legibility
- **Scoring rubric:** Explicit 1–10 definitions per dimension (contrast, legibility, emotional hook, curiosity gap)
- **Voice:** Direct, specific, actionable — e.g. "Your text is too small, use 80px+ font at weight 800" not "Consider improving text size"
- **Output:** JSON only, no commentary outside schema

### `src/domain/index.ts`

```ts
export { prompt } from "./prompt";
export { analysisSchema, AnalysisResult } from "./schema";
export const CREDITS_PER_ANALYSIS = 1;  // unchanged
```

---

## UI

### Upload Page

- Heading: "Analyze Your Thumbnail"
- Subtext: "Upload a JPG, PNG or WebP · Recommended 1280×720 · Max 10MB"
- Drop zone label: "Drop your thumbnail here or click to browse"
- Accepted types: `image/jpeg, image/png, image/webp`
- Button: "Analyze Thumbnail"

### Analysis Page

**Score Card** (new component: `src/components/analysis/score-card.tsx`)

```
┌─────────────────────────────────────────────────┐
│  Overall CTR Score          8.2 / 10   ████████░ │
├─────────────────────────────────────────────────┤
│  Visual Contrast            9.0 / 10   █████████ │
│  Text Legibility            7.5 / 10   ███████░░ │
│  Emotional Hook             8.0 / 10   ████████░ │
│  Curiosity Gap              6.5 / 10   ██████░░░ │
└─────────────────────────────────────────────────┘
```

Color coding: green (8–10), yellow (5–7), red (0–4).

**Thumbnail info strip:** detected text, face count + emotion, dominant color swatches

**Analysis summary:** same `<p>` rendering as existing

**Strengths / Improvements:** two-column cards (mirrors existing good_plays / areas_to_improve rendering)

**Action Items:** numbered checklist (replaces improvement tips bullets)

**Tags + Confidence:** identical to current rendering

### Dashboard

- "Your Analyses" heading
- Status badges unchanged (pending / processing / complete / failed)
- Credits display unchanged

### Landing Page

- Hero: "Know if your thumbnail will get clicked — before you publish"
- How it works: Upload → AI analyzes → Get your score + fixes (3 steps)
- Pricing: 3 free analyses on signup · 50 analyses for $9

### Header

- Product name: "ThumbnailIQ" (placeholder — can be changed)

---

## Files Touched

10 files modified, 1 new file created. No database migrations required. No new dependencies required.

| File | Type |
|---|---|
| `src/domain/prompt.ts` | Full rewrite |
| `src/domain/schema.ts` | Full rewrite |
| `src/app/upload/page.tsx` | Copy + accepted types |
| `src/app/analysis/[id]/page.tsx` | Score card + renamed fields |
| `src/components/analysis/score-card.tsx` | New component |
| `src/app/dashboard/page.tsx` | Copy changes |
| `src/app/page.tsx` | Full rewrite |
| `src/components/landing/` | Copy rewrite |
| `src/components/site-header.tsx` | Product name |
| `src/inngest/functions.ts` | String literals |

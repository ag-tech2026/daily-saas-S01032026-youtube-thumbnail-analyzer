# YouTube Thumbnail Analyzer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pivot the Poker AI Review codebase into a YouTube Thumbnail Analyzer by swapping the domain layer and updating the UI to be thumbnail-specific.

**Architecture:** Keep all infrastructure unchanged (auth, DB, Inngest, Polar, storage). Rewrite `src/domain/` (schema + prompt), create a new `ScoreCard` component, rewrite the analysis page to render thumbnail fields, and update all copy/branding throughout.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Tailwind CSS 4, shadcn/ui, OpenRouter GPT-4o, Inngest, Polar, BetterAuth

---

## Notes

- No test runner is configured in this project — verification is via `pnpm run lint && pnpm run typecheck` after each task.
- All changes are in `src/`. No DB migrations needed. No new dependencies needed.
- The existing `src/app/analysis/[id]/page.tsx` imports from `@/lib/analysis-schema` which does not exist — this stale import gets fixed in Task 4.

---

### Task 1: Rewrite domain schema

**Files:**
- Modify: `src/domain/schema.ts`

**Step 1: Replace the full file contents**

```ts
import { z } from "zod";

export const analysisSchema = z.object({
  thumbnail_info: z.object({
    title_text: z.string().describe("Visible text extracted from the thumbnail, empty string if none"),
    has_face: z.boolean().describe("Whether a human face is visible"),
    face_count: z.number().int().describe("Number of faces detected (0 if none)"),
    face_emotion: z.string().describe("Dominant emotion: happy, shocked, serious, excited, neutral, or other"),
    dominant_colors: z.array(z.string()).describe("2-4 dominant colors (e.g. ['red', 'black', 'white'])"),
    assumptions: z.array(z.string()).describe("Assumptions made due to unclear or low-resolution image"),
  }),
  scores: z.object({
    overall: z.number().min(0).max(10).describe("Overall CTR potential score 0-10"),
    visual_contrast: z.number().min(0).max(10).describe("How well elements pop off the background 0-10"),
    text_legibility: z.number().min(0).max(10).describe("Text readability at small thumbnail size 0-10"),
    emotional_hook: z.number().min(0).max(10).describe("Strength of face/emotion or visual drama 0-10"),
    curiosity_gap: z.number().min(0).max(10).describe("How much the thumbnail makes viewers want to click 0-10"),
  }),
  analysis: z.object({
    summary: z.string().describe("2-4 sentence overall CTR assessment"),
    main_takeaway: z.string().describe("The single most important improvement to make"),
  }),
  strengths: z
    .array(
      z.object({
        label: z.string().describe("Short label for the strength"),
        explanation: z.string().describe("Why this element works well for CTR"),
      })
    )
    .min(2)
    .describe("What works well for CTR (minimum 2)"),
  improvements: z
    .array(
      z.object({
        label: z.string().describe("Short label for the issue"),
        issue: z.string().describe("What is wrong and why it hurts CTR"),
        recommendation: z.string().describe("Specific fix to apply"),
      })
    )
    .min(2)
    .describe("What to fix to improve CTR (minimum 2)"),
  action_items: z
    .array(z.string())
    .describe("3-5 specific, actionable changes to try in the next version"),
  tags: z
    .array(z.string())
    .describe(
      "2-4 kebab-case classification tags (e.g. 'low-contrast', 'strong-face', 'text-overload', 'curiosity-gap', 'color-pop', 'missing-face')"
    ),
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence 0-1 based on image clarity and resolution"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm run typecheck`
Expected: no errors related to `src/domain/schema.ts`

**Step 3: Commit**

```bash
git add src/domain/schema.ts
git commit -m "feat: rewrite domain schema for thumbnail analysis"
```

---

### Task 2: Rewrite domain prompt

**Files:**
- Modify: `src/domain/prompt.ts`

**Step 1: Replace the full file contents**

```ts
export const prompt = `You are a YouTube thumbnail optimization expert. Your job is to analyze a thumbnail image and predict whether it will get clicked, explaining exactly why.

STRICT RULES:
- Output JSON ONLY.
- Follow the provided JSON schema exactly.
- Do NOT add commentary outside JSON.
- Do NOT add or remove fields.
- Be specific and actionable — say "Use 80px+ font at weight 800" not "Improve text size".
- Platform context: thumbnails are viewed at ~120px wide on mobile and 210px on desktop. All feedback must account for this small display size.
- Avoid randomness: be consistent in scoring.

## SCORING RUBRICS

**visual_contrast (0–10):**
10 — Subject pops dramatically, extreme color contrast with background, instantly readable at 120px
8–9 — Strong contrast, subject clearly separated from background
5–7 — Adequate contrast but loses some detail at thumbnail size
3–4 — Subject partially blends into background, easy to overlook in a feed
0–2 — Low contrast, subject indistinguishable from background at small size

**text_legibility (0–10):**
10 — Large bold text, 2-4 words max, high contrast, fully readable at 120px width
8–9 — Text is readable at thumbnail size, good font weight
5–7 — Text is visible but requires effort to read at small size
3–4 — Text is present but too small or low contrast to read at thumbnail size
0–2 — Text is unreadable at thumbnail size or absent when it would help

**emotional_hook (0–10):**
10 — Highly expressive face or dramatic visual (shock, excitement, awe) that triggers instant emotional response
8–9 — Clear positive emotion or dramatic visual moment
5–7 — Face or emotion present but subtle or not compelling
3–4 — Neutral expression, minimal emotional engagement
0–2 — No face, no emotional cue, purely informational visual

**curiosity_gap (0–10):**
10 — Creates strong open loop — viewer must click to resolve tension or get answer
8–9 — Clearly implies a story or outcome the viewer wants to see
5–7 — Somewhat intriguing but the full story is unclear
3–4 — Little narrative tension, viewer has no strong reason to click
0–2 — Thumbnail tells the whole story, nothing left to discover

**overall (0–10):**
Weighted average of the above scores, with extra weight on curiosity_gap and visual_contrast as the primary CTR drivers.

## OUTPUT FIELDS

**thumbnail_info:**
- title_text: All text visible in the thumbnail, exactly as written. Empty string if none.
- has_face: true if any human face is visible, false otherwise
- face_count: Integer count of visible faces
- face_emotion: One word description of dominant emotion. Use "none" if no face.
- dominant_colors: 2-4 color names (e.g. ["red", "white", "black"])
- assumptions: List any assumptions you made due to image quality

**scores:** Apply the rubrics above precisely. Use one decimal place (e.g. 7.5, not 8).

**analysis:**
- summary: 2-4 sentences on overall CTR potential. Lead with the strongest and weakest elements.
- main_takeaway: The single change that would most increase CTR. Be specific.

**strengths:** At least 2. Focus on what is genuinely working for CTR. Be specific about why.

**improvements:** At least 2. Each needs:
- label: Short description of the problem
- issue: What exactly is wrong and how it reduces CTR (1-2 sentences)
- recommendation: Specific fix with concrete details (font size, color, crop, etc.)

**action_items:** 3-5 concrete, numbered-ready tips. Each starts with an action verb ("Add", "Increase", "Crop", "Replace", "Remove").

**tags:** 2-4 kebab-case tags that classify this thumbnail's key characteristics:
- low-contrast / high-contrast
- missing-face / strong-face / multiple-faces
- text-overload / minimal-text / no-text
- curiosity-gap / no-curiosity
- color-pop / muted-colors
- busy-background / clean-background
- strong-emotion / neutral-emotion

**confidence_score:** 0.9–1.0 for clear high-resolution thumbnail. 0.6–0.8 for lower quality. Below 0.6 if image is too small or blurry to assess reliably.

## VOICE
- Direct and specific — "Your text is unreadable at mobile size" not "Text could be improved"
- Use data-driven language — "This scores 4/10 for contrast because..."
- Be encouraging but honest — acknowledge what works before what doesn't
- Reference YouTube norms — "Top creators use 2-4 word text maximum"

## EXAMPLE OUTPUT
{
  "thumbnail_info": {
    "title_text": "I QUIT My Job",
    "has_face": true,
    "face_count": 1,
    "face_emotion": "shocked",
    "dominant_colors": ["yellow", "black", "white"],
    "assumptions": []
  },
  "scores": {
    "overall": 8.0,
    "visual_contrast": 9.0,
    "text_legibility": 8.5,
    "emotional_hook": 8.0,
    "curiosity_gap": 7.5
  },
  "analysis": {
    "summary": "Strong thumbnail with good contrast and a clear emotional hook. The yellow background makes the subject pop effectively. The curiosity gap is decent but could be stronger — the outcome is partially implied.",
    "main_takeaway": "Add a visual contrast element (arrow, circle, or red highlight) pointing to the subject to increase the curiosity gap score."
  },
  "strengths": [
    {
      "label": "High-contrast background",
      "explanation": "The bright yellow background creates instant visual separation from a typical dark feed, drawing the eye at 120px mobile size."
    },
    {
      "label": "Expressive face",
      "explanation": "Shocked expression triggers an emotional response and implies a story the viewer wants to see resolved."
    }
  ],
  "improvements": [
    {
      "label": "Text could be larger",
      "issue": "At 120px width, 'I QUIT My Job' is readable but not dominant. The text competes with the face for attention.",
      "recommendation": "Increase font size by 20-30%, use weight 900, and add a subtle drop shadow to separate it from the background."
    },
    {
      "label": "Missing visual tension element",
      "issue": "The thumbnail shows the reaction but no context for what was quit — reduces curiosity gap.",
      "recommendation": "Add a small office/computer icon or dollar sign in the corner to hint at the stakes without revealing the outcome."
    }
  ],
  "action_items": [
    "Increase text size by 25% and set font weight to 900",
    "Add a drop shadow to the text for separation from background",
    "Add a small contextual icon (briefcase, dollar sign) in bottom-right corner",
    "Crop face slightly closer to fill more vertical space"
  ],
  "tags": ["strong-face", "high-contrast", "curiosity-gap", "strong-emotion"],
  "confidence_score": 0.95
}`;
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm run typecheck`
Expected: no errors in `src/domain/`

**Step 3: Commit**

```bash
git add src/domain/prompt.ts
git commit -m "feat: rewrite domain prompt for YouTube thumbnail coach"
```

---

### Task 3: Update Inngest function strings

**Files:**
- Modify: `src/inngest/functions.ts`

**Step 1: Update the three poker-specific strings**

In `src/inngest/functions.ts`:

Change line 46 step ID:
```ts
// OLD:
const analysisResult = await step.run("analyze-with-vision", async () => {
// NEW: (no change needed — generic enough)
```

Change line 59 user-facing text message:
```ts
// OLD:
text: "Analyze the attached poker hand image. Extract all visible hand details and produce a structured GTO-based analysis according to the JSON schema below.",
// NEW:
text: "Analyze the attached YouTube thumbnail image. Extract all visible elements and produce a structured CTR-focused analysis according to the JSON schema below.",
```

Change lines 214-217 image alt text in the processing state (in `page.tsx`, not here — see Task 4).

**Step 2: Verify**

Run: `pnpm run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add src/inngest/functions.ts
git commit -m "feat: update inngest function prompt text for thumbnail analysis"
```

---

### Task 4: Create ScoreCard component

**Files:**
- Create: `src/components/analysis/score-card.tsx`

**Step 1: Create the directory and file**

```bash
mkdir -p src/components/analysis
```

**Step 2: Write the component**

```tsx
interface ScoreCardProps {
  scores: {
    overall: number;
    visual_contrast: number;
    text_legibility: number;
    emotional_hook: number;
    curiosity_gap: number;
  };
}

function scoreBarColor(value: number): string {
  if (value >= 8) return "bg-green-500";
  if (value >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreTextColor(value: number): string {
  if (value >= 8) return "text-green-600 dark:text-green-400";
  if (value >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function ScoreCard({ scores }: ScoreCardProps) {
  const subScores = [
    { label: "Visual Contrast", value: scores.visual_contrast },
    { label: "Text Legibility", value: scores.text_legibility },
    { label: "Emotional Hook", value: scores.emotional_hook },
    { label: "Curiosity Gap", value: scores.curiosity_gap },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Overall score header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overall CTR Score
        </span>
        <span className={`text-2xl font-bold tabular-nums ${scoreTextColor(scores.overall)}`}>
          {scores.overall.toFixed(1)}
          <span className="text-sm font-normal text-muted-foreground"> / 10</span>
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted">
        <div
          className={`h-full transition-all ${scoreBarColor(scores.overall)}`}
          style={{ width: `${(scores.overall / 10) * 100}%` }}
        />
      </div>

      {/* Sub-scores */}
      <div className="divide-y divide-border/50">
        {subScores.map((item) => (
          <div key={item.label} className="flex items-center gap-4 px-4 py-2.5">
            <span className="text-sm text-muted-foreground flex-1 min-w-0">{item.label}</span>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBarColor(item.value)}`}
                  style={{ width: `${(item.value / 10) * 100}%` }}
                />
              </div>
              <span
                className={`text-sm font-semibold tabular-nums w-8 text-right ${scoreTextColor(item.value)}`}
              >
                {item.value.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Verify**

Run: `pnpm run typecheck`
Expected: no errors in new file

**Step 4: Commit**

```bash
git add src/components/analysis/score-card.tsx
git commit -m "feat: add ScoreCard component for thumbnail CTR scores"
```

---

### Task 5: Rewrite analysis detail page

**Files:**
- Modify: `src/app/analysis/[id]/page.tsx`

**Step 1: Replace full file contents**

This replaces the entire file. The key structural changes:
- Fix stale import (`@/lib/analysis-schema` → `@/domain`)
- Add `ScoreCard` import
- Replace `AnalysisResult` field references throughout
- Remove Board + Action Summary sections (poker-only)
- Add Thumbnail Info strip, Score Card, Strengths, Improvements, Action Items

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ScoreCard } from "@/components/analysis/score-card";
import type { AnalysisResult } from "@/domain";

type AnalysisData = {
  id: string;
  status: string;
  result: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function getStatusBadge(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "complete":
      return { label: "Complete", variant: "default" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    case "processing":
      return { label: "Processing", variant: "secondary" };
    case "pending":
    case "uploaded":
      return { label: "Pending", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (res.status === 404) {
          setError("Analysis not found");
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }
        const json = await res.json();
        setData(json);
        setLoading(false);
        if (json.status === "complete" || json.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setLoading(false);
      }
    }

    fetchAnalysis();
    pollRef.current = setInterval(fetchAnalysis, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Analysis not found</h1>
            <p className="text-muted-foreground mb-6">
              This analysis does not exist or you do not have access to it.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = getStatusBadge(data.status);
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Pending / uploaded / processing state
  if (
    data.status === "pending" ||
    data.status === "uploaded" ||
    data.status === "processing"
  ) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-base text-muted-foreground">{formattedDate}</span>
            </div>

            <div className="flex flex-col items-center py-10 gap-4">
              <Spinner size="lg" />
              <p className="text-lg font-medium text-foreground">
                {data.status === "processing"
                  ? "Analyzing your thumbnail..."
                  : "Waiting to start..."}
              </p>
              <p className="text-base text-muted-foreground">
                This usually takes about 15-30 seconds. The page will update
                automatically.
              </p>
            </div>

            {data.imageUrl && (
              <div className="mt-6 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">
                  Uploaded Thumbnail
                </p>
                <img
                  src={data.imageUrl}
                  alt="Uploaded thumbnail"
                  className="max-w-sm rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (data.status === "failed") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <CardTitle className="text-red-600 dark:text-red-400">
                Analysis Failed
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              We could not analyze this thumbnail. Your credit has been refunded.
            </p>
            <Button asChild>
              <Link href="/upload">Try Another Thumbnail</Link>
            </Button>

            {data.imageUrl && (
              <div className="mt-8 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">
                  Uploaded Thumbnail
                </p>
                <img
                  src={data.imageUrl}
                  alt="Uploaded thumbnail"
                  className="max-w-sm rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state — parse and render full result
  const analysisResult = JSON.parse(data.result ?? "{}") as AnalysisResult;
  const { thumbnail_info, scores, analysis, strengths, improvements, action_items, tags, confidence_score } =
    analysisResult;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header row — tags + date + confidence */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          <span>{formattedDate}</span>
          <span className="font-medium text-foreground">
            {Math.round(confidence_score * 100)}% confidence
          </span>
        </div>
      </div>

      {/* Two-column layout: analysis left, sticky thumbnail right */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* Left column */}
        <div className="flex-1 min-w-0">

          {/* Score Card */}
          <div className="mb-4">
            <ScoreCard scores={scores} />
          </div>

          {/* Thumbnail Info strip */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"🖼️ Thumbnail Details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {thumbnail_info.title_text && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Detected Text
                    </p>
                    <p className="text-base font-medium">
                      &ldquo;{thumbnail_info.title_text}&rdquo;
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Faces
                  </p>
                  <p className="text-base font-medium">
                    {thumbnail_info.face_count === 0
                      ? "None"
                      : `${thumbnail_info.face_count} (${thumbnail_info.face_emotion})`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Colors
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {thumbnail_info.dominant_colors.map((color) => (
                      <span
                        key={color}
                        className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {thumbnail_info.assumptions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Assumptions
                  </p>
                  <ul className="space-y-1">
                    {thumbnail_info.assumptions.map((assumption, i) => (
                      <li
                        key={i}
                        className="text-base italic text-muted-foreground"
                      >
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"📊 Analysis"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-foreground leading-relaxed">
                {analysis.summary}
              </p>
              <div className="flex gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                    {"🔥 Bottom Line"}
                  </p>
                  <p className="text-base text-foreground leading-relaxed">
                    {analysis.main_takeaway}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          {strengths.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"✅ Strengths"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {strengths.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"❌ What to Fix"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {improvements.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">
                      {"❌ "}{item.label}
                    </p>
                    <p className="text-base text-foreground leading-relaxed mb-2">
                      {item.issue}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      <span className="font-medium">Fix: </span>
                      {item.recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {action_items.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"💡 Action Items"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside">
                  {action_items.map((item, i) => (
                    <li key={i} className="text-base text-foreground leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Thumbnail — mobile only */}
          {data.imageUrl && (
            <div className="lg:hidden">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{"🖼️ Thumbnail"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={data.imageUrl}
                    alt="Uploaded thumbnail"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right column — sticky thumbnail (desktop only) */}
        {data.imageUrl && (
          <div className="hidden lg:block lg:w-[400px] shrink-0">
            <div className="sticky top-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{"🖼️ Thumbnail"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={data.imageUrl}
                    alt="Uploaded thumbnail"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `pnpm run lint && pnpm run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/analysis/[id]/page.tsx
git commit -m "feat: rewrite analysis page for thumbnail-specific fields and score card"
```

---

### Task 6: Update file upload component and upload page

**Files:**
- Modify: `src/components/upload/file-upload.tsx`
- Modify: `src/app/upload/page.tsx`

**Step 1: Update `file-upload.tsx` — accept WebP and update copy**

Make these targeted edits:

Change the accept object in `useDropzone` config (around line 91–94):
```ts
// OLD:
accept: {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
},
// NEW:
accept: {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
},
```

Change the error message for invalid file type (around line 38):
```ts
// OLD:
setError("Only PNG and JPG images are allowed");
// NEW:
setError("Only PNG, JPG, and WebP images are allowed");
```

Change the drop zone primary text (around line 120–122):
```ts
// OLD:
"Drag & drop your poker screenshot here"
// NEW:
"Drag & drop your thumbnail here"
```

Change the file type hint text (around line 127):
```ts
// OLD:
<p className="text-xs text-muted-foreground">PNG or JPG, max 10MB</p>
// NEW:
<p className="text-xs text-muted-foreground">PNG, JPG or WebP · Recommended 1280×720 · Max 10MB</p>
```

**Step 2: Update `upload/page.tsx` — update copy**

Change heading (around line 50):
```ts
// OLD:
<h1 className="text-3xl font-bold mb-2">Upload Poker Screenshot</h1>
// NEW:
<h1 className="text-3xl font-bold mb-2">Analyze Your Thumbnail</h1>
```

Change subtext (around line 51–54):
```ts
// OLD:
<p className="text-muted-foreground mb-4">
  Upload a screenshot from your poker game and get instant GTO
  analysis
</p>
// NEW:
<p className="text-muted-foreground mb-4">
  Upload your YouTube thumbnail and get instant AI-powered CTR
  analysis
</p>
```

Change the unauthenticated state message (around line 38):
```ts
// OLD:
You need to sign in to upload poker screenshots
// NEW:
You need to sign in to analyze thumbnails
```

Change the toast message in `handleUploadComplete` (around line 16):
```ts
// OLD:
toast.success("Screenshot uploaded! Analysis will begin shortly.");
// NEW:
toast.success("Thumbnail uploaded! Analysis will begin shortly.");
```

Also update the API route `src/app/api/upload/route.ts` to accept WebP (around line 66–68):
```ts
// OLD:
const allowedTypes = ["image/jpeg", "image/png"];
if (!allowedTypes.includes(file.type)) {
  return new Response(
    JSON.stringify({ error: "Only PNG and JPG images are allowed" }),
// NEW:
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
if (!allowedTypes.includes(file.type)) {
  return new Response(
    JSON.stringify({ error: "Only PNG, JPG, and WebP images are allowed" }),
```

**Step 3: Verify**

Run: `pnpm run lint && pnpm run typecheck`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/upload/file-upload.tsx src/app/upload/page.tsx src/app/api/upload/route.ts
git commit -m "feat: update upload page and file component for thumbnail (add WebP, update copy)"
```

---

### Task 7: Update dashboard copy

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Make targeted copy changes**

Change the "Analyze Hand" card heading (around line 174):
```ts
// OLD:
<h2 className="text-xl font-semibold">Analyze Hand</h2>
// NEW:
<h2 className="text-xl font-semibold">Analyze Thumbnail</h2>
```

Change the "Analyze Hand" card description (around line 176):
```ts
// OLD:
Upload a poker screenshot for instant GTO analysis
// NEW:
Upload a YouTube thumbnail for instant CTR analysis
```

Change the "Analyze Hand" button (around line 179–181):
```ts
// OLD:
<Link href="/upload">Upload Screenshot</Link>
// NEW:
<Link href="/upload">Upload Thumbnail</Link>
```

Change the empty state message (around line 238–240):
```ts
// OLD:
No analyses yet. Upload a poker screenshot to get started!
// NEW:
No analyses yet. Upload a thumbnail to get started!
```

Change the empty state button (around line 241–243):
```ts
// OLD:
<Link href="/upload">Upload Screenshot</Link>
// NEW:
<Link href="/upload">Upload Thumbnail</Link>
```

Change the `getOverallVerdict` function — it reads `analysis.main_takeaway` which is the same field name in both schemas, so no change needed there.

**Step 2: Verify**

Run: `pnpm run lint && pnpm run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: update dashboard copy for thumbnail analyzer"
```

---

### Task 8: Update site header

**Files:**
- Modify: `src/components/site-header.tsx`

**Step 1: Make targeted changes**

Change the nav links array (around line 10–14):
```ts
// OLD:
const NAV_LINKS = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "Analyze Hand", href: "/upload" },
  { label: "Profile",      href: "/profile" },
] as const;
// NEW:
const NAV_LINKS = [
  { label: "Dashboard",         href: "/dashboard" },
  { label: "Analyze Thumbnail", href: "/upload" },
  { label: "Profile",           href: "/profile" },
] as const;
```

Change the logo icon (around line 44–46):
```tsx
// OLD:
<div ... >
  ♠
</div>
// NEW:
<div ... >
  🎬
</div>
```

Change the logo aria-label (around line 40):
```ts
// OLD:
aria-label="Poker AI Review — Go to homepage"
// NEW:
aria-label="ThumbnailIQ — Go to homepage"
```

Change the logo text (around line 48–50):
```tsx
// OLD:
Poker AI Review
// NEW:
ThumbnailIQ
```

**Step 2: Verify**

Run: `pnpm run lint && pnpm run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/site-header.tsx
git commit -m "feat: rebrand header to ThumbnailIQ"
```

---

### Task 9: Rewrite landing page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/hero-section.tsx`
- Modify: `src/components/landing/pricing-section.tsx`
- Modify: `src/components/landing/landing-cta-section.tsx`
- Modify: `src/components/landing/analysis-mockup.tsx`

**Step 1: Rewrite `src/app/page.tsx`**

```tsx
import { HeroSection } from "@/components/landing/hero-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { PricingSection } from "@/components/landing/pricing-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
  description:
    "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds. 3 free analyses on signup.",
  openGraph: {
    title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
    description:
      "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds. 3 free analyses on signup.",
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PricingSection />
      <LandingCtaSection />
    </>
  );
}
```

**Step 2: Rewrite `src/components/landing/hero-section.tsx`**

```tsx
import { AnalysisMockup } from "@/components/landing/analysis-mockup";
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: headline + CTA */}
        <div className="space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Know if Your Thumbnail Will Get Clicked — Before You Publish
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload your YouTube thumbnail. Get an instant AI-powered CTR score
            with specific fixes for contrast, text, emotion, and curiosity gap.
          </p>
          <div className="space-y-3">
            <SignUpCtaButton size="lg" className="w-full sm:w-auto" />
            <p className="text-sm text-muted-foreground">
              No credit card required. 3 free analyses on signup.
            </p>
          </div>
        </div>

        {/* Right: analysis mockup */}
        <div>
          <AnalysisMockup />
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Rewrite `src/components/landing/pricing-section.tsx`**

```tsx
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FREE_FEATURES = [
  "3 thumbnail analyses",
  "Full CTR score breakdown",
  "Strengths & fixes report",
];

const PRO_FEATURES = [
  "50 thumbnail analyses",
  "Never expires",
  "Full CTR score breakdown",
  "$0.18 per analysis",
];

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-16 bg-muted/30">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight">Simple Pricing</h2>
        <p className="text-muted-foreground mt-2">
          Start free. Upgrade when you need more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Free tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Free</CardTitle>
            <p className="text-4xl font-bold mt-1">$0</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <SignUpCtaButton variant="outline" className="w-full">
              Get Started Free
            </SignUpCtaButton>
          </CardFooter>
        </Card>

        {/* Pro Pack */}
        <Card className="border-primary relative overflow-hidden">
          <Badge className="absolute top-4 right-4">Best Value</Badge>
          <CardHeader>
            <CardTitle className="text-xl">Pro Pack</CardTitle>
            <div className="mt-1">
              <p className="text-4xl font-bold">$9</p>
              <p className="text-sm text-muted-foreground">one-time</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <SignUpCtaButton className="w-full">
              Sign Up to Purchase
            </SignUpCtaButton>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
```

**Step 4: Rewrite `src/components/landing/landing-cta-section.tsx`**

```tsx
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function LandingCtaSection() {
  return (
    <section className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-4">
        Ready to Stop Guessing on Thumbnails?
      </h2>
      <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
        Join creators who use AI to predict CTR before publishing.
      </p>
      <SignUpCtaButton size="lg" />
    </section>
  );
}
```

**Step 5: Rewrite `src/components/landing/analysis-mockup.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";

export function AnalysisMockup() {
  return (
    <div
      className="rounded-xl border border-border/60 shadow-2xl overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Live Demo
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs py-0">
            92% confidence
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* LEFT: thumbnail placeholder */}
        <div className="border-b md:border-b-0 md:border-r border-border/60">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              🖼️ What you upload
            </p>
          </div>
          {/* YouTube 16:9 thumbnail placeholder */}
          <div className="relative w-full aspect-video bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-white font-black text-2xl leading-tight drop-shadow-lg">
                I QUIT My Job
              </p>
              <div className="mt-3 w-12 h-12 rounded-full bg-white/20 border-2 border-white/60 mx-auto" />
            </div>
          </div>
        </div>

        {/* RIGHT: AI analysis */}
        <div className="flex flex-col bg-background divide-y divide-border/40">

          <div className="px-3 py-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              🤖 What AI returns
            </p>
          </div>

          {/* Overall score */}
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Overall CTR Score
              </p>
              <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                8.0<span className="text-xs font-normal text-muted-foreground"> / 10</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "80%" }} />
            </div>
          </div>

          {/* Sub scores */}
          <div className="px-3 py-2 space-y-1.5">
            {[
              { label: "Visual Contrast", value: 9.0, pct: "90%" },
              { label: "Text Legibility", value: 8.5, pct: "85%" },
              { label: "Emotional Hook",  value: 8.0, pct: "80%" },
              { label: "Curiosity Gap",   value: 6.5, pct: "65%" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground flex-1">{s.label}</span>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.value >= 8 ? "bg-green-500" : "bg-yellow-500"}`}
                    style={{ width: s.pct }}
                  />
                </div>
                <span className={`font-semibold w-6 text-right ${s.value >= 8 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {["high-contrast", "strong-face", "curiosity-gap"].map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom line */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              🔥 Bottom Line
            </p>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-2">
              <p className="text-xs leading-relaxed">
                Add a visual context element (briefcase, dollar sign) to deepen the curiosity gap.
              </p>
            </div>
          </div>

          {/* Fixes */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              ❌ What to Fix
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Weak curiosity gap", fix: "Add a small icon hinting at stakes without revealing the outcome." },
                { label: "Text size", fix: "Increase font weight to 900 and add drop shadow for mobile legibility." },
              ].map((a) => (
                <div key={a.label} className="flex gap-2 text-xs">
                  <span className="text-red-400 shrink-0 mt-0.5">✗</span>
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-muted-foreground leading-snug">{a.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
```

**Step 6: Verify**

Run: `pnpm run lint && pnpm run typecheck`
Expected: no errors

**Step 7: Commit**

```bash
git add src/app/page.tsx src/components/landing/
git commit -m "feat: rewrite landing page for ThumbnailIQ"
```

---

### Task 10: Final lint + typecheck pass

**Step 1: Run full verification**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: zero errors, zero warnings

**Step 2: If lint errors appear**

Common issues to check:
- Unused imports (ESLint `no-unused-vars`)
- Missing `key` props on list items
- `any` type warnings — cast explicitly if needed

**Step 3: Final commit if any cleanup was needed**

```bash
git add -p
git commit -m "fix: lint and typecheck cleanup"
```

---

## Manual Smoke Test

After implementation, verify the following flows work end-to-end:

1. **Landing page** — visit `http://localhost:3000`, confirm ThumbnailIQ branding, score card mockup visible
2. **Upload page** — visit `/upload`, confirm "Analyze Your Thumbnail" heading, WebP accepted in dropzone
3. **Analysis page (in-progress)** — upload a thumbnail, confirm "Analyzing your thumbnail..." spinner
4. **Analysis page (complete)** — once done, confirm: score card renders with colored bars, thumbnail info strip shows detected text/faces/colors, strengths and improvements render, action items are numbered
5. **Dashboard** — confirm "Your Analyses" heading, "Upload Thumbnail" buttons

To start the dev server, ask the user to run `pnpm dev`.

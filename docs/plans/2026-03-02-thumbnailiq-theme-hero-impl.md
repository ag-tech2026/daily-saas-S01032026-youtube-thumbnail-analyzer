# ThumbnailIQ Theme & Hero Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand ThumbnailIQ with a dark & bold YouTube-creator aesthetic — near-black background, electric red-orange primary, Barlow Condensed + DM Mono fonts, animated hero, and a glowing analysis mockup.

**Architecture:** Four sequential file changes: (1) layout.tsx for fonts + metadata, (2) globals.css for color palette + animations, (3) hero-section.tsx rewrite, (4) analysis-mockup.tsx rewrite, (5) site-header.tsx font reference fix.

**Tech Stack:** Next.js 16, Tailwind CSS 4, next/font/google (Barlow Condensed + DM Mono), CSS @keyframes, React inline styles for dynamic values.

---

## Notes

- No test runner is configured — verification is `pnpm run lint && pnpm run typecheck` after each task.
- All changes are in `src/`. No DB changes, no new npm packages (fonts come from next/font/google).
- Tasks are sequential — each builds on the previous.

---

### Task 1: Update fonts and fix metadata in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Replace the full file contents**

Replace `src/app/layout.tsx` with:

```tsx
import { Barlow_Condensed, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { FontSizeProvider } from "@/components/font-size-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
    template: "%s | ThumbnailIQ",
  },
  description:
    "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds. 3 free analyses on signup.",
  keywords: [
    "YouTube thumbnail",
    "CTR",
    "thumbnail analysis",
    "YouTube creator",
    "thumbnail optimizer",
    "AI thumbnail",
    "click-through rate",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ThumbnailIQ",
    title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
    description:
      "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
    description:
      "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ThumbnailIQ",
  description:
    "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds.",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${barlowCondensed.variable} ${dmSans.variable} ${dmMono.variable} font-[family-name:var(--font-dm-sans)] antialiased`}
      >
        <FontSizeProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <SiteHeader />
            <main id="main-content">{children}</main>
            <SiteFooter />
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </FontSizeProvider>
      </body>
    </html>
  );
}
```

**Step 2: Verify**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: swap fonts to Barlow Condensed + DM Mono, fix metadata branding"
```

---

### Task 2: Rewrite globals.css — new color palette + CSS animations

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the full file contents**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.5rem;
  --background:              oklch(0.07 0 0);
  --foreground:              oklch(0.95 0 0);
  --card:                    oklch(0.11 0 0);
  --card-foreground:         oklch(0.95 0 0);
  --popover:                 oklch(0.11 0 0);
  --popover-foreground:      oklch(0.95 0 0);
  --primary:                 oklch(0.62 0.22 38);
  --primary-foreground:      oklch(0.95 0 0);
  --secondary:               oklch(0.16 0 0);
  --secondary-foreground:    oklch(0.95 0 0);
  --muted:                   oklch(0.16 0 0);
  --muted-foreground:        oklch(0.60 0 0);
  --accent:                  oklch(0.16 0 0);
  --accent-foreground:       oklch(0.95 0 0);
  --destructive:             oklch(0.55 0.2 25);
  --border:                  oklch(0.62 0.22 38 / 0.18);
  --input:                   oklch(0.62 0.22 38 / 0.10);
  --ring:                    oklch(0.62 0.22 38 / 0.55);
  --chart-1:                 oklch(0.62 0.22 38);
  --chart-2:                 oklch(0.55 0.2 25);
  --chart-3:                 oklch(0.65 0.14 155);
  --chart-4:                 oklch(0.72 0.10 250);
  --chart-5:                 oklch(0.78 0.15 85);
  --sidebar:                 oklch(0.07 0 0);
  --sidebar-foreground:      oklch(0.95 0 0);
  --sidebar-primary:         oklch(0.62 0.22 38);
  --sidebar-primary-foreground: oklch(0.95 0 0);
  --sidebar-accent:          oklch(0.11 0 0);
  --sidebar-accent-foreground: oklch(0.95 0 0);
  --sidebar-border:          oklch(0.62 0.22 38 / 0.15);
  --sidebar-ring:            oklch(0.62 0.22 38 / 0.40);
}

.dark {
  --background:              oklch(0.07 0 0);
  --foreground:              oklch(0.95 0 0);
  --card:                    oklch(0.11 0 0);
  --card-foreground:         oklch(0.95 0 0);
  --popover:                 oklch(0.11 0 0);
  --popover-foreground:      oklch(0.95 0 0);
  --primary:                 oklch(0.62 0.22 38);
  --primary-foreground:      oklch(0.95 0 0);
  --secondary:               oklch(0.16 0 0);
  --secondary-foreground:    oklch(0.95 0 0);
  --muted:                   oklch(0.16 0 0);
  --muted-foreground:        oklch(0.60 0 0);
  --accent:                  oklch(0.16 0 0);
  --accent-foreground:       oklch(0.95 0 0);
  --destructive:             oklch(0.55 0.2 25);
  --border:                  oklch(0.62 0.22 38 / 0.18);
  --input:                   oklch(0.62 0.22 38 / 0.10);
  --ring:                    oklch(0.62 0.22 38 / 0.55);
  --chart-1:                 oklch(0.62 0.22 38);
  --chart-2:                 oklch(0.55 0.2 25);
  --chart-3:                 oklch(0.65 0.14 155);
  --chart-4:                 oklch(0.72 0.10 250);
  --chart-5:                 oklch(0.78 0.15 85);
  --sidebar:                 oklch(0.07 0 0);
  --sidebar-foreground:      oklch(0.95 0 0);
  --sidebar-primary:         oklch(0.62 0.22 38);
  --sidebar-primary-foreground: oklch(0.95 0 0);
  --sidebar-accent:          oklch(0.11 0 0);
  --sidebar-accent-foreground: oklch(0.95 0 0);
  --sidebar-border:          oklch(0.62 0.22 38 / 0.15);
  --sidebar-ring:            oklch(0.62 0.22 38 / 0.40);
}

@layer base {
  html {
    font-size: 1.125rem; /* 18px base — readable default */
  }

  /* Font size overrides — applied via FontSizeProvider */
  html.font-size-sm { font-size: 1rem; }
  html.font-size-md { font-size: 1.125rem; }
  html.font-size-lg { font-size: 1.3125rem; }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    /* Subtle red-tinted grid texture */
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        oklch(0.62 0.22 38 / 0.025) 2px,
        oklch(0.62 0.22 38 / 0.025) 3px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        oklch(0.62 0.22 38 / 0.018) 2px,
        oklch(0.62 0.22 38 / 0.018) 3px
      );
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-barlow), sans-serif;
  }
}

@keyframes fillBar {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fill-bar {
  transform-origin: left;
  animation: fillBar 0.8s ease-out both;
}

.animate-fade-up {
  animation: fadeUp 0.6s ease-out both;
}
```

**Step 2: Verify**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace theme with dark bold palette, add fadeUp + fillBar animations"
```

---

### Task 3: Rewrite hero-section.tsx

**Files:**
- Modify: `src/components/landing/hero-section.tsx`

**Step 1: Replace the full file contents**

Replace `src/components/landing/hero-section.tsx` with:

```tsx
import { AnalysisMockup } from "@/components/landing/analysis-mockup";
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Radial red-orange glow behind headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.62 0.22 38 / 0.12), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 pt-20 pb-8 lg:pt-28 lg:pb-12 text-center relative">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-6 animate-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          AI-Powered CTR Analysis
        </div>

        {/* Headline */}
        <h1
          className="font-[family-name:var(--font-barlow)] font-extrabold uppercase leading-none tracking-tight text-6xl lg:text-7xl xl:text-8xl mb-6 animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Stop Guessing
          <br />
          Your CTR<span className="text-primary">.</span>
        </h1>

        {/* Sub-line */}
        <p
          className="text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          Know if your thumbnail gets clicked before you publish.
          Scores, fixes, and reasoning in 30 seconds.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-3 animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <SignUpCtaButton
            size="lg"
            className="font-[family-name:var(--font-barlow)] font-bold uppercase tracking-wide px-8 transition-all duration-300 hover:shadow-[0_0_24px_oklch(0.62_0.22_38/0.5)]"
          >
            Analyze Your Thumbnail
          </SignUpCtaButton>
          <p className="text-sm text-muted-foreground">
            No credit card · 3 free analyses
          </p>
        </div>
      </div>

      {/* Full-width mockup */}
      <div
        className="container mx-auto px-4 pb-16 lg:pb-24 animate-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <div className="max-w-5xl mx-auto">
          <AnalysisMockup />
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/landing/hero-section.tsx
git commit -m "feat: rewrite hero — centered layout, radial glow, staggered fade-up animation"
```

---

### Task 4: Rewrite analysis-mockup.tsx

**Files:**
- Modify: `src/components/landing/analysis-mockup.tsx`

**Step 1: Replace the full file contents**

Replace `src/components/landing/analysis-mockup.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge";

const SCORES = [
  { label: "Visual Contrast", value: 9.0, pct: 90, isPrimary: true,  delay: "400ms" },
  { label: "Text Legibility", value: 8.5, pct: 85, isPrimary: true,  delay: "500ms" },
  { label: "Emotional Hook",  value: 8.0, pct: 80, isPrimary: true,  delay: "600ms" },
  { label: "Curiosity Gap",   value: 6.5, pct: 65, isPrimary: false, delay: "700ms" },
] as const;

export function AnalysisMockup() {
  return (
    <div
      className="rounded-xl overflow-hidden pointer-events-none select-none"
      style={{
        border: "1px solid oklch(0.62 0.22 38 / 0.35)",
        boxShadow: "0 0 48px oklch(0.62 0.22 38 / 0.15)",
      }}
      aria-hidden="true"
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-card/80">
        <span className="font-[family-name:var(--font-barlow)] text-xs font-bold uppercase tracking-widest text-primary">
          ThumbnailIQ
        </span>
        <span className="text-xs text-muted-foreground ml-1">Live Demo</span>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className="text-xs py-0 border-primary/40 text-primary font-[family-name:var(--font-dm-mono)]"
          >
            92% confidence
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: thumbnail placeholder */}
        <div className="border-b md:border-b-0 md:border-r">
          <div className="px-3 py-2 border-b bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What you upload
            </p>
          </div>
          <div className="relative w-full aspect-video bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="font-[family-name:var(--font-barlow)] text-white font-extrabold text-2xl leading-tight drop-shadow-lg uppercase">
                I QUIT My Job
              </p>
              <div className="mt-3 w-12 h-12 rounded-full bg-white/20 border-2 border-white/60 mx-auto" />
            </div>
          </div>
        </div>

        {/* Right: AI results */}
        <div className="flex flex-col bg-background divide-y">
          <div className="px-3 py-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What AI returns
            </p>
          </div>

          {/* Overall CTR score */}
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Overall CTR Score
              </p>
              <span
                className="font-[family-name:var(--font-dm-mono)] text-lg font-medium tabular-nums text-primary"
              >
                8.0<span className="text-xs font-normal text-muted-foreground"> / 10</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full animate-fill-bar"
                style={{ width: "80%", animationDelay: "300ms" }}
              />
            </div>
          </div>

          {/* Sub-scores */}
          <div className="px-3 py-2 space-y-2">
            {SCORES.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground flex-1">{s.label}</span>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full animate-fill-bar"
                    style={{
                      width: `${s.pct}%`,
                      background: s.isPrimary
                        ? "oklch(0.62 0.22 38)"
                        : "oklch(0.78 0.15 85)",
                      animationDelay: s.delay,
                    }}
                  />
                </div>
                <span
                  className="font-[family-name:var(--font-dm-mono)] font-medium w-6 text-right tabular-nums"
                  style={{
                    color: s.isPrimary
                      ? "oklch(0.62 0.22 38)"
                      : "oklch(0.78 0.15 85)",
                  }}
                >
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

          {/* Bottom Line */}
          <div className="px-3 py-3">
            <p className="font-[family-name:var(--font-barlow)] text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5 border-l-2 border-primary pl-2">
              Bottom Line
            </p>
            <div
              className="rounded-lg px-2.5 py-2"
              style={{
                border: "1px solid oklch(0.62 0.22 38 / 0.25)",
                background: "oklch(0.62 0.22 38 / 0.08)",
              }}
            >
              <p className="text-xs leading-relaxed">
                Add a visual context element to deepen the curiosity gap.
              </p>
            </div>
          </div>

          {/* What to Fix */}
          <div className="px-3 py-3">
            <p className="font-[family-name:var(--font-barlow)] text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
              What to Fix
            </p>
            <div className="space-y-1.5">
              {[
                {
                  label: "Weak curiosity gap",
                  fix: "Add a small icon hinting at stakes without revealing the outcome.",
                },
                {
                  label: "Text size",
                  fix: "Increase font weight to 900 and add drop shadow for mobile legibility.",
                },
              ].map((a) => (
                <div key={a.label} className="flex gap-2 text-xs">
                  <span className="text-primary shrink-0 mt-0.5 font-bold">✗</span>
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

**Step 2: Verify**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/landing/analysis-mockup.tsx
git commit -m "feat: rewrite analysis mockup — glow border, animated score bars, red-orange theme"
```

---

### Task 5: Fix font reference in site-header.tsx

**Files:**
- Modify: `src/components/site-header.tsx`

**Step 1: Update the logo font variable**

In `src/components/site-header.tsx` line 48, find:

```tsx
className="font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-wide text-primary group-hover:text-primary/85 transition-colors duration-200 hidden sm:inline"
```

Replace with:

```tsx
className="font-[family-name:var(--font-barlow)] text-lg font-bold uppercase tracking-widest text-primary group-hover:text-primary/85 transition-colors duration-200 hidden sm:inline"
```

**Step 2: Verify**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/site-header.tsx
git commit -m "feat: update site header logo font to Barlow Condensed"
```

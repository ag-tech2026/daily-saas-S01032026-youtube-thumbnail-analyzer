# ThumbnailIQ — Theme & Hero Redesign

**Date:** 2026-03-02
**Scope:** Full visual rebrand (theme + hero section)
**Aesthetic direction:** Dark & Bold — YouTube creator energy. Near-black, electric red-orange, bold condensed typography.

---

## 1. Theme

### Color palette

| Token | Value | Notes |
|---|---|---|
| `--background` | `oklch(0.07 0 0)` | Near-black ~#111 |
| `--foreground` | `oklch(0.95 0 0)` | Off-white ~#f2f2f2 |
| `--card` | `oklch(0.11 0 0)` | ~#1a1a1a |
| `--card-foreground` | `oklch(0.95 0 0)` | |
| `--popover` | `oklch(0.11 0 0)` | |
| `--popover-foreground` | `oklch(0.95 0 0)` | |
| `--primary` | `oklch(0.62 0.22 38)` | Electric red-orange ~#ff4500 |
| `--primary-foreground` | `oklch(0.95 0 0)` | |
| `--secondary` | `oklch(0.16 0 0)` | Dark surface |
| `--secondary-foreground` | `oklch(0.95 0 0)` | |
| `--muted` | `oklch(0.16 0 0)` | |
| `--muted-foreground` | `oklch(0.60 0 0)` | Mid-grey |
| `--accent` | `oklch(0.16 0 0)` | |
| `--accent-foreground` | `oklch(0.95 0 0)` | |
| `--destructive` | `oklch(0.55 0.2 25)` | Keep as-is |
| `--border` | `oklch(0.62 0.22 38 / 0.18)` | Red-tinted subtle border |
| `--input` | `oklch(0.62 0.22 38 / 0.10)` | |
| `--ring` | `oklch(0.62 0.22 38 / 0.55)` | |

Both `:root` and `.dark` use the same dark values (dark-first design).

Body background texture: keep the repeating-linear-gradient grid lines, tinted with `oklch(0.62 0.22 38 / 0.03)` instead of black.

### Typography

**Three font roles:**

| Role | Font | Weights | Used for |
|---|---|---|---|
| Display | Barlow Condensed (new) | 700, 800 | H1, H2, hero badge |
| Body | DM Sans (keep) | 300–700 | Body, nav, paragraphs |
| Mono | DM Mono (new) | 400, 500 | Score numbers, stats |

**Changes to `layout.tsx`:**
- Import `Barlow_Condensed` and `DM_Mono` from `next/font/google`, remove `Playfair_Display`
- Apply `--font-barlow` CSS variable for display
- Apply `--font-dm-mono` CSS variable for mono

**Changes to `globals.css`:**
- Update `h1, h2, h3, h4, h5, h6` to use `var(--font-barlow), sans-serif`
- Remove Playfair reference

**Also fix in `layout.tsx`:** metadata still references "Poker AI Review" — update all title/description/og/twitter/jsonLd fields to ThumbnailIQ.

---

## 2. Hero Section

**File:** `src/components/landing/hero-section.tsx`

### Layout
Centered, single-column with full-width mockup below.

```
[section — full viewport width, dark bg with radial glow]

  [badge]  AI-POWERED CTR ANALYSIS

  STOP GUESSING
  YOUR CTR.          ← "." colored primary red-orange

  Know if your thumbnail gets clicked before you publish.
  Scores, fixes, and reasoning in 30 seconds.

         [ Analyze Your Thumbnail → ]
         No credit card · 3 free analyses

[full-width analysis mockup — max-w-5xl, centered]
```

### Background
A faint radial gradient centered behind the headline:
```css
radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.62 0.22 38 / 0.12), transparent)
```
Over the near-black body background. Creates a subtle red-orange glow "source" above the headline.

### Headline
- Font: Barlow Condensed ExtraBold (800), uppercase
- Size: `text-6xl lg:text-7xl xl:text-8xl`
- Two lines: "STOP GUESSING" / "YOUR CTR."
- The period on the second line is wrapped in `<span className="text-primary">.</span>`

### Sub-line
- DM Sans, `text-lg lg:text-xl`, `text-muted-foreground`
- Max-width ~560px, centered

### CTA button
- Primary filled button, Barlow Condensed, uppercase text
- Hover state: `box-shadow: 0 0 24px oklch(0.62 0.22 38 / 0.5)` — glowing effect
- Arrow icon on the right

### Stagger animation
Text elements fade + slide up on page load using CSS `@keyframes fadeUp` with staggered `animation-delay`:
- Badge: 0ms
- Headline: 100ms
- Sub-line: 200ms
- CTA area: 300ms

---

## 3. Analysis Mockup

**File:** `src/components/landing/analysis-mockup.tsx`

### Container
- `border: 1px solid oklch(0.62 0.22 38 / 0.35)`
- `box-shadow: 0 0 48px oklch(0.62 0.22 38 / 0.15)` — red-orange glow halo
- `border-radius: var(--radius-xl)`

### Header bar
- "ThumbnailIQ" label on left (Barlow Condensed, small-caps tracking)
- "92% confidence" badge on right in primary color

### Left column — thumbnail placeholder
- Bold gradient: red → orange → yellow (`from-red-600 via-orange-500 to-yellow-400`)
- Bold "I QUIT My Job" text overlay (Barlow Condensed)
- Circular face placeholder

### Right column — scores
- "CTR SCORE" label (DM Sans, small-caps)
- "8.0 / 10" in DM Mono, large, primary color
- Overall score bar: full-width, fills to 80%

**Sub-scores with animated bars:**
Each row: label | animated bar | value in DM Mono

```
Visual Contrast   [████████████░░]  9.0  ← primary color
Text Legibility   [██████████░░░░]  8.5  ← primary color
Emotional Hook    [█████████░░░░░]  8.0  ← primary color
Curiosity Gap     [███████░░░░░░░]  6.5  ← amber color
```

**CSS animation:** `@keyframes fillBar` grows `width` from `0%` to final value. Each bar has:
- `animation: fillBar 0.8s ease-out forwards`
- Staggered `animation-delay`: 400ms, 500ms, 600ms, 700ms (after page fade-in)

### Bottom Line section
- "BOTTOM LINE" in Barlow Condensed small-caps, left border accent in primary
- Red-orange left border `border-l-2 border-primary`

### What to Fix section
- "WHAT TO FIX" label in Barlow Condensed
- Red `✗` icons (styled `text-primary`)

---

## Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | Replace color palette, update font references, red-tint grid texture |
| `src/app/layout.tsx` | Swap fonts (add Barlow Condensed + DM Mono, remove Playfair Display), fix metadata |
| `src/components/landing/hero-section.tsx` | Full rewrite — centered layout, radial glow, stagger animation |
| `src/components/landing/analysis-mockup.tsx` | Full rewrite — animated bars, new color scheme, glow border |

No new dependencies. All fonts are Google Fonts via `next/font/google`. No DB changes. No API changes.

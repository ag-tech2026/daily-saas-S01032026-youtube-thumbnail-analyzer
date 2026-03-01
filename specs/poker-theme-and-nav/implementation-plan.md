# Implementation Plan: Poker Theme & Navigation

## Overview

Four files are modified. Apply in order: CSS variables first (all components inherit from them), then fonts in layout, then the header component, then the dashboard cleanup.

---

## Phase 1: Poker Theme CSS Variables & Typography

Replace the generic shadcn color palette with a poker-table aesthetic and upgrade fonts.

### Tasks

- [x] Replace `:root` and `.dark` CSS variable blocks in `globals.css` with poker palette
- [x] Replace `@layer base` block in `globals.css` with felt texture + heading font rule
- [x] Replace Geist font imports in `layout.tsx` with Playfair Display + DM Sans
- [x] Update `<body>` className in `layout.tsx` to apply DM Sans as default font
- [x] Change `defaultTheme` in ThemeProvider from `"system"` to `"dark"`

### Technical Details

**File:** `src/app/globals.css`

Keep the `@theme inline` block (lines 3–39) **unchanged**. Only replace `:root`, `.dark`, and `@layer base` (lines 41–117).

**`:root` replacement (light/day mode — elevated felt, not white):**
```css
:root {
  --radius: 0.5rem;
  --background:              oklch(0.22 0.04 145);
  --foreground:              oklch(0.93 0.02 85);
  --card:                    oklch(0.28 0.04 145);
  --card-foreground:         oklch(0.93 0.02 85);
  --popover:                 oklch(0.28 0.04 145);
  --popover-foreground:      oklch(0.93 0.02 85);
  --primary:                 oklch(0.78 0.15 85);
  --primary-foreground:      oklch(0.12 0.04 145);
  --secondary:               oklch(0.32 0.05 145);
  --secondary-foreground:    oklch(0.93 0.02 85);
  --muted:                   oklch(0.30 0.04 145);
  --muted-foreground:        oklch(0.58 0.04 85);
  --accent:                  oklch(0.32 0.05 145);
  --accent-foreground:       oklch(0.93 0.02 85);
  --destructive:             oklch(0.55 0.2 25);
  --border:                  oklch(0.78 0.15 85 / 0.25);
  --input:                   oklch(0.78 0.15 85 / 0.15);
  --ring:                    oklch(0.78 0.15 85 / 0.6);
  --chart-1:                 oklch(0.78 0.15 85);
  --chart-2:                 oklch(0.55 0.2 25);
  --chart-3:                 oklch(0.65 0.14 155);
  --chart-4:                 oklch(0.72 0.10 250);
  --chart-5:                 oklch(0.80 0.08 85);
  --sidebar:                 oklch(0.18 0.04 145);
  --sidebar-foreground:      oklch(0.93 0.02 85);
  --sidebar-primary:         oklch(0.78 0.15 85);
  --sidebar-primary-foreground: oklch(0.12 0.04 145);
  --sidebar-accent:          oklch(0.28 0.04 145);
  --sidebar-accent-foreground: oklch(0.93 0.02 85);
  --sidebar-border:          oklch(0.78 0.15 85 / 0.2);
  --sidebar-ring:            oklch(0.78 0.15 85 / 0.5);
}
```

**`.dark` replacement (deep midnight felt — primary experience):**
```css
.dark {
  --background:              oklch(0.12 0.04 145);
  --foreground:              oklch(0.93 0.02 85);
  --card:                    oklch(0.18 0.04 145);
  --card-foreground:         oklch(0.93 0.02 85);
  --popover:                 oklch(0.18 0.04 145);
  --popover-foreground:      oklch(0.93 0.02 85);
  --primary:                 oklch(0.78 0.15 85);
  --primary-foreground:      oklch(0.12 0.04 145);
  --secondary:               oklch(0.22 0.04 145);
  --secondary-foreground:    oklch(0.93 0.02 85);
  --muted:                   oklch(0.20 0.04 145);
  --muted-foreground:        oklch(0.58 0.04 85);
  --accent:                  oklch(0.22 0.04 145);
  --accent-foreground:       oklch(0.93 0.02 85);
  --destructive:             oklch(0.55 0.2 25);
  --border:                  oklch(0.78 0.15 85 / 0.2);
  --input:                   oklch(0.78 0.15 85 / 0.12);
  --ring:                    oklch(0.78 0.15 85 / 0.5);
  --chart-1:                 oklch(0.78 0.15 85);
  --chart-2:                 oklch(0.55 0.2 25);
  --chart-3:                 oklch(0.65 0.14 155);
  --chart-4:                 oklch(0.72 0.10 250);
  --chart-5:                 oklch(0.80 0.08 85);
  --sidebar:                 oklch(0.10 0.03 145);
  --sidebar-foreground:      oklch(0.93 0.02 85);
  --sidebar-primary:         oklch(0.78 0.15 85);
  --sidebar-primary-foreground: oklch(0.12 0.04 145);
  --sidebar-accent:          oklch(0.18 0.04 145);
  --sidebar-accent-foreground: oklch(0.93 0.02 85);
  --sidebar-border:          oklch(0.78 0.15 85 / 0.15);
  --sidebar-ring:            oklch(0.78 0.15 85 / 0.4);
}
```

**Updated `@layer base` block:**
```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    /* CSS felt texture: subtle woven grid lines, no external image */
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        oklch(0 0 0 / 0.04) 2px,
        oklch(0 0 0 / 0.04) 3px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        oklch(0 0 0 / 0.03) 2px,
        oklch(0 0 0 / 0.03) 3px
      );
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-playfair), Georgia, serif;
  }
}
```

---

**File:** `src/app/layout.tsx`

**Font import change (lines 1, 9–17):**

Remove:
```typescript
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

Add:
```typescript
import { Playfair_Display, DM_Sans } from "next/font/google";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
```

**`<body>` className (line 85):**
```typescript
// From:
className={`${geistSans.variable} ${geistMono.variable} antialiased`}
// To:
className={`${playfairDisplay.variable} ${dmSans.variable} font-[family-name:var(--font-dm-sans)] antialiased`}
```

Note: `font-[family-name:var(--font-dm-sans)]` is the Tailwind CSS 4 syntax for applying a CSS variable as `font-family`. Import names use underscore: `Playfair_Display`, `DM_Sans`.

**ThemeProvider (line 89):**
```typescript
// From:
defaultTheme="system"
// To:
defaultTheme="dark"
```

---

## Phase 2: Navigation Bar

Update the site header to include nav links and improved branding.

### Tasks

- [x] Add `"use client"` directive to `site-header.tsx` (needed for `usePathname`)
- [x] Replace Bot icon + "Starter Kit" logo with ♠ spade + "Poker AI Review" in Playfair Display
- [x] Add sticky + backdrop-blur styling to the `<header>` element
- [x] Add three nav links (Dashboard, Analyze Hand, Profile) with active state highlighting
- [x] Replace existing imports with `usePathname`, `cn` utility, and remove `Bot` icon import

### Technical Details

**File:** `src/components/site-header.tsx` — full replacement:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "./ui/mode-toggle";

const NAV_LINKS = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "Analyze Hand", href: "/upload" },
  { label: "Profile",      href: "/profile" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>

      <header
        className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-40"
        role="banner"
      >
        <nav
          className="container mx-auto px-4 py-3 flex items-center justify-between gap-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
            aria-label="Poker AI Review — Go to homepage"
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xl leading-none group-hover:border-primary/70 group-hover:bg-primary/15 transition-all duration-200"
              aria-hidden="true"
            >
              ♠
            </div>
            <span className="font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-wide text-primary group-hover:text-primary/85 transition-colors duration-200 hidden sm:inline">
              Poker AI Review
            </span>
          </Link>

          {/* Centre nav links */}
          <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                    isActive
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right: user area */}
          <div className="flex items-center gap-3 shrink-0" role="group" aria-label="User actions">
            <UserProfile />
            <ModeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}
```

Key design notes:
- `sticky top-0 z-40` + `backdrop-blur-sm` + `bg-background/95` = floating header with blur
- ♠ is a Unicode character — no icon import required
- `hidden sm:inline` hides wordmark on mobile, keeps just the spade icon
- Active state: gold pill with border (`text-primary bg-primary/10 border border-primary/30`)
- `aria-current="page"` set on active link for accessibility
- `SiteHeader` has no async server logic, so `"use client"` is safe

---

## Phase 3: Dashboard Cleanup

Remove the AI Chat card from the dashboard.

### Tasks

- [x] Remove the AI Chat card `<div>` block from `dashboard/page.tsx`
- [x] Remove the `useDiagnostics` import from `dashboard/page.tsx`
- [x] Remove the `isAiReady` and `diagnosticsLoading` destructured variables

### Technical Details

**File:** `src/app/dashboard/page.tsx`

**Remove this import:**
```typescript
import { useDiagnostics } from "@/hooks/use-diagnostics";
```

**Remove this line from the component body:**
```typescript
const { isAiReady, loading: diagnosticsLoading } = useDiagnostics();
```

**Remove this entire card block from the grid:**
```typescript
<div className="p-6 border border-border rounded-lg">
  <h2 className="text-xl font-semibold mb-2">AI Chat</h2>
  <p className="text-muted-foreground mb-4">
    Start a conversation with AI using the Vercel AI SDK
  </p>
  {(diagnosticsLoading || !isAiReady) ? (
    <Button disabled={true}>Go to Chat</Button>
  ) : (
    <Button asChild><Link href="/chat">Go to Chat</Link></Button>
  )}
</div>
```

After removal, the grid has 3 cards (Analyze Hand, Profile, Credits), which fills `lg:grid-cols-3` naturally. The `Button` import remains used by other cards — no further cleanup needed.

---

## Phase 4: Validation

### Tasks

- [x] Run `npm run lint && npm run typecheck` and fix any errors
- [ ] Verify dev server renders the poker theme correctly (ask user to run `npm run dev`)

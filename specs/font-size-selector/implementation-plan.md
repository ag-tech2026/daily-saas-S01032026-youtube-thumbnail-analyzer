# Implementation Plan: Font Size Selector

## Overview

Add a site-wide font size selector to the navbar. Uses a React context provider to manage state, CSS classes on `<html>` to apply the size, and `localStorage` for persistence. 3 sizes: Small (16px), Normal (18px, default), Large (21px).

---

## Phase 1: CSS Foundation

Add the three font-size override classes to global CSS.

### Tasks

- [x] Add `html.font-size-sm`, `html.font-size-md`, and `html.font-size-lg` classes to `globals.css`

### Technical Details

File: `src/app/globals.css` — add inside `@layer base`:

```css
/* Font size overrides — applied via FontSizeProvider */
html.font-size-sm { font-size: 1rem; }        /* 16px */
html.font-size-md { font-size: 1.125rem; }    /* 18px — matches existing default */
html.font-size-lg { font-size: 1.3125rem; }   /* 21px */
```

Keep the existing `html { font-size: 1.125rem; }` rule as the no-JS fallback.

---

## Phase 2: FontSizeProvider Context

Create a React context that manages font size state and syncs it to the DOM and localStorage.

### Tasks

- [x] Create `src/components/font-size-provider.tsx`

### Technical Details

File: `src/components/font-size-provider.tsx`

```tsx
"use client";

import * as React from "react";

type FontSize = "sm" | "md" | "lg";

const STORAGE_KEY = "font-size";
const DEFAULT: FontSize = "md";
const CLASSES: FontSize[] = ["sm", "md", "lg"];

const FontSizeContext = React.createContext<{
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}>({ fontSize: DEFAULT, setFontSize: () => {} });

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = React.useState<FontSize>(DEFAULT);

  // Read from localStorage on mount and apply class
  React.useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as FontSize) ?? DEFAULT;
    apply(saved);
    setFontSizeState(saved);
  }, []);

  function apply(size: FontSize) {
    const html = document.documentElement;
    CLASSES.forEach((c) => html.classList.remove(`font-size-${c}`));
    html.classList.add(`font-size-${size}`);
  }

  function setFontSize(size: FontSize) {
    apply(size);
    localStorage.setItem(STORAGE_KEY, size);
    setFontSizeState(size);
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return React.useContext(FontSizeContext);
}
```

---

## Phase 3: FontSizeToggle UI Component

Create the navbar toggle button component.

### Tasks

- [x] Create `src/components/ui/font-size-toggle.tsx`

### Technical Details

File: `src/components/ui/font-size-toggle.tsx`

```tsx
"use client";

import { useFontSize } from "@/components/font-size-provider";
import { cn } from "@/lib/utils";

const SIZES = [
  { value: "sm" as const, label: "A", title: "Small text" },
  { value: "md" as const, label: "A", title: "Normal text" },
  { value: "lg" as const, label: "A", title: "Large text" },
] as const;

export function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5"
      role="group"
      aria-label="Font size"
    >
      {SIZES.map(({ value, label, title }, i) => (
        <button
          key={value}
          onClick={() => setFontSize(value)}
          title={title}
          aria-pressed={fontSize === value}
          className={cn(
            "flex items-center justify-center rounded px-1.5 py-0.5 transition-all duration-150 font-medium leading-none select-none",
            i === 0 && "text-[11px]",
            i === 1 && "text-[13px]",
            i === 2 && "text-[15px]",
            fontSize === value
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

---

## Phase 4: Wire Into Layout & Navbar

Wrap the app with the provider and add the toggle to the navbar.

### Tasks

- [x] Wrap `ThemeProvider` with `<FontSizeProvider>` in `src/app/layout.tsx`
- [x] Import and render `<FontSizeToggle />` in `src/components/site-header.tsx` (between `<UserProfile />` and `<ModeToggle />`)
- [x] Run `pnpm run lint && pnpm run typecheck`

### Technical Details

**`src/app/layout.tsx`** — add import and wrap:
```tsx
import { FontSizeProvider } from "@/components/font-size-provider";

// In RootLayout:
<FontSizeProvider>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    ...
  </ThemeProvider>
</FontSizeProvider>
```

**`src/components/site-header.tsx`** — add to right group:
```tsx
import { FontSizeToggle } from "./ui/font-size-toggle";

// In the right "User actions" div:
<UserProfile />
<FontSizeToggle />
<ModeToggle />
```

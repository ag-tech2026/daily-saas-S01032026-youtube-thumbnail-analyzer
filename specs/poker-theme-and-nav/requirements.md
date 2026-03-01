# Requirements: Poker Theme & Navigation

## Overview

Transform the app's generic shadcn/ui default styling into a distinctive poker-table aesthetic and add a proper navigation bar to the site header. Also clean up the dashboard by removing the irrelevant AI Chat card.

## Why

The app's current UI uses out-of-the-box shadcn defaults (white background, near-black primary). This creates a disconnect with the poker context — a high-stakes card game calls for a rich, atmospheric design. The header has no navigation links, making it hard to move between pages. The AI Chat card on the dashboard is a leftover from the boilerplate and doesn't belong in this product.

## What This Feature Does

1. **Poker Table Theme** — Replaces the global CSS color variables with a "High-Stakes Private Club" palette: deep felt green backgrounds, warm gold primary accents, cream text, crimson for destructive actions. Typography upgrades to Playfair Display (headings) + DM Sans (body). A subtle CSS felt texture is applied to the page body.

2. **Navigation Bar** — Adds three nav links (Dashboard, Analyze Hand, Profile) to the site header between the logo and the user profile area. The active link is visually highlighted in gold. The header becomes sticky with a backdrop blur effect. The logo is updated from a generic bot icon to a spade ♠ symbol with Playfair Display wordmark.

3. **Dashboard Cleanup** — Removes the AI Chat card and its associated `useDiagnostics` import/hook usage from the dashboard page.

## Acceptance Criteria

- [ ] All pages have a dark felt green background (default to dark mode)
- [ ] Primary accent color (buttons, badges, links) is warm gold
- [ ] Headings use Playfair Display, body text uses DM Sans
- [ ] A subtle woven-grid texture is visible on the page background
- [ ] The site header is sticky and shows: ♠ "Poker AI Review" logo | Dashboard | Analyze Hand | Profile | [user] | [theme toggle]
- [ ] The active nav link is highlighted with a gold-tinted pill style
- [ ] The dashboard no longer shows an AI Chat card
- [ ] `npm run lint && npm run typecheck` passes with zero errors

## Dependencies

- No new packages required — fonts come from `next/font/google` (already in use)
- No database or auth changes
- No API changes

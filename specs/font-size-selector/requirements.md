# Requirements: Font Size Selector

## Overview

Add a font size picker to the site navbar that lets users choose from 3 text sizes. The selection affects all text across the entire site and persists across page reloads.

## Problem

The current base font size (18px) feels too small for some users. There is no way to adjust it without modifying the browser's zoom settings.

## Solution

A compact 3-button toggle in the navbar (next to the dark mode toggle) that applies a CSS class to the `<html>` element. Since all sizing in the app uses `rem` units, changing the root font size scales the entire UI proportionally.

## Acceptance Criteria

- [ ] Navbar contains a font size toggle with 3 options: Small, Normal, Large
- [ ] Clicking a size immediately changes all text across the site
- [ ] Selected size is saved to `localStorage` and restored on next visit
- [ ] Default size is Normal (18px — matches current site default)
- [ ] Toggle visually indicates the currently active size
- [ ] Works in both light and dark mode
- [ ] No layout breakage at any of the 3 sizes

## Font Sizes

| Label  | Size  | CSS Value   |
|--------|-------|-------------|
| Small  | 16px  | 1rem        |
| Normal | 18px  | 1.125rem    |
| Large  | 21px  | 1.3125rem   |

## Dependencies

- None (self-contained feature using React context + localStorage + CSS classes)

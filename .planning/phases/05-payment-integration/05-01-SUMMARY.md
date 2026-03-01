---
phase: 05-payment-integration
plan: 01
subsystem: payment
tags: [polar, checkout, webhooks, monetization, credits]
dependency-graph:
  requires: [auth, credits, database]
  provides: [checkout-api, webhook-handler, buy-ui]
  affects: [user-credits, dashboard, header, dialogs]
tech-stack:
  added: [@polar-sh/better-auth, @polar-sh/sdk]
  patterns: [transaction-idempotency, webhook-signature-verification, polling-state-update]
key-files:
  created:
    - src/lib/polar.ts
    - src/components/purchase-credits-button.tsx
  modified:
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/lib/schema.ts
    - src/app/dashboard/page.tsx
    - src/components/auth/user-profile.tsx
    - src/components/upload/insufficient-credits-dialog.tsx
    - env.example
decisions:
  - Polar SDK uses sandbox environment for NODE_ENV !== production (automatic env toggle)
  - Transaction-based idempotency using webhookEvents table prevents duplicate credit additions
  - Dashboard polls /api/auth/get-session every 3s after Polar redirect to detect credit increase
  - Header credit count is directly clickable (not dropdown item) for faster checkout access
  - No success toast on purchase completion — credit balance update speaks for itself
metrics:
  duration: 261s
  tasks: 2
  files_created: 2
  files_modified: 7
  commits: 2
  completed: 2026-02-18T12:29:41Z
---

# Phase 05 Plan 01: Polar Payment Integration Summary

**Integrated Polar payment processing enabling users to purchase 50-credit packs for $9 via seamless checkout flow with webhook-based fulfillment and transaction-based idempotency.**

## Tasks Completed

### Task 1: Polar Backend Integration (Commit: dceb7a7)
**Duration:** 3 min
**Files:** src/lib/polar.ts, src/lib/auth.ts, src/lib/auth-client.ts, src/lib/schema.ts, env.example

**Implementation:**
- Installed @polar-sh/better-auth and @polar-sh/sdk packages
- Created Polar SDK client with automatic sandbox/production toggle based on NODE_ENV
- Configured BetterAuth with Polar plugin including checkout and webhooks sub-plugins
- Checkout endpoint: `/api/auth/checkout/credits-50` (slug: credits-50, productId from env)
- Webhook endpoint: `/api/auth/polar/webhooks` (BetterAuth catch-all route handles this)
- Implemented transaction-based idempotency in onOrderPaid handler:
  - Check webhookEvents table for existing order ID
  - If exists, skip processing (prevents duplicate credit additions)
  - If new, insert webhook event record + atomically increment user credits by 50
- Added webhookEvents table to schema with id (order ID), type, processedAt, payload fields
- Updated env.example with POLAR_PRODUCT_ID entry

**Key Technical Decisions:**
- Used `sql` template for atomic credit increment: `credits = credits + 50`
- Polar customer externalId maps directly to BetterAuth user.id (no additional mapping table needed)
- Webhook signature verification handled automatically by @polar-sh/better-auth plugin

### Task 2: Purchase UI (Commit: 33bdfaf)
**Duration:** 2 min
**Files:** src/components/purchase-credits-button.tsx, src/app/dashboard/page.tsx, src/components/upload/insufficient-credits-dialog.tsx, src/components/auth/user-profile.tsx

**Implementation:**
- Created reusable PurchaseCreditsButton component:
  - Triggers authClient.checkout({ slug: "credits-50" })
  - Shows loading state ("Redirecting...") while initiating checkout
  - Supports variant, size, className, and children props for customization
- Dashboard integration:
  - Added buy button below credit balance display
  - Implemented purchase processing indicator on `?purchase=success` return
  - Polls /api/auth/get-session every 3 seconds to detect credit increase
  - Automatically clears URL and stops polling once credits updated (or after 30s timeout)
  - No success toast — credit balance update is sufficient feedback
- Insufficient credits dialog:
  - Changed title to "Out of Credits"
  - Updated description: "Get 50 more for just $9 to continue analyzing your poker hands"
  - Replaced /pricing link with PurchaseCreditsButton triggering checkout directly
- Header user profile:
  - Made credit count section clickable with hover feedback
  - Clicking triggers authClient.checkout({ slug: "credits-50" })
  - Added cursor-pointer and hover:bg-accent classes for visual feedback

**Key UX Decisions:**
- Buy button appears in 3 strategic locations: dashboard card, insufficient credits dialog, header dropdown
- Processing indicator shows "Purchase processing... Credits will appear shortly" during webhook delay
- Derived isProcessing state from URL params (not useState) to avoid cascading renders
- Header credit count is directly clickable (simpler than nested dropdown menu item)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✅ `pnpm run lint` — no errors
2. ✅ `pnpm run typecheck` — no errors
3. ✅ src/lib/polar.ts creates Polar client with sandbox/production toggle
4. ✅ src/lib/auth.ts has Polar plugin with checkout (slug: credits-50, successUrl: /dashboard?purchase=success) and webhooks (onOrderPaid with idempotent credit addition)
5. ✅ src/lib/auth-client.ts has polarClient() plugin enabling authClient.checkout()
6. ✅ src/lib/schema.ts has webhookEvents table with id, type, processedAt, payload
7. ✅ src/components/purchase-credits-button.tsx triggers authClient.checkout on click
8. ✅ Dashboard shows buy button in credits card + processing indicator on ?purchase=success
9. ✅ Insufficient credits dialog triggers Polar checkout (not /pricing link)
10. ✅ Header credit display is clickable and triggers checkout
11. ✅ env.example has POLAR_PRODUCT_ID entry
12. ✅ pnpm run db:push succeeded (webhook_events table created)

## Success Criteria

- ✅ Polar SDK installed and configured with BetterAuth plugin
- ✅ Checkout endpoint available at /api/auth/checkout/credits-50
- ✅ Webhook endpoint available at /api/auth/polar/webhooks
- ✅ onOrderPaid handler adds 50 credits atomically with transaction-based idempotency
- ✅ webhookEvents table prevents duplicate credit additions
- ✅ Buy button appears on dashboard next to credit balance
- ✅ Insufficient credits dialog offers Polar checkout (not dead /pricing link)
- ✅ Header credit count is clickable and initiates checkout
- ✅ Dashboard shows processing indicator after returning from checkout
- ✅ All lint and typecheck pass cleanly

## Integration Points

**Checkout Flow:**
```
User clicks buy button → authClient.checkout({ slug: "credits-50" })
→ Redirects to Polar checkout page
→ User completes payment
→ Polar redirects to /dashboard?purchase=success
→ Dashboard polls for credit update every 3s
→ Webhook arrives → onOrderPaid → credits += 50
→ Poll detects increase → clears URL → done
```

**Idempotency:**
```
Webhook arrives → Check webhookEvents WHERE id = order.id
→ If exists: skip (already processed)
→ If new: INSERT webhook event + UPDATE user credits (atomic transaction)
```

## Files Created

- `/home/ars/poker-ai-review-2026/src/lib/polar.ts` — Polar SDK client with sandbox/production toggle
- `/home/ars/poker-ai-review-2026/src/components/purchase-credits-button.tsx` — Reusable checkout trigger button

## Files Modified

- `/home/ars/poker-ai-review-2026/src/lib/auth.ts` — Added Polar plugin with checkout and webhooks
- `/home/ars/poker-ai-review-2026/src/lib/auth-client.ts` — Added polarClient() plugin
- `/home/ars/poker-ai-review-2026/src/lib/schema.ts` — Added webhookEvents table
- `/home/ars/poker-ai-review-2026/src/app/dashboard/page.tsx` — Added buy button + processing indicator
- `/home/ars/poker-ai-review-2026/src/components/auth/user-profile.tsx` — Made credits clickable
- `/home/ars/poker-ai-review-2026/src/components/upload/insufficient-credits-dialog.tsx` — Wired to Polar checkout
- `/home/ars/poker-ai-review-2026/env.example` — Added POLAR_PRODUCT_ID

## Next Steps

**User Setup Required (before testing):**

1. Create Polar organization at https://sandbox.polar.sh (for development)
2. Generate access token: Organization Settings → Access Tokens → Create token
3. Create product: Products → New Product → "50 Credits", $9.00, one-time payment → Copy product ID
4. Create webhook: Organization Settings → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/auth/polar/webhooks`
   - Events: Check "order.paid"
   - Copy webhook secret
5. Add to .env:
   ```
   POLAR_ACCESS_TOKEN=polar_at_sandbox_...
   POLAR_WEBHOOK_SECRET=polar_wh_...
   POLAR_PRODUCT_ID=prod_...
   ```
6. Test checkout flow:
   - Click buy button → redirects to Polar
   - Use test card: 4242 4242 4242 4242
   - Complete checkout → redirects to dashboard
   - Webhook triggers → credits update

**Testing Checklist:**
- [ ] Dashboard buy button triggers checkout
- [ ] Header credit count click triggers checkout
- [ ] Insufficient credits dialog triggers checkout
- [ ] Polar checkout redirects to /dashboard?purchase=success
- [ ] Processing indicator appears while waiting for webhook
- [ ] Webhook adds exactly 50 credits
- [ ] Duplicate webhook events don't add credits twice
- [ ] Credit balance updates in UI after webhook
- [ ] URL clears after credit update detected

## Self-Check: PASSED

**Files created:**
- ✅ FOUND: /home/ars/poker-ai-review-2026/src/lib/polar.ts
- ✅ FOUND: /home/ars/poker-ai-review-2026/src/components/purchase-credits-button.tsx

**Commits exist:**
- ✅ FOUND: dceb7a7 (Task 1 - Backend integration)
- ✅ FOUND: 33bdfaf (Task 2 - UI integration)

All claimed artifacts verified on disk.

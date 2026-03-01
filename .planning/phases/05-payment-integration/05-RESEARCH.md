# Phase 5: Payment Integration - Research

**Researched:** 2026-02-17
**Domain:** Payment processing, webhook handling, credit fulfillment
**Confidence:** HIGH

## Summary

Phase 5 integrates Polar.sh payment processing with BetterAuth to enable users to purchase 50-credit packs for $9. This phase builds on existing auth infrastructure (BetterAuth) and credit system (database `user.credits` column). The project already has documentation at `docs/technical/betterauth/polar.md` describing the Polar BetterAuth plugin.

The implementation requires: (1) installing Polar packages, (2) configuring BetterAuth with Polar plugin, (3) creating a one-time payment product in Polar dashboard, (4) implementing checkout initiation in UI, (5) building webhook handler to process successful payments and add credits with idempotency protection.

**Primary recommendation:** Use the official `@polar-sh/better-auth` plugin which seamlessly integrates with existing BetterAuth setup. Handle webhook idempotency at database level using Drizzle transactions with conditional updates (same pattern as existing atomic credit deduction in upload route). Store processed webhook IDs to prevent duplicate credit additions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @polar-sh/better-auth | Latest | BetterAuth Polar integration | Official plugin maintained by Polar team, designed for BetterAuth |
| @polar-sh/sdk | Latest | Polar API client | Official SDK for Polar API operations |
| better-auth | 1.4.18+ | Auth foundation | Already installed, Polar plugin extends it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | 0.44.7+ | Database transactions | Already installed, use for idempotent credit updates |
| zod | 4.3.6+ | Webhook payload validation | Already installed, validate incoming webhooks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polar plugin | Manual webhook handling | Plugin provides signature verification, customer sync, and type safety - manual approach increases security risk and maintenance burden |
| Database idempotency | Application-level caching | Database is source of truth, ensures consistency even if app restarts mid-webhook |

**Installation:**
```bash
pnpm add @polar-sh/better-auth @polar-sh/sdk
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth.ts                    # BetterAuth config (add Polar plugin here)
│   └── polar.ts                   # NEW: Polar SDK client instance
├── app/
│   └── api/
│       └── auth/
│           └── [...all]/route.ts  # BetterAuth catch-all (Polar webhooks auto-handled at /api/auth/polar/webhooks)
├── components/
│   └── purchase-credits-button.tsx  # NEW: Client-side checkout trigger
```

### Pattern 1: BetterAuth Polar Plugin Configuration
**What:** Extend BetterAuth server config with Polar plugin for checkout and webhook handling
**When to use:** This is the foundation - configure once during phase setup

**Example:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { polar, checkout, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
  // ... existing config
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true, // Auto-create Polar customer when user registers
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRODUCT_ID!,
              slug: "credits-50", // Use slug for cleaner checkout URLs
            },
          ],
          successUrl: "/dashboard?purchase=success",
          authenticatedUsersOnly: true,
        }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onOrderPaid: async (payload) => {
            // Handle successful payment - add credits
            // Implementation details in webhook handler pattern below
          },
        }),
      ],
    }),
  ],
});
```

**Source:** [Polar BetterAuth Documentation](https://polar.sh/docs/integrate/sdk/adapters/better-auth)

### Pattern 2: Client-Side Checkout Initiation
**What:** Trigger Polar checkout from React component using BetterAuth client
**When to use:** User clicks "Buy Credits" button in UI

**Example:**
```typescript
// src/components/purchase-credits-button.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function PurchaseCreditsButton() {
  const handlePurchase = async () => {
    try {
      // Redirects user to Polar checkout page
      await authClient.checkout({
        slug: "credits-50", // Matches slug from server config
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <Button onClick={handlePurchase}>
      Buy 50 Credits - $9
    </Button>
  );
}
```

**Source:** [Polar BetterAuth Documentation](https://polar.sh/docs/integrate/sdk/adapters/better-auth)

### Pattern 3: Idempotent Webhook Credit Addition
**What:** Process webhook with database-level idempotency to prevent duplicate credit additions
**When to use:** In `onOrderPaid` webhook handler

**Example:**
```typescript
// In auth.ts webhooks config
onOrderPaid: async (payload) => {
  // payload contains: order ID, customer external ID (user ID), amount, etc.

  // Extract user ID from customer.externalId (set by createCustomerOnSignUp)
  const userId = payload.data.customer?.external_id;
  if (!userId) {
    console.error("No user ID in webhook payload");
    return;
  }

  // Store webhook ID to detect duplicates
  const webhookId = payload.id; // Unique ID for this webhook event

  // Use database transaction with conditional logic
  await db.transaction(async (tx) => {
    // Check if this webhook was already processed
    const existing = await tx
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, webhookId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Webhook ${webhookId} already processed, skipping`);
      return; // Idempotent - already processed
    }

    // Record webhook event
    await tx.insert(webhookEvents).values({
      id: webhookId,
      type: "order.paid",
      processedAt: new Date(),
    });

    // Add credits atomically
    await tx
      .update(user)
      .set({ credits: sql`${user.credits} + 50` })
      .where(eq(user.id, userId));
  });

  console.log(`Added 50 credits to user ${userId} from webhook ${webhookId}`);
}
```

**Key insight:** This pattern mirrors the atomic credit deduction in `src/app/api/upload/route.ts` (lines 21-25) but adds webhook tracking for idempotency.

**Source:** Pattern derived from [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) and [Implementing Stripe-like Idempotency Keys in Postgres](https://brandur.org/idempotency-keys)

### Pattern 4: Webhook Event Tracking Schema
**What:** Database table to track processed webhook events
**When to use:** Required for idempotency in webhook handler

**Example:**
```typescript
// src/lib/schema.ts (add to existing schema)
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // Polar webhook ID
  type: text("type").notNull(), // e.g., "order.paid"
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  payload: text("payload"), // Optional: store full payload for debugging
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC validation | Polar plugin built-in validation | Plugin automatically validates signatures using `webhook-id`, `webhook-timestamp`, `webhook-signature` headers - custom implementation risks timing attacks and encoding errors |
| Customer-to-user mapping | Custom database table | Polar `externalId` + `createCustomerOnSignUp` | Polar automatically stores user.id as customer.externalId, eliminating need for mapping table and reducing sync issues |
| Checkout session creation | Manual API calls | BetterAuth client `checkout()` method | Client method handles authentication, customer association, and redirect logic - manual approach requires managing session state and security tokens |
| Idempotency key generation | Custom UUID logic | Webhook event ID from Polar | Polar provides unique webhook ID in payload - reusing it ensures consistency across retries |

**Key insight:** Payment webhooks are security-critical. The Polar plugin handles signature verification automatically. Focus implementation effort on business logic (credit addition) rather than cryptographic validation.

## Common Pitfalls

### Pitfall 1: Forgetting Sandbox vs Production Separation
**What goes wrong:** Using production access token in development, or creating test products in production dashboard
**Why it happens:** Single Polar account has two completely separate environments (sandbox and production)
**How to avoid:**
- Use `server: "sandbox"` in Polar SDK during development
- Create separate access tokens for each environment (production token cannot authenticate sandbox requests)
- Create test products in sandbox dashboard at `sandbox.polar.sh`
- Use test card `4242 4242 4242 4242` in sandbox
**Warning signs:** Webhooks not arriving in development, "invalid token" errors, real charges appearing

**Source:** [Polar Sandbox Documentation](https://polar.sh/docs/integrate/sandbox)

### Pitfall 2: Missing Webhook Idempotency
**What goes wrong:** Duplicate webhook events add credits multiple times (user gets 100 credits for $9 purchase)
**Why it happens:** Webhook providers (including Polar) guarantee "at least once" delivery - retries and failures cause duplicates
**How to avoid:**
- Always check if webhook ID was already processed before adding credits
- Use database transaction to atomically check + record webhook + add credits
- Store webhook event ID in database table, not in-memory cache (survives app restarts)
**Warning signs:** Users reporting incorrect credit balances, credits doubling after purchases, webhook logs showing duplicate IDs

**Source:** Best practices from [Webhook Idempotency Guide](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)

### Pitfall 3: Not Using Atomic Database Operations
**What goes wrong:** Credit addition and webhook tracking happen in separate queries - if app crashes between them, credits are added but webhook isn't marked processed, next retry adds credits again
**Why it happens:** Treating webhook processing as multiple independent operations instead of single atomic transaction
**How to avoid:**
- Wrap all webhook processing in `db.transaction()`
- Include webhook ID check, webhook record insertion, and credit update in same transaction
- If any step fails, entire transaction rolls back (nothing is committed)
**Warning signs:** Duplicate credits appearing after deployment or server restart, inconsistent webhook event records

**Source:** [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions), [Database Transactions & Idempotency](https://www.strv.com/blog/database-transactions-lost-updates-idempotency-engineering)

### Pitfall 4: Webhook Endpoint Not Configured in Polar Dashboard
**What goes wrong:** Purchase completes successfully but credits never appear in user account
**Why it happens:** Polar doesn't know where to send webhook events - webhook configuration is separate from checkout configuration
**How to avoid:**
- After deploying app, configure webhook endpoint in Polar Organization Settings
- Webhook URL: `https://yourdomain.com/api/auth/polar/webhooks` (BetterAuth Polar plugin auto-handles this route)
- Copy webhook secret from Polar dashboard to `POLAR_WEBHOOK_SECRET` env var
- Test webhook delivery using Polar dashboard's "Send test webhook" feature
**Warning signs:** Checkout succeeds but no credits added, webhook handler never logs anything, Polar dashboard shows webhook delivery failures

**Source:** [Polar BetterAuth Documentation](https://www.better-auth.com/docs/plugins/polar)

### Pitfall 5: Missing Environment Variables
**What goes wrong:** App crashes on startup with "undefined" errors, or checkout button does nothing
**Why it happens:** Polar integration requires 3+ environment variables that aren't in `.env.example` yet
**How to avoid:**
- Add to `.env.local` and `.env.example`:
  - `POLAR_ACCESS_TOKEN` - Get from Polar Organization Settings (sandbox or production)
  - `POLAR_WEBHOOK_SECRET` - Get from Polar webhook configuration
  - `POLAR_PRODUCT_ID` - Copy from Polar product page after creating product
- Validate env vars at startup (check they're defined before creating Polar client)
- Use different values for development (sandbox) vs production
**Warning signs:** "Cannot read property 'accessToken' of undefined", checkout redirects to 404, webhook validation fails

## Code Examples

Verified patterns from official sources:

### Polar SDK Client Initialization
```typescript
// src/lib/polar.ts
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});
```
**Source:** [Polar BetterAuth Documentation](https://www.better-auth.com/docs/plugins/polar)

### BetterAuth Client Configuration (Client-Side)
```typescript
// src/lib/auth-client.ts (extend existing config)
import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    polarClient(), // Add Polar client plugin
  ],
});
```
**Source:** [Polar BetterAuth Documentation](https://www.better-auth.com/docs/plugins/polar)

### Webhook Event Tracking Table Migration
```typescript
// After adding webhookEvents table to schema.ts, generate migration:
// pnpm run db:generate

// Example generated migration will include:
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "processed_at" timestamp DEFAULT now() NOT NULL,
  "payload" text
);

CREATE INDEX IF NOT EXISTS "webhook_events_type_idx" ON "webhook_events" ("type");
```
**Source:** Drizzle pattern following existing schema conventions in `src/lib/schema.ts`

### Success Page Query Parameter Handling
```typescript
// src/app/dashboard/page.tsx (or wherever user lands after purchase)
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      toast.success("Purchase successful! Credits added to your account.");
    }
  }, [searchParams]);

  // ... rest of dashboard
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual webhook signature verification | Polar plugin auto-validates | Polar plugin v0.0.1+ (2024) | Eliminates entire class of security vulnerabilities from timing attacks and encoding errors |
| Separate customer database table | Use Polar `externalId` mapping | Polar customer API v1+ | Reduces database complexity and eliminates sync issues between payment provider and app database |
| Application-level webhook deduplication (Redis/cache) | Database transaction with conditional insert | Current best practice (2025+) | Survives app restarts, ensures consistency even during deployments |
| Separate checkout page in app | Redirect to Polar hosted checkout | Polar checkout v1+ | Reduces PCI compliance scope, Polar handles all payment details |

**Deprecated/outdated:**
- Manual Stripe integration: BetterAuth Polar plugin abstracts payment provider complexity
- Customer mapping tables: Polar `externalId` field eliminates need for separate mapping
- Webhook retry queues: Polar handles retries automatically, just implement idempotency

## Open Questions

1. **Should we validate product ID in webhook payload?**
   - What we know: Webhook payload includes product information
   - What's unclear: Whether to validate product ID matches expected value, or trust any product purchase
   - Recommendation: For Phase 5 (single product), validate product ID matches `POLAR_PRODUCT_ID` env var. Reject webhook if product mismatch. Add flexibility for multiple products in future phases.

2. **Should webhook failures send user notifications?**
   - What we know: Webhook might fail after user completes payment (user paid but no credits)
   - What's unclear: How to notify user and support team when webhook processing fails
   - Recommendation: Phase 5 focus is webhook reliability (idempotency, transactions). Add error monitoring (Sentry) and admin alerts in Phase 7 (polish). For now, log errors prominently and consider adding a manual "sync credits" support tool.

3. **Do we need to handle refunds?**
   - What we know: Polar sends `order.refunded` webhook event
   - What's unclear: Requirements don't mention refund handling
   - Recommendation: Phase 5 skip refunds (not in requirements). If needed later, add `onOrderRefunded` handler that deducts credits atomically. Document as future enhancement.

## Sources

### Primary (HIGH confidence)
- [Polar BetterAuth Integration](https://polar.sh/docs/integrate/sdk/adapters/better-auth) - Official integration guide
- [Better Auth Polar Plugin Documentation](https://www.better-auth.com/docs/plugins/polar) - Plugin configuration and API
- [Polar Sandbox Documentation](https://polar.sh/docs/integrate/sandbox) - Environment setup and testing
- [Polar Webhook Events](https://polar.sh/docs/integrate/webhooks/events) - Webhook event types
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) - Transaction API and patterns
- [Polar-Adapters Webhook Source Code](https://github.com/polarsource/polar-adapters/blob/main/packages/polar-betterauth/src/plugins/webhooks.ts) - Webhook handler types
- Existing codebase: `src/app/api/upload/route.ts` (atomic credit deduction pattern), `src/inngest/functions.ts` (atomic credit refund pattern)

### Secondary (MEDIUM confidence)
- [Polar Products Documentation](https://polar.sh/docs/features/products) - One-time payment product creation
- [Implementing Stripe-like Idempotency Keys in Postgres](https://brandur.org/idempotency-keys) - Database idempotency patterns
- [Database Transactions & Idempotency](https://www.strv.com/blog/database-transactions-lost-updates-idempotency-engineering) - Transaction best practices

### Tertiary (LOW confidence)
- [Webhook Idempotency Guide](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) - General webhook patterns (not Polar-specific)
- [Why Idempotency is Important](https://postmarkapp.com/blog/why-idempotency-is-important) - Conceptual overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Polar BetterAuth plugin is documented and maintained by Polar team, package.json shows compatible versions already installed
- Architecture: HIGH - BetterAuth plugin provides clear integration points, webhook handling mirrors existing Inngest patterns in codebase
- Pitfalls: HIGH - Sandbox environment separation and idempotency are well-documented Polar features, transaction patterns verified in Drizzle docs and existing code

**Research date:** 2026-02-17
**Valid until:** ~30 days (stable payment APIs, but Polar is actively developed - verify webhook event schema hasn't changed)

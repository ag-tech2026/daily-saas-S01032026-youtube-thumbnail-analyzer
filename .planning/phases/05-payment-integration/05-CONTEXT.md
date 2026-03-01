# Phase 5: Payment Integration - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can purchase 50-credit packs for $9 via Polar checkout. Webhook handler receives payment confirmation and fulfills credits. Duplicate webhooks are idempotent. This phase covers the buy button placement, Polar integration, webhook processing, and credit fulfillment — not pricing tiers, subscriptions, or transaction history.

</domain>

<decisions>
## Implementation Decisions

### Purchase trigger
- Buy button lives in TWO places: always visible on dashboard next to credit balance, AND in a modal dialog when user tries to upload with 0 credits
- Dashboard: simple "Buy Credits" button positioned next to the credit count (not a full pricing card)
- Zero-credit upload attempt: modal dialog pops up with "Out of credits — Buy 50 for $9" and a buy button linking to Polar checkout
- Header credit display is clickable — tapping the credit count in the header also links to Polar checkout

### Post-purchase flow
- After Polar checkout completes, user is redirected back to dashboard
- No success toast or notification — the updated credit balance speaks for itself
- If webhook hasn't arrived yet when user returns, show a "Purchase processing..." indicator near the balance until credits appear
- No purchase/transaction history for v1 — just show current credit balance

### Claude's Discretion
- Exact button styling and placement within dashboard layout
- "Purchase processing..." indicator design
- Polar product/checkout configuration details
- Webhook signature verification approach

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for Polar integration as documented in the boilerplate.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-payment-integration*
*Context gathered: 2026-02-18*

# Architecture Research

## Overview

This document details the system architecture for the Poker Hand Review AI SaaS, including data flows, component interactions, and suggested build order.

## System Architecture Diagram

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ Auth │  │Upload │
│(Better│  │ API   │
│Auth) │  │       │
└──────┘  └───┬───┘
              │
         ┌────┴────────┐
         │             │
    ┌────▼────┐   ┌────▼─────┐
    │ Vercel  │   │PostgreSQL│
    │  Blob   │   │(Drizzle) │
    └────┬────┘   └────┬─────┘
         │             │
    ┌────▼─────────────▼────┐
    │   Inngest Function    │
    │  (Background Job)     │
    └────┬──────────────────┘
         │
    ┌────▼─────────────┐
    │   OpenRouter     │
    │  (Vision AI)     │
    └──────────────────┘
```

## Data Flow: Upload & Analysis

### Phase 1: Upload Flow

```
User uploads image
      ↓
POST /api/upload
      ↓
1. Validate file type & size
2. Check user credit balance (>= 1)
      ↓
3. Upload to Vercel Blob → get URL
      ↓
4. Create DB record (status: "pending")
      ↓
5. Deduct 1 credit from user balance
      ↓
6. Trigger Inngest event "poker/hand.uploaded"
      ↓
Return analysis ID to client
      ↓
Client polls /api/analysis/[id] for status
```

**Key Implementation Details:**

**Upload API Route** (`src/app/api/upload/route.ts`):
```typescript
export async function POST(req: Request) {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File;

  // 3. Validate file
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // 4. Check credits (ATOMIC TRANSACTION)
  const credits = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, session.user.id),
  });

  if (!credits || credits.balance < 1) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  // 5. Upload to Blob
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `hand-${session.user.id}-${Date.now()}.png`;
  const { url } = await upload(buffer, filename, "screenshots");

  // 6. Create DB record + deduct credit (SAME TRANSACTION)
  const analysisId = nanoid();

  await db.transaction(async (tx) => {
    // Insert analysis
    await tx.insert(analyses).values({
      id: analysisId,
      userId: session.user.id,
      screenshotUrl: url,
      status: "pending",
    });

    // Deduct credit
    await tx.update(userCredits)
      .set({ balance: credits.balance - 1 })
      .where(eq(userCredits.userId, session.user.id));

    // Record transaction
    await tx.insert(creditTransactions).values({
      id: nanoid(),
      userId: session.user.id,
      amount: -1,
      type: "usage",
      analysisId,
    });
  });

  // 7. Trigger Inngest
  await inngest.send({
    name: "poker/hand.uploaded",
    data: { analysisId, userId: session.user.id, screenshotUrl: url },
  });

  return Response.json({ analysisId });
}
```

**Critical Points:**
- Credit deduction MUST happen BEFORE Inngest event (prevent race condition)
- Use database transaction to ensure atomicity
- Store blob URL immediately (don't wait for analysis)
- Return analysis ID so client can poll status

### Phase 2: Analysis Flow (Inngest Background Job)

```
Inngest receives "poker/hand.uploaded" event
      ↓
Step 1: Update status to "processing"
      ↓
Step 2: Fetch image from Blob URL
      ↓
Step 3: Call OpenRouter vision model
      ↓
Step 4: Parse structured response
      ↓
Step 5: Validate required fields
      ↓
Step 6: Save analysis to DB (status: "complete")
      ↓
Done (client polling sees "complete")
```

**Inngest Function** (`src/lib/inngest/functions/analyze-hand.ts`):
```typescript
import { inngest } from "../client";
import { generateObject } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const analysisSchema = z.object({
  // Poker context
  pokerSite: z.string().optional(),
  gameType: z.string().optional(),
  stakes: z.string().optional(),
  position: z.string().optional(),
  heroCards: z.string().optional(),
  boardCards: z.string().optional(),
  potSize: z.number().optional(),
  stackSize: z.number().optional(),

  // Analysis results
  actionAnalysis: z.string(),
  rangeAnalysis: z.string(),
  evCalculation: z.string(),
  verdict: z.string(),
  confidenceScore: z.number().min(0).max(100),
});

export const analyzeHandFunction = inngest.createFunction(
  {
    id: "analyze-poker-hand",
    retries: 2,
  },
  { event: "poker/hand.uploaded" },
  async ({ event, step }) => {
    const { analysisId, screenshotUrl } = event.data;

    // Step 1: Mark as processing
    await step.run("mark-processing", async () => {
      await db.update(analyses)
        .set({ status: "processing" })
        .where(eq(analyses.id, analysisId));
    });

    // Step 2: Analyze with AI
    const result = await step.run("analyze-with-ai", async () => {
      const response = await generateObject({
        model: openrouter(process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o"),
        schema: analysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: POKER_ANALYSIS_PROMPT, // See prompt engineering section
              },
              {
                type: "image",
                image: screenshotUrl,
              },
            ],
          },
        ],
      });

      return response.object;
    });

    // Step 3: Save results
    await step.run("save-analysis", async () => {
      await db.update(analyses)
        .set({
          status: "complete",
          completedAt: new Date(),
          ...result,
          rawResponse: result,
        })
        .where(eq(analyses.id, analysisId));
    });

    return { success: true, analysisId };
  }
);
```

**Error Handling:**
```typescript
// Add to Inngest function config
onFailure: async ({ event, error }) => {
  // Mark as failed
  await db.update(analyses)
    .set({ status: "failed" })
    .where(eq(analyses.id, event.data.analysisId));

  // Refund credit
  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, event.data.analysisId),
  });

  if (analysis) {
    await db.transaction(async (tx) => {
      await tx.update(userCredits)
        .set({ balance: sql`${userCredits.balance} + 1` })
        .where(eq(userCredits.userId, analysis.userId));

      await tx.insert(creditTransactions).values({
        id: nanoid(),
        userId: analysis.userId,
        amount: 1,
        type: "refund",
        analysisId: analysis.id,
      });
    });
  }
},
```

### Phase 3: Status Polling

**Client-Side** (`src/app/dashboard/page.tsx`):
```typescript
"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const pendingAnalyses = analyses.filter(a => a.status === "pending" || a.status === "processing");

      if (pendingAnalyses.length > 0) {
        // Refetch analyses
        const response = await fetch("/api/analyses");
        const data = await response.json();
        setAnalyses(data.analyses);
      } else {
        // No pending analyses, stop polling
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [analyses]);

  // Render list...
}
```

**Alternative: Server-Sent Events (SSE)**
```typescript
// API Route: /api/analysis/[id]/stream
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const analysis = await db.query.analyses.findFirst({
          where: eq(analyses.id, params.id),
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(analysis)}\n\n`));

        if (analysis?.status === "complete" || analysis?.status === "failed") {
          controller.close();
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

## Data Flow: Payment

```
User clicks "Buy Credits" button
      ↓
POST /api/checkout/create
      ↓
1. Create Polar checkout session
2. Return checkout URL
      ↓
Redirect user to Polar checkout page
      ↓
User completes payment
      ↓
Polar sends webhook to /api/webhooks/polar
      ↓
1. Verify webhook signature
2. Check event type === "checkout.completed"
3. Add credits to user account (idempotent)
4. Record transaction
      ↓
User redirected back to app (success page)
      ↓
Client sees updated credit balance
```

**Checkout API** (`src/app/api/checkout/create/route.ts`):
```typescript
import { polar } from "@/lib/polar";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkout = await polar.checkouts.custom.create({
    productId: process.env.POLAR_PRODUCT_ID!,
    customerId: session.user.id,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success`,
    customerEmail: session.user.email,
  });

  return Response.json({ checkoutUrl: checkout.url });
}
```

**Webhook Handler** (`src/app/api/webhooks/polar/route.ts`):
```typescript
import { validateWebhookSignature } from "@polar-sh/sdk/webhooks";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("webhook-signature");

  // 1. Verify signature
  const isValid = validateWebhookSignature({
    payload,
    signature: signature || "",
    secret: process.env.POLAR_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(payload);

  // 2. Handle event
  if (event.type === "checkout.completed") {
    const { customerId, id: orderId } = event.data;

    // 3. Idempotent credit addition
    const existingTransaction = await db.query.creditTransactions.findFirst({
      where: eq(creditTransactions.orderId, orderId),
    });

    if (existingTransaction) {
      console.log(`Order ${orderId} already processed`);
      return Response.json({ ok: true });
    }

    // 4. Add credits
    await db.transaction(async (tx) => {
      await tx
        .insert(userCredits)
        .values({ userId: customerId, balance: 50 })
        .onConflictDoUpdate({
          target: userCredits.userId,
          set: { balance: sql`${userCredits.balance} + 50` },
        });

      await tx.insert(creditTransactions).values({
        id: nanoid(),
        userId: customerId,
        amount: 50,
        type: "purchase",
        orderId,
      });
    });
  }

  return Response.json({ ok: true });
}
```

**Key Points:**
- Webhook handler MUST be idempotent (check for existing transaction)
- Use database transaction for credit addition
- Polar retries webhooks up to 3 times
- Signature verification prevents fraud

## Data Flow: Authentication

### Email/Password Flow

```
User submits registration form
      ↓
POST /api/auth/sign-up
      ↓
1. BetterAuth creates user record
2. Hashes password with bcrypt
3. Creates session
      ↓
Trigger: User created hook
      ↓
Create userCredits record (balance: 3)
      ↓
Return session to client
      ↓
Client redirects to dashboard
```

**User Creation Hook** (`src/lib/auth.ts`):
```typescript
export const auth = betterAuth({
  // ... existing config
  hooks: {
    after: [
      {
        matcher: async (context) => context.path === "/sign-up",
        handler: async (context) => {
          // Give new users 3 free credits
          await db.insert(userCredits).values({
            userId: context.user.id,
            balance: 3,
          });
        },
      },
    ],
  },
});
```

### Google OAuth Flow

```
User clicks "Sign in with Google"
      ↓
GET /api/auth/google/authorize
      ↓
Redirect to Google OAuth consent screen
      ↓
User authorizes app
      ↓
Google redirects to /api/auth/callback/google
      ↓
1. BetterAuth exchanges code for tokens
2. Fetches user profile from Google
3. Creates or finds user record
4. Creates session
      ↓
If new user: Trigger user creation hook (3 free credits)
      ↓
Redirect to dashboard
```

**Client Implementation**:
```typescript
import { signIn } from "@/lib/auth-client";

// Email/password
await signIn.email({
  email: "user@example.com",
  password: "password",
});

// Google OAuth
await signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

## Prompt Engineering: GTO Analysis

**Prompt Template** (`src/lib/prompts/analyze-hand.ts`):
```typescript
export const POKER_ANALYSIS_PROMPT = `
You are a professional poker coach analyzing a screenshot from an online poker game.

TASK: Provide GTO-based analysis of this poker hand in beginner-friendly language.

CONTEXT EXTRACTION:
1. Identify the poker site (PokerStars, GGPoker, 888poker, etc.)
2. Identify the game type (No Limit Hold'em, Pot Limit Omaha, etc.)
3. Identify the stakes (e.g., "NL10" = $0.05/$0.10 blinds)
4. Identify the hero's position (BTN, CO, MP, EP, SB, BB)
5. Identify hero's cards (if visible)
6. Identify board cards (if any)
7. Identify pot size and stack sizes
8. Identify current action (facing a bet, check, etc.)

ANALYSIS REQUIREMENTS:
Provide exactly 4 sections:

1. ACTION ANALYSIS (150-200 words):
   - What action should the hero take? (fold, call, raise, all-in)
   - Why is this the GTO-recommended play?
   - What factors influenced this decision? (pot odds, position, board texture, stack depth)
   - Use beginner language. Avoid jargon like "MDF", "alpha", "node-locking".

2. RANGE ANALYSIS (100-150 words):
   - What hands should be played this way in this spot?
   - Simplify ranges into categories: "strong hands", "medium hands", "draws"
   - Example: "You should raise here with strong pairs (99+), strong aces (AJ+), and suited connectors like JTs"
   - Don't list every hand combination

3. EV CALCULATION (100-150 words):
   - Explain the expected value in simple terms
   - Use percentages and ratios, not complex formulas
   - Example: "Calling here wins about 35% of the time, which is enough to profit given the pot odds"
   - Explain why this action makes money (or loses less)

4. VERDICT (1-2 sentences):
   - Simple summary a beginner can remember
   - Examples: "This is a clear fold." / "Strong raise here." / "Marginal call, but correct."
   - Confidence level: How confident are you in this analysis? (0-100)

TONE:
- Conversational and encouraging
- Like explaining to a friend who's learning poker
- Avoid being condescending or overly technical

OUTPUT FORMAT:
Return JSON with these exact fields:
{
  "pokerSite": "PokerStars" (or null if unclear),
  "gameType": "No Limit Hold'em" (or null),
  "stakes": "NL25" (or null),
  "position": "BTN" (or null),
  "heroCards": "AhKh" (or null if not visible),
  "boardCards": "Ks9h2c" (or null),
  "potSize": 12.50 (or null),
  "stackSize": 25.00 (hero's stack, or null),
  "actionAnalysis": "...",
  "rangeAnalysis": "...",
  "evCalculation": "...",
  "verdict": "...",
  "confidenceScore": 85
}

If you cannot extract specific context (e.g., cards are face-down), set those fields to null and note in your analysis.
`;
```

## Database Schema Relationships

```
users (from BetterAuth)
  ├── 1:1 → userCredits (credit balance)
  ├── 1:N → creditTransactions (transaction history)
  └── 1:N → analyses (hand analyses)

analyses
  ├── N:1 → users (owner)
  └── 1:N → creditTransactions (linked usage transaction)

creditTransactions
  ├── N:1 → users (owner)
  └── N:1 → analyses (optional, for usage type)
```

## Suggested Build Order

### Phase 1: Foundation (Week 1)
1. **Database schema setup**
   - Add tables: userCredits, creditTransactions, analyses
   - Run migrations
   - Test with Drizzle Studio

2. **Google OAuth**
   - Add BetterAuth social provider plugin
   - Configure Google Cloud Console
   - Update auth config
   - Add "Sign in with Google" button
   - Test registration flow

3. **User credits initialization**
   - Add BetterAuth hook for new users
   - Set default 3 credits on registration
   - Query and display credit balance in header

### Phase 2: Upload & Analysis Pipeline (Week 2)
4. **Upload endpoint**
   - Create /api/upload route
   - Validate file type and size
   - Upload to Vercel Blob
   - Check and deduct credits
   - Create analysis record (status: pending)
   - Return analysis ID

5. **Inngest setup**
   - Install Inngest package
   - Create Inngest client
   - Create /api/inngest route
   - Test with Inngest dev server

6. **Analysis function (basic)**
   - Create analyze-hand function
   - Trigger on "poker/hand.uploaded" event
   - Call OpenRouter vision API (simple prompt first)
   - Parse response
   - Save to database
   - Test end-to-end flow

### Phase 3: AI Prompt Engineering (Week 3)
7. **Refine GTO analysis prompt**
   - Test with multiple poker site screenshots
   - Iterate on prompt for accuracy
   - Add structured output schema (Zod)
   - Handle edge cases (unclear cards, etc.)
   - Validate confidence scores

8. **Error handling and refunds**
   - Add Inngest onFailure handler
   - Refund credits on analysis failure
   - Log errors for debugging
   - Add retry logic (Inngest built-in)

### Phase 4: Payments (Week 4)
9. **Polar setup**
   - Create Polar account and product
   - Install @polar-sh/sdk
   - Create checkout endpoint
   - Test checkout flow

10. **Webhook handler**
    - Create /api/webhooks/polar route
    - Verify webhook signatures
    - Add credits on purchase
    - Test with Polar test mode
    - Add idempotency checks

### Phase 5: Frontend (Week 5)
11. **Upload page**
    - Drag-and-drop file input
    - Image preview
    - Upload progress indicator
    - Redirect to analysis page

12. **Analysis detail page**
    - Display screenshot
    - Show analysis sections (action, range, EV, verdict)
    - Status indicators (pending, processing, complete)
    - Polling for status updates

13. **Dashboard / Hand history**
    - List all analyses
    - Filter by status
    - Pagination
    - Click to view detail

### Phase 6: Polish (Week 6)
14. **Visual range display**
    - 13x13 hand matrix component
    - Color-coded based on AI range analysis
    - Tooltips on hover

15. **Credit purchase UI**
    - Low credit warning badge
    - Purchase modal/page
    - Success confirmation
    - Update balance optimistically

16. **Landing page**
    - Hero section with value prop
    - How it works (3 steps)
    - Pricing (free tier + pro pack)
    - CTA: Sign up and get 3 free analyses
    - Example analysis screenshot

### Phase 7: Launch Prep
17. **Testing**
    - Test with 5+ different poker sites
    - Test error scenarios (invalid upload, failed analysis)
    - Test payment flow end-to-end
    - Load testing (Inngest concurrency)

18. **Monitoring**
    - Add error tracking (Sentry)
    - Set up Inngest monitoring dashboard
    - Database query performance (add indexes)
    - API rate limiting

19. **Documentation**
    - User guide: How to take good screenshots
    - FAQ: Common questions
    - Disclaimers: AI approximations, not exact solver
    - Privacy policy and terms

## Deployment

### Environment Setup
- Vercel for Next.js hosting
- Vercel Postgres (or Neon, Supabase) for database
- Vercel Blob for image storage
- Inngest Cloud (free tier: 1M steps/month)
- Polar production mode

### CI/CD
- GitHub Actions for lint and typecheck
- Vercel auto-deploys from main branch
- Database migrations run before build
- Environment variables synced to Vercel

### Monitoring
- Vercel Analytics for page views
- Inngest dashboard for job monitoring
- Sentry for error tracking
- Database slow query logs

## Security Considerations

1. **Authentication**: Session tokens in httpOnly cookies
2. **File Upload**: Validate file type, size, and scan for malicious content
3. **API Rate Limiting**: Prevent abuse of upload and analysis endpoints
4. **Webhook Verification**: Always verify Polar webhook signatures
5. **Database Transactions**: Use for credit operations to prevent race conditions
6. **Environment Variables**: Never commit secrets, use Vercel env vars
7. **CORS**: Restrict API access to app domain only

## Performance Optimization

1. **Image Compression**: Compress images before sending to AI (reduce costs)
2. **Database Indexes**: Add indexes on frequently queried columns (userId, status)
3. **Caching**: Cache common poker scenarios (future optimization)
4. **Concurrent Inngest Jobs**: Set concurrency limit to balance speed and cost
5. **Lazy Loading**: Load hand history images lazily (intersection observer)
6. **Polling Optimization**: Exponential backoff for status polling

## Future Architecture Enhancements

1. **Websockets**: Replace polling with real-time updates (Pusher, Ably)
2. **Caching Layer**: Redis for frequent queries (credit balance, analysis status)
3. **CDN**: Serve screenshots from CDN for faster loading
4. **Multi-Region**: Deploy Inngest workers in multiple regions for speed
5. **Analytics**: Track user behavior (PostHog, Mixpanel)
6. **A/B Testing**: Test different prompts and pricing

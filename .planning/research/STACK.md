# Stack Research

## Overview

This document covers the additional technology stack needed for the Poker Hand Review AI SaaS, building on the existing Next.js 16 boilerplate.

## AI Vision Analysis

### OpenRouter Vision Models

**Primary Model: GPT-4o**
```typescript
import { openrouter } from "@openrouter/ai-sdk-provider";

const model = openrouter("openai/gpt-4o");
```

**Capabilities:**
- Native vision support for screenshot analysis
- Strong OCR capabilities for reading cards and chip amounts
- Good at structured output for poker analysis
- Cost-effective for production use (~$5 per 1M tokens)

**Alternative Models:**
- `anthropic/claude-3.5-sonnet` - Better reasoning, higher cost
- `google/gemini-2.0-flash-thinking-exp:free` - Free tier option for testing
- `openai/gpt-4o-mini` - Lower cost option (~$0.30 per 1M tokens)

**Implementation:**
```typescript
import { generateText } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

const result = await generateText({
  model: openrouter("openai/gpt-4o"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Analyze this poker hand..." },
        { type: "image", image: imageUrl }, // Can be URL or base64
      ],
    },
  ],
});
```

**Key Configuration:**
- Set `OPENROUTER_VISION_MODEL` env var (default: `openai/gpt-4o`)
- Use Vercel AI SDK's `generateObject` for structured output
- Enable JSON mode for consistent parsing

## Background Jobs

### Inngest

**Package:** `inngest@^3.24.0`

**Installation:**
```bash
pnpm add inngest
```

**Setup Files:**

1. **Inngest Client** (`src/lib/inngest/client.ts`):
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "poker-hand-review",
  name: "Poker Hand Review AI",
});
```

2. **API Route** (`src/app/api/inngest/route.ts`):
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeHandFunction } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeHandFunction],
});
```

3. **Function Definition** (`src/lib/inngest/functions/analyze-hand.ts`):
```typescript
import { inngest } from "../client";

export const analyzeHandFunction = inngest.createFunction(
  {
    id: "analyze-poker-hand",
    retries: 2,
    concurrency: {
      limit: 10, // Process 10 analyses in parallel
    },
  },
  { event: "poker/hand.uploaded" },
  async ({ event, step }) => {
    // Step 1: Deduct credit
    await step.run("deduct-credit", async () => {
      // Credit deduction logic
    });

    // Step 2: Analyze with AI
    const analysis = await step.run("analyze-with-ai", async () => {
      // AI analysis logic
    });

    // Step 3: Save results
    await step.run("save-analysis", async () => {
      // Save to database
    });

    return { success: true, analysisId: analysis.id };
  }
);
```

**Why Inngest:**
- Built-in retries with exponential backoff
- Step functions prevent duplicate work on retry
- Visual dashboard for monitoring jobs
- Serverless-friendly (works on Vercel)
- Free tier: 1M steps/month

**Environment Variables:**
```env
INNGEST_EVENT_KEY=  # Get from inngest.com dashboard
INNGEST_SIGNING_KEY=  # For webhook verification
```

## Payments

### Polar SDK

**Package:** `@polar-sh/sdk@^0.17.0`

**Installation:**
```bash
pnpm add @polar-sh/sdk
```

**Setup:**

1. **Polar Client** (`src/lib/polar.ts`):
```typescript
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});
```

2. **Product Configuration:**
- Create product on Polar dashboard: "Pro Pack - 50 Credits"
- Price: $9 USD
- Type: One-time purchase
- Custom field: `credits` = 50

**Implementation:**

```typescript
// Create checkout session
const checkout = await polar.checkouts.custom.create({
  productId: process.env.POLAR_PRODUCT_ID,
  customerId: user.id,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success`,
  customerEmail: user.email,
});

// Webhook handler (src/app/api/webhooks/polar/route.ts)
import { validateWebhookSignature } from "@polar-sh/sdk/webhooks";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("webhook-signature");

  const isValid = validateWebhookSignature({
    payload,
    signature,
    secret: process.env.POLAR_WEBHOOK_SECRET,
  });

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(payload);

  if (event.type === "checkout.completed") {
    // Add credits to user account
    await db.insert(creditTransactions).values({
      userId: event.data.customerId,
      amount: 50,
      type: "purchase",
      orderId: event.data.id,
    });
  }

  return new Response("OK");
}
```

**Environment Variables:**
```env
POLAR_ACCESS_TOKEN=  # API access token
POLAR_PRODUCT_ID=  # Pro Pack product ID
POLAR_WEBHOOK_SECRET=  # Webhook signing secret
```

## Authentication

### BetterAuth Google OAuth

**Package:** Already included in boilerplate

**Setup:**

1. **Install Social Provider Plugin:**
```bash
pnpm add @better-auth/social-providers
```

2. **Update Auth Config** (`src/lib/auth.ts`):
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { google } from "@better-auth/social-providers";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    },
  },
});
```

3. **Client Hook** (`src/lib/auth-client.ts`):
```typescript
import { createAuthClient } from "better-auth/react";
import { googleProvider } from "better-auth/client/social-providers";

export const { signIn, signOut, signUp, useSession, useActiveOrganization } =
  createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [googleProvider()],
  });
```

4. **Google Cloud Console Setup:**
- Create OAuth 2.0 Client ID
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (dev), `https://yourdomain.com/api/auth/callback/google` (prod)
- Enable Google+ API

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

## Database Schema Additions

### Schema Updates (`src/lib/schema.ts`)

```typescript
import { pgTable, text, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { users } from "./schema"; // Existing user table

// Credit balance per user
export const userCredits = pgTable("user_credits", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(3), // Free tier starts with 3
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Credit transaction history
export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Positive for purchase, negative for usage
  type: text("type").notNull(), // "purchase", "usage", "refund"
  orderId: text("order_id"), // Polar order ID for purchases
  analysisId: text("analysis_id"), // Analysis ID for usage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Poker hand analyses
export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Image storage
  screenshotUrl: text("screenshot_url").notNull(),

  // Analysis status
  status: text("status").notNull(), // "pending", "processing", "complete", "failed"

  // Poker context (extracted from image)
  pokerSite: text("poker_site"), // "PokerStars", "GGPoker", etc.
  gameType: text("game_type"), // "No Limit Hold'em", "Pot Limit Omaha"
  stakes: text("stakes"), // "NL10", "NL25", etc.
  position: text("position"), // "BTN", "CO", "BB", etc.

  // Hand details
  heroCards: text("hero_cards"), // "AhKh"
  boardCards: text("board_cards"), // "Ks9h2c"
  potSize: decimal("pot_size", { precision: 10, scale: 2 }),
  stackSize: decimal("stack_size", { precision: 10, scale: 2 }),

  // AI Analysis results
  actionAnalysis: text("action_analysis"), // GTO action recommendation
  rangeAnalysis: text("range_analysis"), // Range breakdown
  evCalculation: text("ev_calculation"), // EV explanation
  verdict: text("verdict"), // Simple verdict for beginners
  confidenceScore: integer("confidence_score"), // 0-100

  // Raw AI response
  rawResponse: jsonb("raw_response"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Indexes for performance
export const analysesUserIdIdx = index("analyses_user_id_idx").on(analyses.userId);
export const analysesStatusIdx = index("analyses_status_idx").on(analyses.status);
export const creditTransactionsUserIdIdx = index("credit_transactions_user_id_idx").on(creditTransactions.userId);
```

### Migrations

After updating schema:
```bash
pnpm db:generate  # Generate migration
pnpm db:migrate   # Apply migration
```

## Package Dependencies Summary

```json
{
  "dependencies": {
    "inngest": "^3.24.0",
    "@polar-sh/sdk": "^0.17.0",
    "@better-auth/social-providers": "^1.1.0"
  }
}
```

## Additional Configuration

### Vercel Blob
Already configured in boilerplate. Used for storing uploaded screenshots.

**Usage:**
```typescript
import { upload } from "@/lib/storage";

// Upload screenshot
const result = await upload(fileBuffer, `hand-${userId}-${Date.now()}.png`, "screenshots");
// result.url can be used directly in OpenRouter vision API
```

### Environment Variables Complete List

```env
# Existing (from boilerplate)
POSTGRES_URL=postgresql://user:password@localhost:5432/poker_ai
BETTER_AUTH_SECRET=32-char-random-string
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=  # For Vercel Blob in production

# New additions
OPENROUTER_VISION_MODEL=openai/gpt-4o
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Development Tools

### Inngest Dev Server
```bash
pnpm dlx inngest-cli@latest dev
```
Runs local Inngest dev server at `http://localhost:8288` for testing functions.

### Drizzle Studio
```bash
pnpm db:studio
```
Visual database browser at `http://localhost:4983`.

### Polar Testing
Use Polar's test mode for development. Test cards provided in Polar dashboard.

## Production Considerations

1. **Rate Limiting**: Add rate limiting to upload endpoint (e.g., `@upstash/ratelimit`)
2. **File Size Limits**: Enforce max 5MB upload size
3. **Image Optimization**: Compress images before sending to AI (reduce costs)
4. **Monitoring**: Add Sentry or similar for error tracking
5. **Caching**: Cache common poker scenarios to reduce AI API calls
6. **Database Indexes**: Ensure indexes on frequently queried columns
7. **Webhook Retries**: Polar webhooks retry up to 3 times, ensure idempotency

# Pitfalls Research

## Overview

This document covers domain-specific pitfalls and gotchas when building a poker hand review AI SaaS, with practical solutions and prevention strategies.

## AI Vision & Image Recognition Pitfalls

### 1. Different Poker Site UI Themes

**Problem:**
Online poker sites have multiple table themes (classic, modern, dark mode, custom skins). The AI may fail to recognize cards, positions, or bet amounts if it's only trained on one theme.

**Examples:**
- PokerStars: Classic, Hypersimple, Aurora, Slick
- GGPoker: Standard, Rush & Cash, All-In or Fold themes
- 888poker: Different table felt colors and card designs

**Impact:**
- AI returns "Unable to identify cards" errors
- Incorrect position detection
- Misread chip amounts (different chip colors)

**Solution:**
1. **Prompt Diversity**: Include examples of different themes in system prompt
   ```typescript
   const prompt = `
   You are analyzing a poker screenshot. The screenshot may be from:
   - PokerStars (various themes: Classic, Aurora, Hypersimple, Slick)
   - GGPoker (standard or Rush & Cash layout)
   - 888poker (multiple felt colors)

   Cards may appear as:
   - Standard 4-color deck (red hearts, blue diamonds)
   - 2-color deck (red/black)
   - Different card back designs

   Look for identifying features:
   - Site logo in corner
   - Button position marker
   - Chat box layout
   - Betting slider style
   `;
   ```

2. **Confidence Scoring**: AI should return low confidence when unsure
   ```typescript
   if (result.confidenceScore < 60) {
     // Flag for manual review or ask user to re-upload
     await db.update(analyses).set({
       status: "needs_review",
       errorMessage: "Low confidence detection. Please upload a clearer screenshot.",
     });
   }
   ```

3. **Test Dataset**: Collect 20+ screenshots from different sites/themes during development
   - Store in `/test-screenshots/` folder
   - Run batch analysis before launch
   - Track accuracy per site/theme

4. **User Guidance**: Provide screenshot guidelines
   - "Use default table theme for best results"
   - "Avoid dark mode or custom skins"
   - Show example of good vs bad screenshot

**Prevention Checklist:**
- [ ] Test with PokerStars Classic, Aurora, Hypersimple themes
- [ ] Test with GGPoker standard and Rush & Cash
- [ ] Test with 888poker multiple felt colors
- [ ] Add confidence score validation
- [ ] Create screenshot guide for users

### 2. Card Recognition Failures

**Problem:**
AI may hallucinate cards or misread suits/ranks, especially when:
- Cards are face-down (hole cards in opponent hands)
- Image is blurry or low resolution
- Cards overlap with UI elements (chat box, player avatars)
- Glare or artifacts in screenshot

**Impact:**
- Analysis based on wrong cards = completely wrong advice
- User trust eroded
- Negative reviews

**Solution:**
1. **Explicit Face-Down Handling**:
   ```typescript
   const prompt = `
   IMPORTANT: If cards are face-down or not clearly visible, set those fields to null.
   Do NOT guess or hallucinate card values.

   If hero's hole cards are face-down, analysis should focus on position and action only.
   `;
   ```

2. **Validation Layer**:
   ```typescript
   // After AI response
   const isValidHand = (cards: string | null) => {
     if (!cards) return true; // Null is valid

     // Check format: "AhKh" (rank + suit + rank + suit)
     const regex = /^([AKQJT2-9])(h|d|c|s)([AKQJT2-9])(h|d|c|s)$/;
     return regex.test(cards);
   };

   if (result.heroCards && !isValidHand(result.heroCards)) {
     // Flag as suspicious
     result.confidenceScore = Math.min(result.confidenceScore, 40);
   }
   ```

3. **Board Card Validation**:
   ```typescript
   const isValidBoard = (board: string | null) => {
     if (!board) return true;

     // Board can be: "Ks9h2c" (flop) or "Ks9h2cTd" (turn) or "Ks9h2cTd5h" (river)
     const regex = /^([AKQJT2-9][hdcs]){3,5}$/;
     return regex.test(board);
   };
   ```

4. **Image Quality Check**:
   ```typescript
   // Before uploading to AI
   import sharp from "sharp";

   const metadata = await sharp(buffer).metadata();

   if (metadata.width < 800 || metadata.height < 600) {
     return Response.json({
       error: "Image resolution too low. Minimum 800x600 pixels required.",
     }, { status: 400 });
   }
   ```

**Prevention Checklist:**
- [ ] Add card format validation regex
- [ ] Handle null cards gracefully in prompt
- [ ] Check image resolution before upload
- [ ] Display "Cards unclear" message to user
- [ ] Add re-upload option with tips

### 3. OCR Errors on Chip Amounts

**Problem:**
Reading bet sizes, pot sizes, and stack sizes is critical for EV calculations, but OCR on dynamic text (chips with commas, decimals, currency symbols) is error-prone.

**Examples of OCR failures:**
- "$1,234" read as "$1234" or "$l,234" (l instead of 1)
- "€50.00" read as "E50.00" or "€S0.00"
- Small fonts in tournament lobbies
- Animated chip stacks

**Impact:**
- Incorrect pot odds calculations
- Wrong EV analysis
- Bad advice (e.g., "call with 2:1 pot odds" when it's actually 10:1)

**Solution:**
1. **Structured Output with Optional Amounts**:
   ```typescript
   const schema = z.object({
     potSize: z.number().nullable(),
     stackSize: z.number().nullable(),
     betToCall: z.number().nullable(),
     // ... other fields
   });
   ```

2. **Sanity Check Chip Amounts**:
   ```typescript
   // After AI response
   if (result.potSize && result.stackSize) {
     // Pot shouldn't be larger than combined stacks
     if (result.potSize > result.stackSize * 10) {
       console.warn("Suspicious pot size detected");
       result.potSize = null; // Discard unreliable data
     }
   }
   ```

3. **Fallback to Qualitative Analysis**:
   ```typescript
   const prompt = `
   If chip amounts are unclear or unreadable, describe the situation qualitatively:
   - "Small pot" vs "Large pot"
   - "Deep stacked" vs "Short stacked"
   - Focus on relative stack sizes, not exact numbers
   `;
   ```

4. **User Confirmation**:
   ```typescript
   // In UI, allow user to correct amounts
   <div>
     <p>AI detected pot size: ${potSize}</p>
     <button>Correct</button>
   </div>
   ```

**Prevention Checklist:**
- [ ] Make chip amounts optional (nullable)
- [ ] Add sanity checks for unrealistic values
- [ ] Prompt AI to use qualitative descriptions as fallback
- [ ] Allow user to edit detected amounts
- [ ] Display "Amounts unclear" warning

## AI Hallucination Pitfalls

### 4. Hallucinated Analysis Fields

**Problem:**
AI may fabricate analysis details to fill required fields, especially when the image doesn't contain enough information.

**Examples:**
- Inventing position when not visible
- Making up opponent hand ranges without context
- Providing confident EV calculations with missing data
- Claiming high confidence score despite unclear image

**Impact:**
- Users receive confident but completely wrong advice
- Damages credibility
- Potential financial loss for users

**Solution:**
1. **Required vs Optional Fields**:
   ```typescript
   const schema = z.object({
     // Always required (AI must generate these)
     actionAnalysis: z.string().min(100),
     verdict: z.string().min(10),
     confidenceScore: z.number(),

     // Optional (can be null if unclear)
     pokerSite: z.string().nullable(),
     position: z.string().nullable(),
     heroCards: z.string().nullable(),
     potSize: z.number().nullable(),

     // Required if visible, but can be marked "unclear"
     rangeAnalysis: z.string(),
     evCalculation: z.string(),
   });
   ```

2. **Explicit "Don't Hallucinate" Instructions**:
   ```typescript
   const prompt = `
   CRITICAL RULES:
   1. If information is not visible in the screenshot, set it to null
   2. Never guess or make up data
   3. If you cannot provide accurate analysis due to missing information, say so explicitly
   4. Lower your confidence score if key information is missing

   Examples of acceptable responses:
   - "Position is unclear from this screenshot, but assuming BTN..."
   - "Cannot determine exact pot odds without visible bet sizes"
   - "Hero's cards are face-down, so analysis is based on position only"
   `;
   ```

3. **Validation After Response**:
   ```typescript
   const validateAnalysis = (analysis: Analysis) => {
     const issues: string[] = [];

     // Check for suspiciously confident analysis with missing data
     if (analysis.confidenceScore > 80 && !analysis.heroCards && !analysis.boardCards) {
       issues.push("High confidence despite no visible cards");
     }

     // Check for EV calculation without pot size
     if (analysis.evCalculation.includes("pot odds") && !analysis.potSize) {
       issues.push("EV calculation references pot odds but no pot size detected");
     }

     // Check for range analysis without position
     if (analysis.rangeAnalysis.length > 0 && !analysis.position) {
       issues.push("Range analysis without known position");
     }

     return issues;
   };
   ```

4. **Confidence Calibration**:
   ```typescript
   // Adjust confidence based on missing data
   let adjustedConfidence = result.confidenceScore;

   if (!result.heroCards) adjustedConfidence -= 20;
   if (!result.position) adjustedConfidence -= 15;
   if (!result.potSize) adjustedConfidence -= 10;

   result.confidenceScore = Math.max(0, adjustedConfidence);
   ```

**Prevention Checklist:**
- [ ] Make most fields optional/nullable
- [ ] Add explicit "don't hallucinate" rules in prompt
- [ ] Validate analysis logic against available data
- [ ] Display "Limited information" warnings to users
- [ ] Show which fields are missing in UI

## Credit System Pitfalls

### 5. Credit Deduction Race Conditions

**Problem:**
Multiple concurrent requests or retry logic can cause:
- User uploads 2 hands simultaneously, both deduct credits before checking balance
- Inngest retry deducts credits twice for same analysis
- User refreshes upload page, triggers duplicate deduction

**Impact:**
- Users lose credits unfairly
- Negative balance (should never happen)
- Refund requests and support burden

**Solution:**
1. **Atomic Credit Check + Deduction**:
   ```typescript
   // WRONG: Check then deduct (race condition)
   const credits = await getCredits(userId);
   if (credits.balance >= 1) {
     await deductCredit(userId); // Another request could run between these
   }

   // CORRECT: Atomic transaction
   const result = await db.transaction(async (tx) => {
     const credits = await tx.query.userCredits.findFirst({
       where: eq(userCredits.userId, userId),
       for: "update", // Row-level lock
     });

     if (!credits || credits.balance < 1) {
       throw new Error("Insufficient credits");
     }

     await tx.update(userCredits)
       .set({ balance: credits.balance - 1 })
       .where(eq(userCredits.userId, userId));

     return { success: true };
   });
   ```

2. **Idempotent Analysis Creation**:
   ```typescript
   // Use unique ID generated client-side
   const analysisId = req.headers.get("x-idempotency-key") || nanoid();

   await db.transaction(async (tx) => {
     // Try to insert, ignore if already exists
     const existing = await tx.query.analyses.findFirst({
       where: eq(analyses.id, analysisId),
     });

     if (existing) {
       return { analysisId: existing.id, duplicate: true };
     }

     // Create new analysis + deduct credit
     await tx.insert(analyses).values({ id: analysisId, ... });
     await tx.update(userCredits).set({ balance: sql`${userCredits.balance} - 1` });
   });
   ```

3. **Client-Side Debouncing**:
   ```typescript
   // Prevent rapid-fire uploads
   const [isUploading, setIsUploading] = useState(false);

   const handleUpload = async (file: File) => {
     if (isUploading) return; // Ignore duplicate clicks

     setIsUploading(true);
     try {
       await uploadFile(file);
     } finally {
       setIsUploading(false);
     }
   };
   ```

4. **Database Constraint**:
   ```typescript
   // Add check constraint to prevent negative balance
   export const userCredits = pgTable("user_credits", {
     userId: text("user_id").primaryKey(),
     balance: integer("balance").notNull().default(3),
   }, (table) => ({
     positiveBalance: check("positive_balance", sql`${table.balance} >= 0`),
   }));
   ```

**Prevention Checklist:**
- [ ] Use database transactions for credit operations
- [ ] Add row-level locking (for update)
- [ ] Implement idempotency keys
- [ ] Add check constraint for non-negative balance
- [ ] Debounce upload button client-side

### 6. Inngest Retry Causing Double-Deduction

**Problem:**
Inngest automatically retries failed functions. If credit deduction happens inside the function (not before triggering), retries can deduct credits multiple times.

**Impact:**
- User loses 2-3 credits for one analysis
- Analysis may succeed on retry, but user was charged twice

**Solution:**
1. **Deduct BEFORE Inngest Event**:
   ```typescript
   // WRONG: Deduct inside Inngest function
   export const analyzeHandFunction = inngest.createFunction(
     { id: "analyze-poker-hand", retries: 2 },
     { event: "poker/hand.uploaded" },
     async ({ event }) => {
       await deductCredit(event.data.userId); // This runs on every retry!
       await analyzeWithAI(event.data.screenshotUrl);
     }
   );

   // CORRECT: Deduct before sending event
   // In /api/upload route:
   await db.transaction(async (tx) => {
     await createAnalysis(tx, { ... });
     await deductCredit(tx, userId); // Deducted once, before Inngest
   });

   await inngest.send({
     name: "poker/hand.uploaded",
     data: { analysisId, screenshotUrl }, // No credit deduction in event
   });
   ```

2. **Idempotent Transaction Tracking**:
   ```typescript
   // Record credit transaction with unique ID
   await db.insert(creditTransactions).values({
     id: `analysis-${analysisId}`, // Deterministic ID
     userId,
     amount: -1,
     type: "usage",
     analysisId,
   });

   // If retry happens, this will fail due to unique constraint (good!)
   ```

3. **Refund on Failure**:
   ```typescript
   export const analyzeHandFunction = inngest.createFunction(
     {
       id: "analyze-poker-hand",
       retries: 2,
       onFailure: async ({ event }) => {
         // Refund credit on final failure
         await db.transaction(async (tx) => {
           await tx.update(userCredits)
             .set({ balance: sql`${userCredits.balance} + 1` })
             .where(eq(userCredits.userId, event.data.userId));

           await tx.insert(creditTransactions).values({
             id: nanoid(),
             userId: event.data.userId,
             amount: 1,
             type: "refund",
             analysisId: event.data.analysisId,
           });
         });
       },
     },
     { event: "poker/hand.uploaded" },
     async ({ event }) => {
       // No credit deduction here
       await analyzeWithAI(event.data.screenshotUrl);
     }
   );
   ```

**Prevention Checklist:**
- [ ] Deduct credits BEFORE triggering Inngest
- [ ] Never deduct inside Inngest function
- [ ] Use deterministic transaction IDs
- [ ] Add refund logic to onFailure hook
- [ ] Test retry scenarios in dev

## File Upload Pitfalls

### 7. Large Image Uploads Blocking Requests

**Problem:**
Users uploading 5MB screenshots can block server resources, especially on serverless platforms with memory limits.

**Impact:**
- Slow upload times
- Serverless function timeouts (Vercel: 10s hobby, 60s pro)
- High bandwidth costs
- Poor UX

**Solution:**
1. **Client-Side Compression**:
   ```typescript
   // Before uploading
   import imageCompression from "browser-image-compression";

   const compressImage = async (file: File) => {
     const options = {
       maxSizeMB: 1, // Max 1MB
       maxWidthOrHeight: 1920, // Max dimension
       useWebWorker: true,
     };

     return await imageCompression(file, options);
   };

   // In upload handler
   const compressedFile = await compressImage(file);
   // Upload compressedFile instead of original
   ```

2. **Pre-Upload Validation**:
   ```typescript
   // Client-side check before API call
   if (file.size > 5 * 1024 * 1024) {
     alert("File too large. Maximum 5MB allowed.");
     return;
   }

   const validTypes = ["image/png", "image/jpeg", "image/jpg"];
   if (!validTypes.includes(file.type)) {
     alert("Invalid file type. Please upload PNG or JPEG.");
     return;
   }
   ```

3. **Streaming Upload** (for large files):
   ```typescript
   // Use Vercel Blob's direct upload (client → blob, skip server)
   import { upload } from "@vercel/blob/client";

   const blob = await upload(file, {
     access: "public",
     handleUploadUrl: "/api/upload/blob", // Returns signed URL
   });

   // Then create analysis with blob.url
   await fetch("/api/analysis/create", {
     method: "POST",
     body: JSON.stringify({ screenshotUrl: blob.url }),
   });
   ```

4. **Server-Side Size Limit**:
   ```typescript
   // In API route
   export async function POST(req: Request) {
     const contentLength = req.headers.get("content-length");

     if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
       return Response.json({ error: "File too large" }, { status: 413 });
     }

     // Process upload...
   }
   ```

**Prevention Checklist:**
- [ ] Compress images client-side before upload
- [ ] Validate file size/type in browser
- [ ] Use direct Vercel Blob upload for large files
- [ ] Set server-side size limits
- [ ] Display upload progress bar

## GTO Analysis Accuracy Pitfalls

### 8. AI Approximating, Not Solving

**Problem:**
Users may expect exact GTO solver output (like PioSolver, GTO+), but AI is approximating based on training data. Results may differ from actual solver outputs.

**Impact:**
- Advanced players complain about "incorrect" advice
- Reddit threads debating accuracy
- Trust issues

**Solution:**
1. **Clear Disclaimers**:
   ```typescript
   // In analysis UI
   <Alert>
     <AlertTitle>AI-Generated Analysis</AlertTitle>
     <AlertDescription>
       This analysis is AI-generated based on GTO principles, not from a poker solver.
       For exact solver outputs, use dedicated tools like PioSolver or GTO+.
     </AlertDescription>
   </Alert>
   ```

2. **Target Audience Messaging**:
   ```typescript
   // On landing page
   <p>
     Perfect for <strong>beginner to intermediate players</strong> looking to improve.
     Not a replacement for professional solver software.
   </p>
   ```

3. **Confidence Scores Visible**:
   ```typescript
   // Show AI confidence to set expectations
   <div>
     <p>Verdict: {verdict}</p>
     <p className="text-muted-foreground text-sm">
       Confidence: {confidenceScore}%
     </p>
   </div>
   ```

4. **Educational Framing**:
   ```typescript
   // Frame as learning tool, not absolute truth
   const prompt = `
   You are a poker coach helping a student learn GTO principles.
   Provide advice that aligns with GTO strategy, but explain the reasoning
   so the student understands WHY, not just WHAT to do.

   This is educational guidance, not exact solver output.
   `;
   ```

**Prevention Checklist:**
- [ ] Add disclaimer on every analysis page
- [ ] Mention "beginner-friendly" in marketing
- [ ] Show confidence scores
- [ ] Avoid claiming "exact GTO" in copy
- [ ] Add FAQ explaining AI vs solver

### 9. Context Missing from Screenshots

**Problem:**
A single screenshot doesn't show:
- Opponent tendencies (tight, loose, aggressive)
- Previous hands in session
- Table dynamics
- Opponent stack sizes (if not visible)

**Impact:**
- Analysis may be "textbook GTO" but wrong for the specific opponent
- Users say "but this player always folds to 3-bets!"

**Solution:**
1. **Acknowledge Limitations**:
   ```typescript
   const prompt = `
   NOTE: This analysis is based solely on the current hand screenshot.
   It does not account for:
   - Opponent tendencies (tight/loose, passive/aggressive)
   - Table history or reads
   - ICM considerations (in tournaments)

   Advice is based on GTO strategy against unknown opponents.
   Adjust based on your specific reads.
   `;
   ```

2. **Add Context Field (Future)**:
   ```typescript
   // Allow users to add notes (v2 feature)
   <textarea placeholder="Add context (e.g., 'Opponent is very tight')">

   // Pass to AI prompt
   const prompt = `
   User notes: ${userContext}

   Adjust analysis if user notes indicate specific opponent tendencies.
   `;
   ```

3. **General vs Exploitative Advice**:
   ```typescript
   // In analysis
   <div>
     <h3>GTO Baseline (vs unknown opponent)</h3>
     <p>{actionAnalysis}</p>

     <h3>Exploitative Adjustments</h3>
     <ul>
       <li>If opponent is tight: {tightAdjustment}</li>
       <li>If opponent is loose: {looseAdjustment}</li>
     </ul>
   </div>
   ```

**Prevention Checklist:**
- [ ] Mention "vs unknown opponent" in analysis
- [ ] Add FAQ explaining limitations
- [ ] Consider adding optional context field (v2)
- [ ] Provide exploitative adjustment tips

## Polar Webhook Pitfalls

### 10. Webhook Signature Verification

**Problem:**
Webhooks can be spoofed by attackers to add credits without payment.

**Impact:**
- Fraudulent credit additions
- Financial loss

**Solution:**
1. **Always Verify Signature**:
   ```typescript
   import { validateWebhookSignature } from "@polar-sh/sdk/webhooks";

   export async function POST(req: Request) {
     const payload = await req.text();
     const signature = req.headers.get("webhook-signature");

     const isValid = validateWebhookSignature({
       payload,
       signature: signature || "",
       secret: process.env.POLAR_WEBHOOK_SECRET!,
     });

     if (!isValid) {
       console.error("Invalid webhook signature");
       return new Response("Unauthorized", { status: 401 });
     }

     // Process event...
   }
   ```

2. **Environment Variable Security**:
   ```bash
   # Never commit webhook secret
   # Use Vercel env vars or .env.local
   POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

**Prevention Checklist:**
- [ ] Verify all webhook signatures
- [ ] Never skip verification in production
- [ ] Log failed verification attempts
- [ ] Use environment variables for secrets

### 11. Duplicate Webhook Events

**Problem:**
Polar (and most webhook providers) retry failed webhook deliveries. If your handler doesn't track processed events, credits can be added multiple times.

**Impact:**
- User receives 100 credits instead of 50 (2x retry)
- Financial loss for business

**Solution:**
1. **Idempotency Check**:
   ```typescript
   export async function POST(req: Request) {
     // ... verify signature ...

     const event = JSON.parse(payload);

     if (event.type === "checkout.completed") {
       const orderId = event.data.id;

       // Check if already processed
       const existing = await db.query.creditTransactions.findFirst({
         where: eq(creditTransactions.orderId, orderId),
       });

       if (existing) {
         console.log(`Order ${orderId} already processed`);
         return Response.json({ ok: true }); // Return 200 to stop retries
       }

       // Process payment...
     }
   }
   ```

2. **Database Unique Constraint**:
   ```typescript
   export const creditTransactions = pgTable("credit_transactions", {
     id: text("id").primaryKey(),
     orderId: text("order_id").unique(), // Prevent duplicate orders
     // ... other fields
   });
   ```

3. **Use Database Transaction**:
   ```typescript
   await db.transaction(async (tx) => {
     // Try to insert transaction first
     try {
       await tx.insert(creditTransactions).values({
         id: nanoid(),
         userId: customerId,
         orderId, // Unique constraint will fail on duplicate
         amount: 50,
         type: "purchase",
       });
     } catch (err) {
       if (err.code === "23505") { // Postgres unique violation
         console.log("Duplicate order, ignoring");
         return;
       }
       throw err;
     }

     // Add credits
     await tx.update(userCredits)
       .set({ balance: sql`${userCredits.balance} + 50` })
       .where(eq(userCredits.userId, customerId));
   });
   ```

**Prevention Checklist:**
- [ ] Check for existing order ID before processing
- [ ] Add unique constraint on orderId
- [ ] Use database transaction
- [ ] Always return 200 OK to prevent retries

## Production Deployment Pitfalls

### 12. Inngest Event Key in Production

**Problem:**
Using development Inngest event key in production means events go to dev dashboard, not production.

**Impact:**
- Analyses never process in production
- Events disappear

**Solution:**
1. **Separate Dev and Prod Keys**:
   ```bash
   # .env.local (dev)
   INNGEST_EVENT_KEY=dev_xxxxx
   INNGEST_SIGNING_KEY=signkey_dev_xxxxx

   # Vercel env vars (prod)
   INNGEST_EVENT_KEY=prod_xxxxx
   INNGEST_SIGNING_KEY=signkey_prod_xxxxx
   ```

2. **Verify in Code**:
   ```typescript
   // Log environment on startup
   console.log("Inngest environment:", process.env.NODE_ENV);
   console.log("Inngest key prefix:", process.env.INNGEST_EVENT_KEY?.slice(0, 10));
   ```

**Prevention Checklist:**
- [ ] Use different Inngest keys for dev/prod
- [ ] Set Vercel env vars correctly
- [ ] Test webhook delivery in production
- [ ] Monitor Inngest dashboard after deploy

### 13. Database Migration Rollback

**Problem:**
Running new migrations in production without backup can cause data loss if migration fails.

**Impact:**
- Downtime
- Data loss
- Rollback difficulty

**Solution:**
1. **Test Migrations Locally**:
   ```bash
   # Always test on local DB first
   pnpm db:generate
   pnpm db:migrate
   pnpm db:studio # Verify changes
   ```

2. **Backup Before Migration**:
   ```bash
   # Vercel Postgres auto-backups (enable in dashboard)
   # Or manual backup:
   pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql
   ```

3. **Staged Rollout**:
   ```bash
   # Deploy to preview branch first
   git push origin feature-branch
   # Test on Vercel preview deployment
   # Then merge to main
   ```

**Prevention Checklist:**
- [ ] Test all migrations locally first
- [ ] Enable auto-backups on database
- [ ] Use preview deployments
- [ ] Have rollback plan ready

### 14. OpenRouter Rate Limits

**Problem:**
Hitting OpenRouter rate limits during peak usage causes analysis failures.

**Impact:**
- Users lose credits but get no analysis
- Angry support tickets

**Solution:**
1. **Handle Rate Limit Errors**:
   ```typescript
   try {
     const result = await generateObject({ ... });
   } catch (err) {
     if (err.status === 429) {
       // Rate limited - retry with exponential backoff
       throw new Error("Rate limited"); // Inngest will retry
     }
     throw err;
   }
   ```

2. **Inngest Concurrency Limit**:
   ```typescript
   export const analyzeHandFunction = inngest.createFunction(
     {
       id: "analyze-poker-hand",
       concurrency: {
         limit: 10, // Max 10 concurrent AI calls
       },
     },
     { event: "poker/hand.uploaded" },
     async ({ event }) => { ... }
   );
   ```

3. **OpenRouter Account Limits**:
   - Check OpenRouter dashboard for rate limits
   - Upgrade plan if needed
   - Monitor usage graphs

**Prevention Checklist:**
- [ ] Handle 429 errors gracefully
- [ ] Set Inngest concurrency limits
- [ ] Monitor OpenRouter usage
- [ ] Add rate limit alerts

## User Experience Pitfalls

### 15. No Feedback During Processing

**Problem:**
User uploads screenshot and sees no progress indicator for 30 seconds. They think it failed and upload again (wasting credits).

**Impact:**
- User frustration
- Duplicate uploads
- Wasted credits

**Solution:**
1. **Immediate Feedback**:
   ```typescript
   // After upload succeeds
   <div>
     <Spinner />
     <p>Analyzing your hand... This usually takes 10-30 seconds.</p>
     <Progress value={estimatedProgress} />
   </div>
   ```

2. **Status Polling with Messages**:
   ```typescript
   const statusMessages = {
     pending: "Queued for analysis...",
     processing: "AI is analyzing your hand...",
     complete: "Analysis complete!",
     failed: "Analysis failed. Credit refunded.",
   };

   <p>{statusMessages[analysis.status]}</p>
   ```

3. **Estimated Time**:
   ```typescript
   // Track average completion time
   const avgTime = await db
     .select({ avg: avg(sql`EXTRACT(EPOCH FROM (completed_at - created_at))`) })
     .from(analyses)
     .where(eq(analyses.status, "complete"));

   <p>Estimated time: {Math.round(avgTime)} seconds</p>
   ```

**Prevention Checklist:**
- [ ] Show spinner immediately after upload
- [ ] Display estimated time
- [ ] Poll for status updates
- [ ] Show progress messages

### 16. No Screenshot Guidelines

**Problem:**
Users upload screenshots that are too zoomed in, cropped, or from wrong screen (lobby instead of table).

**Impact:**
- Low confidence analysis
- User dissatisfaction
- Wasted credits

**Solution:**
1. **Screenshot Guide Page**:
   ```typescript
   // /how-to-screenshot page
   <div>
     <h2>How to Take Good Screenshots</h2>

     <div>
       <h3>✅ Good Screenshot</h3>
       <img src="/examples/good-screenshot.png" />
       <ul>
         <li>Full table visible</li>
         <li>Hero cards clearly shown</li>
         <li>Board cards visible (if any)</li>
         <li>Pot size and stacks readable</li>
       </ul>
     </div>

     <div>
       <h3>❌ Bad Screenshot</h3>
       <img src="/examples/bad-screenshot.png" />
       <ul>
         <li>Cropped too much</li>
         <li>Blurry or low resolution</li>
         <li>Cards face-down</li>
       </ul>
     </div>
   </div>
   ```

2. **Upload Page Tips**:
   ```typescript
   <div className="mb-4 rounded-lg bg-blue-50 p-4">
     <p className="text-sm">
       <strong>Tips for best results:</strong>
     </p>
     <ul className="text-sm">
       <li>Include full table view</li>
       <li>Make sure your cards are face-up</li>
       <li>Use default table theme (not dark mode)</li>
       <li>Minimum 800x600 resolution</li>
     </ul>
     <a href="/how-to-screenshot" className="text-blue-600">
       See examples →
     </a>
   </div>
   ```

**Prevention Checklist:**
- [ ] Create screenshot guide page
- [ ] Show tips on upload page
- [ ] Include example images
- [ ] Link from onboarding flow

## Testing Checklist Before Launch

### Pre-Launch Testing

- [ ] Test with 10+ different poker sites/themes
- [ ] Test invalid uploads (wrong file type, too large, corrupted)
- [ ] Test credit system (deduction, refund, purchase)
- [ ] Test Polar webhook (use test mode)
- [ ] Test Inngest retry scenarios (kill function mid-execution)
- [ ] Test concurrent uploads (simulate race conditions)
- [ ] Load test (10+ simultaneous uploads)
- [ ] Test Google OAuth flow (new user + existing user)
- [ ] Test all error states in UI
- [ ] Verify no secrets in git history
- [ ] Check rate limits (OpenRouter, Vercel, database)
- [ ] Test on mobile devices (upload from phone)
- [ ] Verify analytics/monitoring setup
- [ ] Test email notifications (if any)
- [ ] Security audit (OWASP top 10)

### Post-Launch Monitoring

- [ ] Monitor Inngest dashboard (success rate, avg duration)
- [ ] Monitor OpenRouter usage (tokens, cost)
- [ ] Monitor database performance (slow queries)
- [ ] Monitor error rates (Sentry)
- [ ] Monitor user feedback (support tickets, reviews)
- [ ] Track conversion rate (free to paid)
- [ ] Track credit usage patterns (fraud detection)
- [ ] Monitor Polar webhooks (success rate)

## Emergency Response Procedures

### If Analysis Pipeline Breaks

1. Pause new uploads (feature flag)
2. Check Inngest dashboard for errors
3. Check OpenRouter status page
4. Refund credits for failed analyses
5. Fix issue, test locally
6. Deploy fix
7. Resume uploads

### If Webhook Fails

1. Check Polar webhook logs
2. Verify webhook signature secret is correct
3. Manually add credits for affected users (query Polar API)
4. Deploy fix
5. Ask Polar to resend failed webhooks

### If Database Issues

1. Check Vercel Postgres status
2. Identify slow queries
3. Add missing indexes
4. Scale database if needed
5. Consider read replicas for heavy queries

## Conclusion

Most of these pitfalls can be prevented with:
1. Comprehensive testing (especially edge cases)
2. Idempotent operations (retries are safe)
3. Database transactions (atomicity)
4. Clear user communication (disclaimers, guides)
5. Monitoring and alerts (catch issues early)

Focus on the "credit system" and "AI vision" pitfalls first - these have the highest impact on user experience and trust.

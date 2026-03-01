# Features Research

## Overview

This document categorizes features for the Poker Hand Review AI SaaS into table stakes (must-have), differentiators (competitive advantages), and anti-features (explicitly excluded).

## Table Stakes (Must Have)

These are the minimum viable features required for the product to function.

### 1. User Authentication

**What:**
- Email/password registration and login
- Google OAuth sign-in
- Password reset flow
- Session management

**Why:**
- Required to track user credits and hand history
- Industry standard expectation for SaaS

**Implementation:**
- BetterAuth with email/password + Google social provider
- Protected routes for dashboard, profile, hand history
- Sign-in/sign-up forms from boilerplate

**User Stories:**
- As a new user, I can create an account with my email or Google
- As a returning user, I can log in to access my hand history
- As a user, I can reset my password if I forget it

### 2. Screenshot Upload

**What:**
- Drag-and-drop or click-to-upload interface
- File type validation (PNG, JPG, JPEG)
- File size limit (max 5MB)
- Upload progress indicator
- Preview uploaded image before analysis

**Why:**
- Core input mechanism for the entire product
- Users need confidence their screenshot was received

**Implementation:**
- File input with client-side validation
- Upload to Vercel Blob storage
- Store blob URL in database
- Show preview thumbnail

**User Stories:**
- As a user, I can drag-and-drop a screenshot to upload it
- As a user, I see an error if I upload an invalid file type
- As a user, I see my screenshot preview before confirming analysis

### 3. AI GTO Analysis

**What:**
- Action Analysis: What action to take (fold, call, raise, all-in) with reasoning
- Range Analysis: What hands to play in this spot (simplified ranges)
- EV Calculation: Expected value explanation in beginner terms
- Simple Verdict: One-sentence summary ("This is a clear fold" or "Strong raise here")

**Why:**
- Core value proposition of the product
- Differentiates from free poker forums/Discord help

**Implementation:**
- OpenRouter vision model (GPT-4o) analyzes screenshot
- Structured prompt for GTO-based recommendations
- Parse response into 4 sections
- Store in database with confidence score

**User Stories:**
- As a user, I receive a clear action recommendation for my poker hand
- As a beginner, I understand why the AI recommends a specific action
- As a user, I see which hands are good to play in this situation
- As a user, I get a simple verdict I can quickly understand

### 4. Beginner-Friendly Explanations

**What:**
- Avoid poker jargon (or explain it inline)
- Use percentages and simple ratios instead of complex math
- Visual examples where possible
- Conversational tone, not academic

**Why:**
- Target audience is recreational players improving their game
- GTO solvers are notoriously hard to understand
- Competitive advantage over technical tools

**Implementation:**
- Prompt engineering: "Explain like you're teaching a smart 10-year-old"
- Glossary tooltips for unavoidable terms (e.g., "3-bet", "polarized")
- Avoid terms like "MDF", "alpha", "node-locking"

**Example Output:**
Bad: "Your MDF suggests defending 62% of your range with optimal blocking frequencies."
Good: "You should call here about 60% of the time. You have good cards that block their strong hands, so calling is better than folding."

### 5. Hand History List

**What:**
- Chronological list of all analyzed hands
- Show thumbnail, date, stakes, position, verdict
- Click to view full analysis
- Filter by status (pending, complete, failed)
- Pagination or infinite scroll

**Why:**
- Users want to review past analyses
- Reference for tracking improvement over time

**Implementation:**
- Dashboard page with analyses query
- Card component for each hand
- Link to detail page
- Show status badge

**User Stories:**
- As a user, I can view all my previously analyzed hands
- As a user, I can click on a hand to see the full analysis again
- As a user, I can see which hands are still processing

### 6. Credit Balance Display

**What:**
- Prominent credit count in header/navbar
- Visual indicator when low on credits (< 3)
- Tooltip explaining credit system on hover
- Link to purchase more credits

**Why:**
- Users need to know how many analyses they can run
- Drives conversion to paid tier

**Implementation:**
- Query user credits on every page load
- Display in SiteHeader component
- Badge with number, coin icon
- Warning color when low

**User Stories:**
- As a user, I always know how many credits I have remaining
- As a user, I'm warned when I'm running low on credits
- As a user, I can easily find how to buy more credits

### 7. Credit Purchase Flow

**What:**
- "Buy Credits" button in header when low
- Product page showing Pro Pack ($9 for 50 credits)
- One-click checkout via Polar
- Redirect back to app after purchase
- Immediate credit balance update
- Purchase confirmation

**Why:**
- Core monetization mechanism
- Must be frictionless to convert users

**Implementation:**
- Polar checkout session creation
- Webhook handler for purchase completion
- Optimistic UI update or polling
- Success page with confetti

**User Stories:**
- As a user, I can buy 50 credits for $9 with one click
- As a user, I'm redirected to a secure payment page
- As a user, my credits are added immediately after purchase
- As a user, I receive confirmation of my purchase

## Differentiators (Competitive Advantages)

These features set the product apart from competitors.

### 1. Instant Analysis (Not Delayed)

**What:**
- Analysis completes in 10-30 seconds
- Real-time status updates ("Analyzing...", "Complete")
- No email notifications or "check back later"

**Why:**
- Competitors often batch process or have delays
- Instant feedback keeps users engaged
- Better user experience

**Implementation:**
- Inngest background job triggers immediately on upload
- Polling or websocket for status updates
- Show spinner with estimated time

### 2. Visual Range Display

**What:**
- Color-coded grid showing which hands to play
- Green = Always play, Yellow = Sometimes play, Red = Fold
- Interactive hover to see hand details
- Standard poker hand matrix (AA in top-left, 72o in bottom-right)

**Why:**
- Visual learners benefit from seeing ranges
- More intuitive than text lists
- Sticky feature users remember

**Implementation:**
- Parse AI range analysis into hand categories
- Render 13x13 grid with Tailwind colors
- Tooltip on hover with reasoning

### 3. Specific Poker Site Recognition

**What:**
- Detect which poker site screenshot is from (PokerStars, GGPoker, 888poker, etc.)
- Adapt analysis to site-specific rake/blind structures
- Show site logo in analysis

**Why:**
- Different sites have different player pools and rake
- Shows attention to detail
- Builds trust with users

**Implementation:**
- Vision model identifies site from UI elements
- Store in database
- Mention in analysis ("On PokerStars NL25...")

### 4. Position-Aware Advice

**What:**
- Detect hero's position (BTN, CO, BB, UTG, etc.)
- Tailor advice to position-specific strategy
- Explain why position matters in this hand

**Why:**
- Position is critical in poker but often misunderstood by beginners
- Shows depth of analysis
- Educational value

**Implementation:**
- Vision model extracts position from screenshot
- Prompt includes position-specific strategy guidelines
- Highlight position in analysis UI

### 5. Free Tier with Real Value

**What:**
- 3 free credits for every new user (no credit card required)
- Enough to test the product with real hands
- Clear path to paid tier

**Why:**
- Low friction acquisition
- Product-led growth
- Users see value before paying

**Implementation:**
- Default 3 credits on user registration
- Onboarding flow encourages first upload
- Prompt to upgrade after using free credits

## Anti-Features (Explicitly Don't Build)

These features are intentionally excluded to maintain focus and simplicity.

### 1. Real-Time Coaching

**What:**
- Live analysis during active poker games
- Browser extensions or overlays
- HUD-style stats

**Why NOT:**
- Against poker site terms of service
- Legal/ethical concerns
- Not the target market (serious players have existing tools)
- Requires different tech stack (desktop apps, screen capture)

### 2. Training Courses

**What:**
- Video lessons
- Poker theory curriculum
- Quizzes and interactive training

**Why NOT:**
- Scope creep (different product)
- Requires content creation expertise
- Competitive market with established players (Upswing, Run It Once)
- Distracts from core value proposition

### 3. Hand Replayer

**What:**
- Animated replay of hand action
- Scrubber to go back/forward through streets
- 3D table visualization

**Why NOT:**
- Complex to build (requires full hand history parsing)
- Not essential for static screenshot analysis
- Users already have replayers on poker sites
- High development cost for low value

### 4. Social Features

**What:**
- Share hands with friends
- Comments on analyses
- Community hand review
- User profiles with stats

**Why NOT:**
- Adds moderation burden
- Privacy concerns (users may not want hands public)
- Distracts from single-player tool focus
- Network effects are not critical to value prop

### 5. Poker HUD

**What:**
- Track opponent stats
- Display player tendencies
- Database of opponent hands

**Why NOT:**
- Legal gray area (against poker site TOS)
- Requires desktop software, not web app
- Different target market (serious grinders)
- Existing established competitors (PokerTracker, Hold'em Manager)

### 6. Multi-Street Analysis

**What:**
- Upload multiple screenshots for flop, turn, river
- Track action across all streets
- Full hand history reconstruction

**Why NOT:**
- Significantly more complex UX and AI logic
- Higher credit cost (3-4x more API calls)
- V1 focuses on single-decision analysis
- Can be added later as premium feature

### 7. Tournament-Specific Analysis

**What:**
- ICM calculations
- Bubble factor considerations
- Final table strategy

**Why NOT:**
- Niche audience (most users play cash games)
- Requires additional context (prize structure, stack distribution)
- More complex prompt engineering
- V1 focuses on cash game analysis

### 8. Hand Converter

**What:**
- Convert hand histories from text to other formats
- Export to solver formats (PioSolver, GTO+)
- Import from poker sites

**Why NOT:**
- Not a screenshot analysis feature
- Different user workflow
- Solvers already have import tools
- Distracts from beginner focus

## Feature Priority for V1

**Must Build (MVP):**
1. Auth (email/password + Google)
2. Screenshot upload
3. AI analysis (action, range, EV, verdict)
4. Credit system (3 free, purchase 50 for $9)
5. Hand history list
6. Basic dashboard

**Should Build (Launch):**
1. Visual range display
2. Site recognition
3. Position-aware advice
4. Instant analysis (Inngest)

**Won't Build (V1):**
- Everything in anti-features list
- Multi-language support
- Mobile app
- API access
- White-label offering
- Affiliate program

## Success Metrics

**Acquisition:**
- New user signups per week
- Google OAuth vs email signup ratio

**Activation:**
- % of users who upload first hand within 24h
- % of users who use all 3 free credits

**Retention:**
- Week 1 retention (return to upload another hand)
- Month 1 retention (still active after 30 days)

**Revenue:**
- Conversion rate (free to paid)
- Average credits purchased per user
- Revenue per user (RPU)

**Product Quality:**
- Analysis completion time (target < 30s)
- Analysis accuracy (spot-check by poker expert)
- User satisfaction (survey after first paid analysis)

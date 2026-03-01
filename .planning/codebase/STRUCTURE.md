# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
poker-ai-review-2026/
├── src/
│   ├── app/                          # Next.js 16 App Router (pages + API)
│   │   ├── (auth)/                   # Route group: shared auth layout
│   │   │   ├── login/page.tsx        # Login page
│   │   │   ├── register/page.tsx     # Registration page
│   │   │   └── layout.tsx            # Auth layout wrapper
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts        # BetterAuth catch-all
│   │   │   ├── chat/route.ts                 # OpenRouter streaming chat
│   │   │   ├── upload/route.ts               # File upload + credit deduction
│   │   │   ├── analyses/
│   │   │   │   ├── route.ts          # GET user's analyses list
│   │   │   │   └── [id]/route.ts     # GET single analysis
│   │   │   ├── inngest/route.ts      # Inngest webhook endpoint
│   │   │   └── diagnostics/route.ts  # System health check
│   │   ├── analysis/[id]/page.tsx    # Protected analysis detail view (polls API)
│   │   ├── upload/page.tsx           # Protected upload page
│   │   ├── dashboard/page.tsx        # Protected dashboard
│   │   ├── profile/page.tsx          # Protected user profile
│   │   ├── chat/page.tsx             # Protected AI chat (if implemented)
│   │   ├── page.tsx                  # Landing page (public)
│   │   ├── layout.tsx                # Root layout (fonts, providers, header/footer)
│   │   ├── error.tsx                 # Error boundary
│   │   ├── global-error.tsx          # Global error fallback
│   │   ├── not-found.tsx             # 404 page
│   │   ├── robots.ts                 # SEO robots.txt
│   │   ├── sitemap.ts                # SEO sitemap
│   │   ├── manifest.ts               # PWA manifest
│   │   └── globals.css               # Global Tailwind CSS
│   │
│   ├── components/                   # React components (49 .tsx files)
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx              # Card with CardHeader/CardContent/CardTitle
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── dialog.tsx            # Modal
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx          # Skeleton loader
│   │   │   ├── spinner.tsx           # Spinner component
│   │   │   ├── sonner.tsx            # Toast provider
│   │   │   ├── mode-toggle.tsx       # Dark/light mode toggle
│   │   │   ├── font-size-toggle.tsx  # Font size selector
│   │   │   └── github-stars.tsx      # Ornamental star display
│   │   │
│   │   ├── auth/                     # Authentication components
│   │   │   ├── user-profile.tsx      # User menu + sign in/out
│   │   │   ├── sign-in-button.tsx
│   │   │   ├── sign-up-form.tsx
│   │   │   └── ... other auth forms
│   │   │
│   │   ├── upload/                   # File upload feature
│   │   │   ├── file-upload.tsx       # Dropzone wrapper
│   │   │   └── insufficient-credits-dialog.tsx
│   │   │
│   │   ├── landing/                  # Landing page sections
│   │   │   ├── hero-section.tsx      # Hero with real analysis data
│   │   │   ├── pricing-section.tsx   # Pricing table
│   │   │   ├── landing-cta-section.tsx
│   │   │   └── analysis-mockup.tsx   # Demo analysis display
│   │   │
│   │   ├── site-header.tsx           # Main navigation (sticky)
│   │   ├── site-footer.tsx           # Footer
│   │   ├── theme-provider.tsx        # next-themes provider
│   │   ├── font-size-provider.tsx    # Font size context
│   │   ├── starter-prompt-modal.tsx  # Starter prompts modal
│   │   └── purchase-credits-button.tsx
│   │
│   ├── lib/                          # Core services and utilities
│   │   ├── auth.ts                   # BetterAuth server config
│   │   ├── auth-client.ts            # BetterAuth client hooks
│   │   ├── db.ts                     # Drizzle database client
│   │   ├── schema.ts                 # Drizzle table definitions
│   │   ├── storage.ts                # File upload abstraction
│   │   ├── analysis-schema.ts        # Zod schema for AI output
│   │   ├── polar.ts                  # Polar SDK client
│   │   ├── session.ts                # Session utilities
│   │   ├── env.ts                    # Environment validation
│   │   └── utils.ts                  # Helper functions
│   │
│   ├── inngest/                      # Background job orchestration
│   │   ├── client.ts                 # Inngest client initialization
│   │   ├── functions.ts              # Job functions (processAnalysis)
│   │   ├── types.ts                  # Event type definitions
│   │   └── prompts/
│   │       └── analyze-hand.ts       # System prompt for GPT-4o vision
│   │
│   └── hooks/                        # Custom React hooks
│       └── ... (if any custom hooks)
│
├── public/
│   └── uploads/                      # Local file storage (dev only, created at runtime)
│       └── screenshots/              # Poker hand screenshots
│
├── drizzle/                          # Database migrations (auto-generated)
│
├── docs/                             # Documentation
│   ├── technical/
│   │   ├── ai/                       # AI integration guides
│   │   └── react-markdown.md
│   └── business/
│
├── .planning/                        # GSD codebase documentation
│   └── codebase/                     # This directory
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.example
├── .env                              # Secrets (not in git)
├── pnpm-lock.yaml
├── CLAUDE.md                         # AI assistant guidelines
└── README.md
```

## Directory Purposes

**`src/app/`**
- Purpose: All pages and API routes via Next.js 16 App Router
- Pattern: Each folder = route segment; `page.tsx` = page; `route.ts` = API handler; `layout.tsx` = wrapper
- Key routes:
  - `/upload` - Protected file upload
  - `/dashboard` - Protected dashboard
  - `/analysis/[id]` - Protected analysis detail (dynamic route)
  - `/api/upload` - File upload endpoint
  - `/api/analyses` - Analysis list endpoint

**`src/app/(auth)/`**
- Purpose: Grouped auth pages with shared layout
- Pattern: Route group (parentheses); layout applies to children; routes don't show in URL
- Contains: Login, register pages

**`src/app/api/`**
- Purpose: Backend endpoints handling HTTP requests
- Pattern: Folders with `route.ts` files; export `GET`, `POST`, etc. functions
- Key endpoints:
  - `/api/upload` - POST to upload file and deduct credit
  - `/api/analyses` - GET user's analyses list
  - `/api/analyses/[id]` - GET single analysis
  - `/api/chat` - POST streaming chat messages
  - `/api/auth/[...all]` - BetterAuth catch-all
  - `/api/inngest` - Inngest webhook

**`src/components/`**
- Purpose: Reusable React components
- Organization:
  - `ui/` - shadcn/ui primitives (button, card, input, etc.)
  - `auth/` - Authentication-specific components
  - `upload/` - File upload feature components
  - `landing/` - Landing page sections
  - Root level: Layout components (header, footer, providers)
- Pattern: PascalCase filenames; use `"use client"` for interactivity

**`src/lib/`**
- Purpose: Core business logic, configuration, utilities
- Key files:
  - `auth.ts` - BetterAuth server config with Polar payment plugin
  - `db.ts` - Drizzle ORM client
  - `schema.ts` - Database table definitions
  - `storage.ts` - File upload/delete with dual-mode storage
  - `analysis-schema.ts` - Zod schema for structured output validation
  - `utils.ts` - Helper functions
- Pattern: Singleton exports for services (db, auth instances)

**`src/inngest/`**
- Purpose: Background job definitions and event handling
- Files:
  - `client.ts` - Inngest instance
  - `functions.ts` - Job function `processAnalysis` with 3 retries
  - `types.ts` - Event types (e.g., `analysis/upload.completed`)
  - `prompts/analyze-hand.ts` - System prompt for vision analysis
- Pattern: Declarative function definitions with step-based error handling

**`drizzle/`**
- Purpose: Database migrations (auto-generated SQL)
- Pattern: One `.sql` file per schema change; never edit manually
- Generated by: `npm run db:generate` (creates migration) + `npm run db:migrate` (applies)

**`public/uploads/`**
- Purpose: Local file storage during development (replaced by Vercel Blob in production)
- Pattern: Subdirectories by upload type (e.g., `screenshots/`)
- Created at runtime if `BLOB_READ_WRITE_TOKEN` not set

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` - Root layout, initializes providers and global layout
- `src/app/page.tsx` - Public landing page with hero, pricing, CTA
- `src/app/upload/page.tsx` - Protected file upload interface
- `src/app/dashboard/page.tsx` - Protected user dashboard
- `src/app/analysis/[id]/page.tsx` - Protected analysis detail with polling

**Authentication & Authorization:**
- `src/lib/auth.ts` - BetterAuth config (email/password, Google OAuth, Polar payment)
- `src/lib/auth-client.ts` - Client-side session hooks
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/register/page.tsx` - Registration page

**API Endpoints:**
- `src/app/api/upload/route.ts` - File upload with credit deduction
- `src/app/api/analyses/route.ts` - List user's analyses
- `src/app/api/analyses/[id]/route.ts` - Get single analysis
- `src/app/api/chat/route.ts` - OpenRouter streaming chat
- `src/app/api/auth/[...all]/route.ts` - BetterAuth handler

**Data & Business Logic:**
- `src/lib/db.ts` - Drizzle client
- `src/lib/schema.ts` - Table definitions (user, analysis, session, etc.)
- `src/lib/storage.ts` - File upload abstraction
- `src/lib/analysis-schema.ts` - Zod schema for analysis output

**Background Jobs:**
- `src/inngest/client.ts` - Inngest initialization
- `src/inngest/functions.ts` - `processAnalysis` background job
- `src/inngest/prompts/analyze-hand.ts` - System prompt for vision model

**Configuration:**
- `tsconfig.json` - TypeScript settings, path aliases (`@/*` = `src/*`)
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `package.json` - Dependencies and scripts

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (`FileUpload.tsx`, `UserProfile.tsx`)
- Hooks: `use-{name}.ts` (e.g., `use-diagnostics.ts`)
- Utilities: kebab-case or camelCase (e.g., `storage.ts`, `utils.ts`)
- Types/Schemas: `{name}-schema.ts` (e.g., `analysis-schema.ts`)

**Components:**
- Export: Default export for pages, named exports for reusable components
- Props: TypeScript interfaces co-located with component
- Client Components: Add `"use client"` directive at top if using hooks

**Functions:**
- API handlers: `GET`, `POST`, `PUT`, `DELETE` (uppercase, exported from route.ts)
- Services: camelCase (e.g., `processAnalysis`, `uploadFile`)
- Utilities: camelCase (e.g., `sanitizeFilename`)

**Variables & Constants:**
- React state: `const [thing, setThing] = useState()`
- Constants: `UPPER_SNAKE_CASE` (e.g., `ALLOWED_EXTENSIONS`)
- Private: No convention; use closures or classes

**Directories:**
- Feature folders: kebab-case (e.g., `upload/`, `analysis/`)
- Route groups: underscore prefix (e.g., `(auth)/`)
- Component groups: lowercase (e.g., `ui/`, `auth/`, `landing/`)

## Where to Add New Code

**New Page/Feature:**
1. Create directory: `src/app/{feature-name}/`
2. Add `page.tsx` with component
3. If protected: Check session in Server Component with `auth.api.getSession({ headers: await headers() })`
4. If needs data: Create API route in `src/app/api/{feature-name}/route.ts`
5. Add UI components to `src/components/{feature-name}/`

**Example - Add Settings Page:**
- Page: `src/app/settings/page.tsx`
- API: `src/app/api/settings/route.ts` (if needed)
- Components: `src/components/settings/SettingsForm.tsx`

**New API Endpoint:**
1. Create file: `src/app/api/{endpoint}/route.ts`
2. Export HTTP handler: `export async function POST(req: Request) { ... }`
3. Check auth: `const session = await auth.api.getSession({ headers: await headers() })`
4. Validate input: `const parsed = schema.safeParse(body)`
5. Use database: `import { db } from "@/lib/db"; const result = await db.select()...`

**Example - Add Profile Update:**
```typescript
// src/app/api/profile/route.ts
export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid" }), { status: 400 });

  const result = await db.update(user).set(parsed.data).where(eq(user.id, session.user.id));
  return new Response(JSON.stringify(result));
}
```

**New Component:**
- Reusable: `src/components/{feature}/{ComponentName}.tsx`
- Feature-specific: `src/components/{feature}/{ComponentName}.tsx`
- Use `"use client"` if using React hooks
- Import UI primitives from `@/components/ui/`

**New Database Table:**
1. Edit `src/lib/schema.ts`, add `pgTable()` definition
2. Run `npm run db:generate` → creates migration in `drizzle/`
3. Run `npm run db:migrate` → applies to PostgreSQL
4. Import table: `import { newTable } from "@/lib/schema"`

**Example - Add Favorites Table:**
```typescript
// src/lib/schema.ts
export const favorite = pgTable(
  "favorite",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    analysisId: text("analysis_id").notNull().references(() => analysis.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("favorite_user_id_idx").on(table.userId)]
);
```

**New Background Job:**
1. Define event type in `src/inngest/types.ts`
2. Create function in `src/inngest/functions.ts` using `inngest.createFunction()`
3. Define steps with `step.run()`
4. Trigger from API: `inngest.send("event/name", { data })`

**New Utility:**
- General: Add to `src/lib/utils.ts`
- Feature-specific: Create `src/lib/{feature}.ts`
- Example: `export function formatPokerHand(cards: string): string { ... }`

## Special Directories

**`src/app/api/auth/[...all]/`**
- Catch-all route for BetterAuth
- Not committed manually; required for auth system
- Pattern: Delegates to BetterAuth SDK

**`src/components/ui/`**
- shadcn/ui component library (design system)
- Copied into repo, customized as needed
- Not updated via package manager

**`drizzle/`**
- Auto-generated migration files
- Created by `npm run db:generate`
- Committed to git (migrations are code)
- Never edit manually

**`public/uploads/`**
- Local file storage (dev only)
- Created at runtime when files uploaded
- Not committed (in .gitignore)
- Replaced by Vercel Blob in production

**`.next/`**
- Next.js build output
- Auto-generated by build/dev
- Not committed (in .gitignore)

## Database Schema Overview

**Tables:**
- `user` - User identity with credits field (default 3)
- `session` - BetterAuth session tokens
- `account` - OAuth provider accounts
- `verification` - Email verification tokens
- `analysis` - Poker hand analysis records (status machine: pending → processing → complete/failed)
- `webhookEvents` - Payment webhook deduplication (idempotency)

**Key Relationships:**
- `analysis.userId` FK → `user.id` (cascade delete)
- `session.userId` FK → `user.id` (cascade delete)
- `account.userId` FK → `user.id` (cascade delete)

**Status Machine (Analysis):**
- pending: Record created, waiting to upload file
- uploaded: File stored, waiting for background processing
- processing: Vision model analyzing image
- complete: Analysis done, result stored in `result` field
- failed: Analysis failed, credit refunded

## Import Patterns

**Core services (singletons):**
```typescript
import { auth } from "@/lib/auth"           // BetterAuth server
import { db } from "@/lib/db"               // Drizzle client
import { analysisSchema } from "@/lib/analysis-schema"  // Zod schema
import { upload } from "@/lib/storage"      // File upload
```

**Authentication (client):**
```typescript
import { useSession } from "@/lib/auth-client"  // Get session
```

**Components:**
```typescript
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/upload/file-upload"
```

**Inngest:**
```typescript
import { inngest } from "@/inngest/client"
```

**Database:**
```typescript
import { user, analysis } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
```

**External packages:**
```typescript
import { openrouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"
import { z } from "zod"
```

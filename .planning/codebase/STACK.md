# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript 5.9.3 - Core application logic and type safety
- JavaScript (JSX/TSX) - React components and configuration

**Secondary:**
- SQL - Database queries via Drizzle ORM

## Runtime

**Environment:**
- Node.js 20.x (specified in `.nvmrc`)

**Package Manager:**
- pnpm - Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.4 - UI library
- React DOM 19.2.4 - React rendering

**UI & Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- shadcn/ui 3.7.0 - Pre-built component library (via Radix UI)
- next-themes 0.4.6 - Dark mode support

**Database:**
- Drizzle ORM 0.44.7 - Type-safe SQL query builder
- drizzle-kit 0.31.8 - Schema generation and migrations
- PostgreSQL driver: `postgres` 3.4.8 and `pg` 8.17.2

**Authentication:**
- better-auth 1.4.18 - Complete auth solution with email/password and OAuth
- @polar-sh/better-auth 1.8.1 - Polar payment integration plugin for BetterAuth

**Payment Processing:**
- @polar-sh/sdk 0.43.1 - Polar SDK for subscription/product management

**AI & Streaming:**
- ai 5.0.123 - Vercel AI SDK for streaming and model integration
- @ai-sdk/react 2.0.125 - React bindings for AI SDK
- @openrouter/ai-sdk-provider 1.5.4 - OpenRouter provider for AI SDK

**File Storage:**
- @vercel/blob 2.0.1 - File storage abstraction (Vercel Blob or local)

**Background Jobs:**
- inngest 3.52.0 - Serverless task queue and workflow orchestration

**Utilities:**
- zod 4.3.6 - Runtime type validation and schema parsing
- react-markdown 10.1.0 - Markdown rendering in React
- lucide-react 0.539.0 - Icon library
- sonner 2.0.7 - Toast notifications
- clsx 2.1.1 - Conditional className builder
- tailwind-merge 3.4.0 - Merge Tailwind CSS classes intelligently
- class-variance-authority 0.7.1 - CSS-in-JS variant factory
- react-dropzone 15.0.0 - File upload handling

**UI Primitives (Radix):**
- @radix-ui/react-avatar 1.1.11 - Avatar component
- @radix-ui/react-dialog 1.1.15 - Modal/dialog component
- @radix-ui/react-dropdown-menu 2.1.16 - Dropdown menu
- @radix-ui/react-label 2.1.8 - Accessible label
- @radix-ui/react-slot 1.2.4 - Slot pattern for component composition

**Error Tracking & Monitoring:**
- @sentry/nextjs 10.39.0 - Error tracking and performance monitoring

**Development Tools:**
- ESLint 9.39.2 - Code linting (flat config in `eslint.config.mjs`)
- eslint-config-next 16.0.7 - Next.js ESLint rules
- Prettier 3.8.1 - Code formatting
- prettier-plugin-tailwindcss 0.6.14 - Tailwind class ordering
- @tailwindcss/postcss - Latest - Tailwind CSS PostCSS plugin
- tsx 4.21.0 - TypeScript execution for scripts
- tw-animate-css 1.4.0 - Animation utilities
- shadcn (CLI) 3.7.0 - Component scaffolding tool

**Type Definitions:**
- @types/node 20.19.30 - Node.js types
- @types/react 19.2.5 - React types (overridden to specific version)
- @types/react-dom 19.2.3 - React DOM types (overridden to specific version)
- @types/pg 8.16.0 - PostgreSQL driver types

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Strict mode: Enabled (all strict options including noUnusedLocals, noUnusedParameters)
- Module resolution: bundler
- Path alias: `@/*` → `./src/*`

**Prettier:**
- Config: `.prettierrc`
- Print width: 100 characters
- Semicolons: Enabled
- Single quotes: Disabled (double quotes)
- Tab width: 2 spaces
- Trailing commas: ES5
- Bracket spacing: Enabled
- Arrow parens: Always

**ESLint:**
- Config: `eslint.config.mjs` (flat config)
- Base: Next.js core-web-vitals
- Import ordering: Enforced (builtin → external → internal → relative → index → types)
- Path groups: React, Next, @/* imports prioritized
- React rules: `jsx-no-target-blank` error, `no-unescaped-entities` off
- React Hooks: `rules-of-hooks` error, `exhaustive-deps` warn
- Console rules: `no-console` warns, allows `console.warn` and `console.error`
- Best practices: `prefer-const` error, `no-var` error, `eqeqeq` always

**Next.js:**
- Config: `next.config.ts`
- Image optimization: Remote patterns for Google, GitHub, Vercel Blob
- Compression: Enabled
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy
- Sentry integration: Via `withSentryConfig()` wrapper

**Database:**
- Config: `drizzle.config.ts`
- Dialect: PostgreSQL
- Schema location: `src/lib/schema.ts`
- Migrations output: `drizzle/` directory

**PostCSS:**
- Config: `postcss.config.mjs`
- Plugins: `@tailwindcss/postcss`

## Environment Variables

**Required:**
- `POSTGRES_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - 32+ character auth secret

**Optional:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `BETTER_AUTH_URL` - Base URL for auth callbacks (default: NEXT_PUBLIC_APP_URL or http://localhost:3000)
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features
- `OPENROUTER_MODEL` - Model selection (default: `openai/gpt-5-mini`)
- `OPENAI_EMBEDDING_MODEL` - Embedding model for vector search (default: `text-embedding-3-large`)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token (if omitted, uses local storage)
- `NEXT_PUBLIC_APP_URL` - Public app URL (default: `http://localhost:3000`)
- `POLAR_WEBHOOK_SECRET` - Polar webhook signing secret
- `POLAR_ACCESS_TOKEN` - Polar API access token
- `POLAR_PRODUCT_ID` - Polar product ID for checkout

**Validation:**
- Environment variables validated with Zod schema in `src/lib/env.ts`
- Server-side validation: `getServerEnv()`
- Client-side validation: `getClientEnv()`
- Diagnostics: `npm run env:check` (or `pnpm env:check`)

## Scripts

**Development:**
- `pnpm dev` - Start dev server with Turbopack
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run lint and typecheck
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

**Database:**
- `pnpm db:generate` - Generate migrations
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Drizzle Studio GUI
- `pnpm db:dev` - Push schema for development
- `pnpm db:reset` - Drop all tables and recreate schema

**Build:**
- `pnpm build` - Build for production (runs migrations first)
- `pnpm build:ci` - Build without database (for CI/CD)
- `pnpm start` - Start production server

**Setup:**
- `pnpm setup` - Run setup script
- `pnpm env:check` - Validate environment variables

## Platform Requirements

**Development:**
- Node.js 20.x
- PostgreSQL database (local or remote)
- pnpm package manager

**Production:**
- Node.js 20.x runtime (Vercel or any Node.js host)
- PostgreSQL database
- Optional: Vercel Blob for file storage (uses local storage if omitted)
- Optional: Sentry account for error tracking
- Optional: OpenRouter API key for AI features
- Optional: Polar account for payment processing

---

*Stack analysis: 2026-02-23*

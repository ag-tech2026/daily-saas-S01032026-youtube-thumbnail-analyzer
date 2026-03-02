# SaaS Boilerplate

A production‑ready starter for AI‑powered SaaS products. Includes authentication, database, AI vision analysis, and payments (Polar) pre‑integrated.

## What’s Included

- **Next.js 14** (App Router) + TypeScript
- **BetterAuth** (Google OAuth, session management)
- **Neon Postgres** + Drizzle ORM
- **Inngest** background jobs
- **OpenRouter** vision model analysis (domain‑specific prompt/schema)
- **Polar** payments (credit purchases)
- **Vercel** deployment ready

## Quick Start

1. Clone this repo and install dependencies:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

2. Copy `.env.example` to `.env` and fill in your secrets:

```bash
POSTGRES_URL=postgresql://...
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:3000        # for local
NEXT_PUBLIC_APP_URL=http://localhost:3000   # for local
OPENROUTER_API_KEY=sk-...
# Optional Polar keys if using payments
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_PRODUCT_ID=...
```

3. Start the database (Docker):

```bash
docker compose up -d
pnpm run db:migrate
```

4. Run dev server:

```bash
pnpm run dev
```

Visit http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub (your own fork/private repo).
2. In Vercel, create a new project and import the repo.
3. Add the same environment variables as in `.env`.
4. Set **Project Visibility** to **Public** (unless you prefer private).
5. Deploy.

## Customizing for Your Idea

This boilerplate is designed so you only change the `src/domain/` folder to adapt to a new vertical.

### 1. Replace the domain prompt and schema

Edit:

- `src/domain/prompt.ts` – system prompt for the vision model
- `src/domain/schema.ts` – Zod schema for the structured output
- `src/domain/index.ts` – adjust `CREDITS_PER_ANALYSIS` if needed

See `src/domain/README.md` for the export contract.

### 2. Update UI text (optional)

Landing page and analysis page contain domain‑specific copy under:

- `src/app/page.tsx` (landing)
- `src/app/analysis/[id]/page.tsx` (analysis result display)

### 3. (Optional) Adjust credit cost

Credits per analysis are set in `src/inngest/functions.ts` (`CREDITS_PER_ANALYSIS` if you add that export; currently hard‑coded to 1).

### 4. Validate and redeploy

```bash
./scripts/validate-domain.sh   # checks exports
git commit -am "feat: new domain"
git push
```

Vercel will auto‑redeploy.

## Payments (Polar)

If you want to sell credits, set the Polar environment variables and use the “Buy Credits” button component. Pricing is configured in the Polar dashboard; the product ID must match `POLAR_PRODUCT_ID`.

### Setting Up Your Polar Payout Account

When applying for a Polar payout account, fill in the Organization Details form as follows:

**Organization Name:** ag-tech-thumbnails

**Support Email:** dunkmaap@gmail.com

**Website:** _(your production domain)_

**Social Media:** _(your personal social links — used for identity verification, never shown publicly)_

**Describe your business:**
> We are in the AI/SaaS industry, building a YouTube thumbnail analyzer and optimization tool. We solve the problem of content creators struggling to create effective thumbnails that drive clicks and views. Our customers are YouTubers, content creators, and digital marketers who want to improve video performance through AI-driven thumbnail analysis and scoring.

**What do you sell:**
> We offer a SaaS subscription tool that uses AI to analyze and score YouTube thumbnails. Key features include: AI-powered thumbnail quality scoring, composition and color analysis, click-through rate optimization suggestions, competitor thumbnail comparison, and actionable improvement recommendations. Available via monthly and annual subscription plans.

**How will you integrate Polar:**
> Polar will power our subscription billing on our website. Users will see Polar checkout when upgrading from free to paid plans. We will use Polar's API for subscription management, webhooks to provision and revoke user access based on subscription status, and the customer portal for self-service subscription management.

**Main customer acquisition channels:** Website & SEO, Social media

**Currently using:** This is my first payment platform

## Scripts

- `pnpm run dev` – Next.js dev server
- `pnpm run db:generate` – generate Drizzle migrations
- `pnpm run db:migrate` – apply migrations
- `pnpm run db:studio` – open Drizzle Studio

## License

MIT (or choose your own). This boilerplate is a derivative of the Agentic Coding Starter Kit.

## Support

Open issues on GitHub or consult the documentation in `docs/`.
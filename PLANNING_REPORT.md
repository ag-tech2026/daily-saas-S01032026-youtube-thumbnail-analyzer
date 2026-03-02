# 🎯 Planning Report: YouTube Thumbnail Analyzer

**Idea Approved:** 2026-03-01 23:50 UTC  
**Project:** S01032026-youtube-thumbnail-analyzer  
**GitHub:** https://github.com/ag-tech2026/daily-saas-S01032026-youtube-thumbnail-analyzer

## Idea Summary

- **Title:** YouTube Thumbnail Analyzer
- **Problem:** YouTubers lack predictive tools to know if a thumbnail will perform before upload; they rely on guesswork or manual A/B testing which wastes upload slots and time.
- **Solution:** Upload thumbnail → AI rates clickability, suggests improvements, predicts CTR.
- **Target Niche:** Micro YouTube creators
- **Monetization:** $7/month unlimited credits
- **Estimated Build Time:** 3 hours
- **Confidence Score:** 90%

## What's in This Repository

### Boilerplate Code (Ready to Customize)
- `src/domain/` — **Your main customization point:** `prompt.ts`, `schema.ts`, `index.ts`
- `src/app/page.tsx` — Landing page (update copy for your niche)
- `src/app/analysis/[id]/page.tsx` — Analysis result display
- `docker-compose.yml`, `.env.example` — Local dev setup
- Full Next.js 14 + TypeScript + BetterAuth + Polar stack

### Planning Artifacts (in `_bmad-output/planning-artifacts/`)
- `product-brief-youtube-thumbnail-analyzer-2026-03-01.md` — Problem, solution, differentiators, personas, success metrics, MVP scope
- `market-research-youtube-thumbnail-analyzer-2026-03-01.md` — Market size, competition (TubeBuddy, VidIQ, Canva), customer needs, positioning
- `domain-research-youtube-thumbnail-analyzer-2026-03-01.md` — Industry analysis, regulatory (YouTube API, GDPR), technical trends (AI, computer vision)
- `technical-research-youtube-thumbnail-analyzer-2026-03-01.md` — Architecture, database schema, API design, deployment notes, third-party integrations
- `create-prd-youtube-thumbnail-analyzer-2026-03-01.md` — Detailed PRD with user stories, acceptance criteria, sprint plan

## Next Steps (Coding Phase)

1. **Review planning artifacts** — Read through the _bmad-output/planning-artifacts/ to understand product vision, technical approach, and scope.

2. **Customize the domain logic** (core of your SaaS):
   - Edit `saas-boilerplate/src/domain/prompt.ts` — Write a system prompt for the OpenRouter vision model to analyze YouTube thumbnails and return structured JSON.
   - Edit `saas-boilerplate/src/domain/schema.ts` — Define Zod schema for the analysis output (e.g., `{ score: number, suggestions: string[], ctrPrediction: number }`).
   - Update `CREDITS_PER_ANALYSIS` in `src/domain/index.ts` (default 1).

3. **Update UI text** to match your niche:
   - `src/app/page.tsx` — Landing page headline, features, pricing
   - `src/app/analysis/[id]/page.tsx` — Result display formatting

4. **Configure Polar:**
   - Create a product in Polar dashboard with pricing ($7/month unlimited)
   - Set `POLAR_PRODUCT_ID`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` in `.env`

5. **Test locally:**
   ```bash
   cp .env.example .env
   # Fill in your API keys (OpenRouter, Polar, BetterAuth, Neon)
   docker-compose up -d
   pnpm run db:migrate
   pnpm run dev
   ```
   Visit http://localhost:3000

6. **Iterate:** Refine prompt and schema until AI output matches your expectations. Use the admin UI (`/admin`) to view analyses.

7. **Deploy:** Push to Vercel (one-click) or Railway/Fly.io. Set environment variables in deployment.

**Estimated time to MVP:** 3 hours

## Tips

- Start with the example domain (poker) to understand the pattern, then adapt.
- Keep the prompt concise; few-shot examples improve consistency.
- The boilerplate is production-ready — just customize `src/domain/` and you're good to go.

Good luck building! 🚀


---

## Implementation

See `IMPLEMENTATION.md` for actual implementation details, including:
- Domain prompt and schema
- Routes implemented
- Database schema used
- Environment variables
- Dependencies
- Deviations from plan

# MARKET-UP

Digital B2B/B2C platform for Tunisian businesses, delivered at **vivasky.media**.

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB Atlas account (or local MongoDB 7+)

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Sync shared assets (logos, onboarding images)
npm run sync-shared

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (auto-syncs shared assets) |
| `npm run build` | Production build (auto-syncs shared assets) |
| `npm run start` | Run production server |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:seed` | Seed dev database |
| `npm run db:reset` | Drop + reseed dev database |
| `npm run sync-shared` | Copy `reference/mockups/shared/` to `public/shared/` |

## Folder structure

```
src/
  app/           — Next.js App Router pages + API routes
  components/
    ui/          — shadcn/ui primitives
    shared/      — cross-feature components (StatusPill, Sidebar, etc.)
    features/    — feature-scoped components
  lib/           — shared utilities (db, auth, i18n, errors, etc.)
  models/        — Mongoose models (Phase 1)
  services/      — business logic layer (Phase 1+)
  schemas/       — Zod validation schemas
  types/         — shared TypeScript types and enums
reference/       — READ-ONLY mockups, specs, and seed data
scripts/         — DB seed/reset scripts
```

## Tech stack

Next.js 14 (App Router) · TypeScript strict · MongoDB + Mongoose · NextAuth v4 · Tailwind CSS 3 + shadcn/ui · Zod · React Hook Form

## Documentation

- `CLAUDE.md` — coding conventions and project context
- `reference/API_REFERENCE_MARKETUP.md` — REST API contract
- `reference/SEED_ARCHITECTURE.md` — data model rationale
- `.claude/skills/` — domain-specific implementation guides

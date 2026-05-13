# MARKET-UP — Phase Status

**Generated:** 2026-05-13
**Current phase:** Phase 1 complete (tag: phase-1-complete)

## What's done

- **Phase 0 — Foundation:** Next.js 14, strict TS, ESLint+Prettier, Tailwind (Fluent flat tokens), shadcn/ui, NextAuth v4 scaffold, middleware, env validation, core libs (db, i18n, api-error, api-response, auth-guards, visibility)
- **Phase 1 — Models + Seed:** 16 Mongoose models (Company, User, AdminUser, Profile + 3 discriminators, Transaction, Boost, Sponsoring, RseReceipt, Notification, Association, Sector, Gouvernorat, File), barrel export, full seed script (10 companies, 30 profiles, 19 transactions, 6 boosts, 2 sponsorings, 8 RSE receipts, 16 notifications), reset script, 20 Vitest tests against mongodb-memory-server

## Atlas state

Seeded with TechnoFab canon:
- brandup.status = **rejected** (verbatim rejection reason)
- traceup.status = **pending** (first submission, awaiting admin)
- linkup.status = **active** + 1 active boost + 1 active sponsoring
- rseBadgeStatus = **validated**

## Env vars (.env.local)

- MONGODB_URI — provided
- NEXTAUTH_SECRET — provided
- RESEND_API_KEY — needed for Phase 2 (not yet set)

## Next phase: Phase 2 — Auth flow

Signup (3 steps), login, OTP via Resend, password reset, email validation. Corresponds to 9 mockups: `auth_*.html` + `onboarding_onboarding.html`.

## Resume reading order

1. `CLAUDE.md`
2. `.claude/skills/marketup-api-routes/SKILL.md`
3. `reference/API_REFERENCE_MARKETUP.md` — section 1 (Authentication)
4. `reference/mockups/auth_*.html` and `onboarding_onboarding.html`

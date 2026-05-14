# MARKET-UP — Phase Status

**Updated:** 2026-05-14
**Current phase:** Phase 2 complete (tag: phase-2-complete)

## What's done

- **Phase 0 — Foundation:** Next.js 14, strict TS, ESLint+Prettier, Tailwind (Fluent flat tokens), shadcn/ui, NextAuth v4 scaffold, middleware, env validation, core libs (db, i18n, api-error, api-response, auth-guards, visibility)
- **Phase 1 — Models + Seed:** 16 Mongoose models, barrel export, full seed script (10 companies, 30 profiles, 19 transactions, 6 boosts, 2 sponsorings, 8 RSE receipts, 16 notifications), reset script, 20 Vitest tests
- **Phase 2 — Auth Flow:** 3-step signup (company → user → OTP verify), login with NextAuth Credentials, password reset (forgot + reset), email validation resend. 8 API routes + 3 resource endpoints. 9 UI pages ported 1:1 from mockups. Unified error code mapping. 14 integration tests (34 total).

## Key artifacts (Phase 2)

- **Services:** `src/services/auth.service.ts` — signupCompany, signupUser, verifyOtp, login, forgotPassword, resetPassword, resendValidationEmail
- **Routes:** 8 auth (`/api/v1/auth/*`) + 3 resources (`/api/v1/resources/*`)
- **Pages:** onboarding, signup/company, signup/user, signup/verify, signup/success, login, validation-email, forgot, reset
- **Shared components:** AuthLeftPanel, PasswordInput, OtpInput, Toast/ToastProvider, AuthErrorBanner
- **Error mapping:** `src/lib/auth-error-messages.ts` — 20+ error codes with French messages

## Atlas state

Seeded with TechnoFab canon (unchanged from Phase 1):
- brandup.status = **rejected** (verbatim rejection reason)
- traceup.status = **pending** (first submission, awaiting admin)
- linkup.status = **active** + 1 active boost + 1 active sponsoring
- rseBadgeStatus = **validated**

## Env vars (.env.local)

- MONGODB_URI — provided
- NEXTAUTH_SECRET — provided
- RESEND_API_KEY — provided
- EMAIL_FROM — set to onboarding@resend.dev (Resend sandbox)

## Next phase: Phase 3 — Owner dashboard skeleton

`/(dashboard)/*` layout + sidebar + topbar + `/me` endpoint. 16 pages from `dashboard_*.html` mockups.

## Resume reading order

1. `CLAUDE.md`
2. `.claude/skills/marketup-api-routes/SKILL.md`
3. `reference/API_REFERENCE_MARKETUP.md` — section 2 (Account & Company)
4. `reference/mockups/dashboard_*.html`

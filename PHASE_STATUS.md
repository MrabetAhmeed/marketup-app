# MARKET-UP — Phase Status

Last updated: 2026-05-14

## Current state

- Phase 2 COMPLETE (tag: phase-2-complete pending push)
- 27 commits total (Phase 0 → Phase 2)
- 34 tests green
- 9 auth pages + 11 API routes operational
- Flow signup end-to-end validated in browser

## Atlas database state

- 10 seeded companies (TechnoFab canon as c-001)
- 30 seeded profiles, 6 boosts, 2 sponsorings, 19 transactions, 8 RSE receipts

## Required .env.local vars

- MONGODB_URI (Atlas connection string)
- NEXTAUTH_URL (http://localhost:3000)
- NEXTAUTH_SECRET (32-byte base64)
- RESEND_API_KEY (re_...)
- EMAIL_FROM (onboarding@resend.dev for sandbox dev)
- R2_* (empty, Phase 4)
- PUSHER_* (empty, Phase 9)

## Phase 2 deliverables

- 8 service functions (signupCompany, signupUser, verifyOtp, login, resendOtp, forgotPassword, resetPassword, resendValidationEmail)
- 11 API routes (8 auth + 3 resources)
- 9 UI pages (onboarding, signup x4, login, validation-email, forgot, reset)
- 5 shared components (AuthLeftPanel, PasswordInput, OtpInput, Toast, AuthErrorBanner)
- Unified error mapping (20+ codes)
- 14 integration tests

## Next phase

Phase 3 — Dashboard skeleton (16 pages from reference/mockups/dashboard_*.html)

## Key files to read on resume

1. CLAUDE.md (project canon)
2. PHASE_STATUS.md (this file)
3. PHASE_2_AUDIT_REPORT.md (audit findings)
4. V1_1_POLISH_BACKLOG.md (deferred items)
5. .claude/skills/marketup-ui-canon/SKILL.md (UI tokens)
6. reference/mockups/dashboard_*.html (Phase 3 source of truth)

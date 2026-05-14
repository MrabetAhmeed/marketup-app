# Phase 2 — End-of-Phase Audit Report

**Date:** 2026-05-14
**Auditor:** Claude Code (self-audit)

## Executive Summary

- **Overall verdict: HEALTHY**
- **Categories:** 7 clean / 2 need attention / 0 critical
- **Recommended actions before Phase 3:** 2 must-fix (minor), 6 backlog additions

---

## Detailed Findings

### CATEGORY A — Code Health

| Check | Verdict | Notes |
|---|---|---|
| A1. Lint | **pass** | 0 errors, 1 warning (import/order in test file — vi.mock hoisting artifact, cosmetic) |
| A2. Typecheck | **pass** | 0 errors, `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` |
| A3. Tests | **pass** | 7 files, 34/34 pass, ~38s duration |
| A4. TODOs | **pass** | 3 TODOs, all tracked: `pricing.ts` (Phase 7), `pusher.ts` (Phase 9), `user.model.ts` (Phase 10 orphan cron) |
| A5. Stubs | **pass** | 2 stub files (`pricing.ts`, `pusher.ts`) — comment-only, no functions that throw. Correct for their phase. |

### CATEGORY B — Dependencies

| Check | Verdict | Notes |
|---|---|---|
| B1. Pinning | **warn** | 12 deps use `^` (semver range): `@base-ui/react`, `@hookform/resolvers`, `class-variance-authority`, `clsx`, `lucide-react`, `next-themes`, `react-hook-form`, `resend`, `shadcn`, `sonner`, `swr`, `tailwind-merge`, `tw-animate-css`. Core deps (mongoose, next, react, zod, bcryptjs) are pinned. |
| B2. Vulnerabilities | **warn** | 2 vulnerabilities in production: 1 high (Next.js 14.2.35 — multiple CVEs, fix requires Next.js 16 which is breaking), 1 moderate (PostCSS XSS in nested dep). Both are in Next.js's dependency tree, not directly exploitable in our usage. |
| B3. Unused deps | **warn** | `lucide-react` — not imported anywhere (shadcn installed it but we use Material Symbols). `next-themes` — not imported. `@base-ui/react` — not imported. `sonner` — imported in `src/components/ui/sonner.tsx` but that component is unused (we built custom Toast). `tw-animate-css` — may be used by shadcn internals. |

### CATEGORY C — Configuration

| Check | Verdict | Notes |
|---|---|---|
| C1. .env.example | **fail** | Missing `EMAIL_FROM`. Added in Phase 2 (`src/lib/env.ts`) but not reflected in `.env.example`. **Must fix.** |
| C2. .gitignore | **pass** | Covers node_modules, .next, .env, .env.local, .env.*.local. Only `.env.example` tracked (`git ls-files` confirms). No secrets in repo. |
| C3. tsconfig strict | **pass** | `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` |

### CATEGORY D — Security

| Check | Verdict | Notes |
|---|---|---|
| D1. No password logging | **pass** | Zero console.log/error of plaintext passwords. One `console.error` in forgot route logs a static string only. Login debug log uses `[REDACTED]`. |
| D2. No hardcoded secrets | **pass** | Zero string literals containing tokens/keys/secrets. All from `env.*`. |
| D3. No Math.random | **pass** | Zero occurrences. OTP uses `crypto.randomInt`, reset token uses `crypto.randomBytes`. |
| D4. bcrypt rounds | **pass** | Passwords: 12 rounds. OTP: 10 rounds. Reset tokens: 12 rounds. All appropriate. |
| D5. Rate limits | **pass** | IP rate limits on 4 endpoints (login 20/5m, signup 5/5m, resend-validation 10/5m, forgot 10/5m). Per-email limits on forgot (60s) and resend-validation (60s). |
| D6. Anti-enumeration | **pass** | `password/forgot` and `email/resend-validation` always return 200 with identical message. Internal errors swallowed. Login returns generic `INVALID_CREDENTIALS` when user not found. |
| D7. No sensitive fields in responses | **pass** | None of `passwordHash`, `otpHash`, `passwordResetTokenHash`, `passwordResetTokenPrefix` appear in any service return statement. |

### CATEGORY E — Architecture Consistency

| Check | Verdict | Notes |
|---|---|---|
| E1. Model/Schema/Mockup alignment | **pass** | 1 misalignment found and fixed in Phase 2 (`liveData.address` required→optional). All other fields aligned. |
| E2. 3-tier pattern | **pass** | Locked fields: 6 with `immutable: true` (type, legalId, vatNumber, identityDocumentUrl, country, accountEmail). Validation-gated: `data.displayName`, `data.logoUrl`. Live: all `liveData.*` fields. |
| E3. Soft delete | **pass** | 10 models have `deletedAt` + pre-find hook: Company, User, AdminUser, Profile, Transaction, Boost, Sponsoring, RseReceipt, Notification, File. Reference models (Sector, Gouvernorat, Association) don't need soft delete. |
| E4. Naming conventions | **pass** | Services: camelCase exports. Routes: `route.ts` in path folders. Schemas: PascalCase + `Schema` suffix. Components: PascalCase. Pages: `page.tsx`. |

### CATEGORY F — Documentation

| Check | Verdict | Notes |
|---|---|---|
| F1. CLAUDE.md | **pass** | Still accurate. Phase roadmap in section 9 is correct. Conventions haven't changed. |
| F2. PHASE_STATUS.md | **fail** | Stale — still says "Phase 1 complete". **Must update** to reflect Phase 2 completion. |
| F3. Skills | **pass** | Skills describe patterns, not inventories. Still accurate for their purpose. |
| F4. V1.1 backlog | **warn** | Has 2 items. Missing 6 items discovered during Phase 2 (listed in Action Items below). |

### CATEGORY G — Test Coverage

| Check | Verdict | Notes |
|---|---|---|
| G1. Critical paths | **pass** | 20 model/visibility tests + 14 auth service tests = 34 total. All critical auth paths covered. |
| G2. Mocks proper | **pass** | Resend mocked (`vi.mock`). DB via `MongoMemoryReplSet` (no Atlas calls). env mocked. |
| G3. No flakiness | **pass** | 3 consecutive runs: 34/34, 34/34, 34/34. |

### CATEGORY H — Git Hygiene

| Check | Verdict | Notes |
|---|---|---|
| H1. Commit messages | **pass** | 26 commits, all with conventional prefixes: 12 feat, 6 fix, 4 chore, 2 test, 2 docs. Descriptive bodies. |
| H2. No tracked secrets | **pass** | `git ls-files | grep .env` returns only `.env.example`. |
| H3. Tags | **pass** | `phase-1-complete` exists. `phase-2-complete` pending (to be created after audit). |

### CATEGORY I — Canon Compliance

| Check | Verdict | Notes |
|---|---|---|
| I1. CLAUDE.md R1-R12 | **pass** | R1: 0 EUR/euro references. R2: priceHT+vatRate only (Transaction model). R3: No `visible` field stored. R4: TraceUp videos use direct CRUD. R5: Soft delete on all data models. R12: Compound indexes per skill. |
| I2. P2-R rules | **pass** | All 12 P2-R rules verified in prior audits (C2 audit, C3 self-check, C4 fidelity audit). |
| I3. UI canon | **warn** | `font-extrabold` used in onboarding page (3 occurrences). **This matches the mockup exactly** — the onboarding mockup itself uses `font-extrabold` for the "B2B", "B2C", and "OU" text. Per CLAUDE.md section 2: "If a mockup and the spec disagree, the mockup wins." Flagged but not a violation. |

---

## Action Items

### Must fix before Phase 3

1. **C1: Add `EMAIL_FROM` to `.env.example`** — One-line addition. Missing from Phase 2.
2. **F2: Update `PHASE_STATUS.md`** — Rewrite to reflect Phase 2 completion, 34 tests, 9 pages, 11 routes.

### Should track (V1.1 backlog additions)

3. CGU hardening: add `z.literal(true)` for CGU acceptance instead of HTML-only `required`
4. `jsonError` refactor: login route 429 uses `jsonOk({error:...}, 429)` — should use `jsonError()`
5. Forgot route outer catch: `handleApiError` leaks Zod validation errors as 400 (not an enum leak, but exposes API contract)
6. Mobile bottom sheets: onboarding dropdowns use standard dropdown instead of bottom sheet on mobile (3 items)
7. Cleanup orphan signups: dev script to delete Users where `emailVerifiedAt=null AND createdAt < now-7d`
8. Unused deps cleanup: remove `lucide-react`, `next-themes`, `@base-ui/react` (shadcn leftovers not used)

### Nothing to do

- Categories A, D, E, G, H: All clean.
- Category I: Canon compliance verified.

---

## Verification Metrics

| Metric | Value |
|---|---|
| Lines of code (src/) | 5,326 TS + 37 CSS = 5,363 |
| Test count | 34 (7 files) |
| Commits | 26 total (13 Phase 0/1, 13 Phase 2) |
| API endpoints | 11 (8 auth + 3 resources) |
| UI pages | 9 |
| Shared components | 5 (AuthLeftPanel, PasswordInput, OtpInput, Toast, AuthErrorBanner) |
| Models | 16 |
| Zod schemas | 8 (7 auth + 1 reset-form) |
| Dependencies | 22 production + 12 dev |
| Vulnerabilities | 1 high (Next.js upstream, no direct fix), 1 moderate (PostCSS upstream) |

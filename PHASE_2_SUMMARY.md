# Phase 2 — Auth Flow — Summary

**Dates:** 2026-05-13 to 2026-05-14
**Tag:** `phase-2-complete`
**Commits:** 15 (on top of Phase 0/1's 13)

---

## What was built

### Backend (service layer + API routes)

**Service:** `src/services/auth.service.ts` — 8 exported functions:

| Function | Purpose | Key security |
|---|---|---|
| `signupCompany` | Step 1: create Company + User atomically | Mongoose transaction, email reuse 3-case check, orphan cascade-delete |
| `signupUser` | Step 2: set password + send OTP | bcrypt 12, `crypto.randomInt` for OTP, bcrypt 10 for OTP hash |
| `verifyOtp` | Step 3: verify 6-digit code, set emailVerifiedAt | 5-attempt lockout, 10min expiry, defense-in-depth field check |
| `login` | Authenticate User or AdminUser | Specific error codes (EMAIL_NOT_VERIFIED, COMPANY_NOT_ACTIVE with sub-status), AdminUser fallback |
| `resendOtp` | Resend OTP by userId | 60s rate limit |
| `forgotPassword` | Send password reset email | Anti-enumeration (always 200), 32-byte `crypto.randomBytes` token, prefix-based DB lookup |
| `resetPassword` | Apply new password | bcrypt.compare full token, one-time use (fields cleared) |
| `resendValidationEmail` | Resend OTP by email | Anti-enumeration (always 200), 60s rate limit |

**Routes:** 11 total

| Route | Method | Auth | Rate limit |
|---|---|---|---|
| `/api/v1/auth/signup/company` | POST | Public | 5/5min per IP |
| `/api/v1/auth/signup/user` | POST | Public | — |
| `/api/v1/auth/signup/verify-otp` | POST | Public | — |
| `/api/v1/auth/login` | POST | Public | 20/5min per IP |
| `/api/v1/auth/logout` | POST | Session | — |
| `/api/v1/auth/password/forgot` | POST | Public | 10/5min per IP + 60s/email |
| `/api/v1/auth/password/reset` | POST | Public | — |
| `/api/v1/auth/email/resend-validation` | POST | Public | 10/5min per IP + 60s/email |
| `/api/v1/resources/sectors-b2b` | GET | Public | — (24h cache) |
| `/api/v1/resources/categories-b2c` | GET | Public | — (24h cache) |
| `/api/v1/resources/gouvernorats` | GET | Public | — (24h cache) |

**Schemas:** `src/schemas/auth.schema.ts` — 7 Zod schemas shared between client (RHF resolver) and server (route handler). `SignupUserSchema` includes `.refine()` for password confirmation.

### Frontend (9 pages + 5 components)

| Page | Route | Type | Mockup source |
|---|---|---|---|
| Onboarding | `/onboarding` | Client | `onboarding_onboarding.html` |
| Signup Company | `/signup/company` | Client | `auth_inscription-entreprise.html` |
| Signup User | `/signup/user` | Client | `auth_inscription-utilisateur.html` |
| Signup Verify | `/signup/verify` | Client | `auth_inscription-otp.html` |
| Signup Success | `/signup/success` | Server | `auth_validation-success.html` |
| Login | `/login` | Client | `auth_connexion.html` |
| Validation Email | `/validation-email` | Client | `auth_validation-email.html` |
| Forgot Password | `/forgot` | Client | `auth_mot-de-passe-oublie.html` |
| Reset Password | `/reset` | Client | `auth_modifier-mot-de-passe.html` |

**Shared components:**

| Component | Location | Purpose |
|---|---|---|
| AuthLeftPanel | `src/components/shared/AuthLeftPanel.tsx` | Blue left panel (`#005A9E`) with optional stepper |
| PasswordInput | `src/components/shared/PasswordInput.tsx` | Visibility toggle + 4-bar strength meter |
| OtpInput | `src/components/shared/OtpInput.tsx` | 6-box OTP with auto-advance, paste, backspace |
| Toast + ToastProvider | `src/components/shared/Toast.tsx` | Bottom-center transient feedback (1800ms) |
| AuthErrorBanner | `src/components/shared/AuthErrorBanner.tsx` | Red banner with optional CTA link |

**Error mapping:** `src/lib/auth-error-messages.ts` — 20+ error codes mapped to canonical French messages with UI presentation type (banner/toast/field) and optional CTAs.

### Infrastructure

| File | Purpose |
|---|---|
| `src/lib/email/sender.ts` | Resend client wrapper (graceful degradation if no API key) |
| `src/lib/email/templates/otp.ts` | OTP email HTML template (French) |
| `src/lib/email/templates/password-reset.ts` | Password reset email HTML template (French) |
| `src/lib/rate-limit.ts` | In-memory rate limiter (4 IP limiters + 2 per-key limiters) |
| `src/lib/slug.ts` | URL slug generation + collision handling |

### Model changes

- `User`: `firstName`, `lastName`, `passwordHash` changed to optional (null until step 2). Added: `phone`, `acceptedTermsAt`, `otpLastSentAt`, `passwordResetTokenPrefix`.
- `Company`: `liveData.address` changed from required to optional (default null).
- `AuthError`: added optional `details` parameter.

---

## Architecture decisions

1. **No SignupDraft model.** Real User + Company created at step 1 with `emailVerifiedAt=null`. GitHub/Stripe/Vercel pattern. Orphans cleaned up after 7 days.

2. **userId as cross-step key.** Stored in `sessionStorage` (not localStorage — clears on tab close). Also accepted via `?userId=` query param for login→verify redirect.

3. **Password reset token prefix.** First 8 hex chars stored unhashed for efficient DB lookup. Full token verified via bcrypt.compare. One-time use.

4. **Anti-enumeration everywhere.** `forgotPassword` and `resendValidationEmail` always return 200. Login returns generic `INVALID_CREDENTIALS` for non-existent users (soft-deleted users are invisible to queries).

5. **NextAuth error propagation.** `authorize()` throws `Error(JSON.stringify({code, message, status, details}))`. Client parses `result.error` as JSON to extract structured error info.

---

## Tests added

14 integration tests in `src/services/__tests__/auth.service.test.ts`:

| # | Test | Covers |
|---|---|---|
| a | Signup happy path | Full 3-step flow → emailVerifiedAt set |
| b | Email uniqueness | Duplicate active email → 409 |
| c | Orphan cleanup | >7d unverified → cascade-delete + re-signup |
| d | OTP expiry | After 10min → 410 |
| e | OTP lockout | 5 wrong → 429, correct code also rejected |
| f | Resend rate limit | 2nd call within 60s → silent (anti-enum) |
| g | Login happy path | Verified + active → payload |
| h | Login pending | Company pending → COMPANY_NOT_ACTIVE |
| i | Login unverified | emailVerifiedAt=null → EMAIL_NOT_VERIFIED + userId |
| j | Login deleted | Soft-deleted → INVALID_CREDENTIALS |
| k | Admin login | AdminUser fallback → SUPER_ADMIN |
| l | Reset happy path | forgot → reset → login with new password |
| m | Reset token expiry | After 60min → TOKEN_INVALID |
| n | Anti-enum resend | Unknown email → silent no-op |

Uses `MongoMemoryReplSet` (transactions require replica set). Resend mocked via `vi.mock`.

**Total test count:** 20 (Phase 1) + 14 (Phase 2) = 34

---

## Bugs found and fixed during Phase 2

| Bug | Root cause | Fix |
|---|---|---|
| Company 500 on empty address | Mongoose required, Zod+mockup optional | `liveData.address` → `default: null` |
| signup/user silent form failure | `acceptedTermsAt` required in Zod but not a form field | Made `.optional()` in schema, service defaults to `new Date()` |
| Mismatched passwords accepted | `passwordConfirm` not in Zod schema | Added field + `.refine()` for match |
| Resend email fails in dev | Hardcoded `noreply@vivasky.media` (unverified domain) | Read from `env.EMAIL_FROM` with sandbox default |
| Country field mismatch | Mockup: enabled select with disabled options. Rendering: fully disabled | Matched mockup exactly |
| Language selects mismatch | Same pattern as country | Matched mockup exactly |
| Confirm password no toggle | Mockup has visibility toggle on confirm field | Added toggle button |

---

## Deferred items (V1.1 backlog)

8 items tracked in `V1_1_POLISH_BACKLOG.md`:
1. Reset token pre-validation on page load
2. /dashboard 404 (Phase 3 dependency)
3. CGU hardening (z.literal)
4. jsonError refactor for login 429
5. Forgot route Zod swallow
6. Mobile bottom sheets (3 sub-items)
7. Orphan cleanup dev script
8. Unused deps cleanup

---

## Metrics

| Metric | Value |
|---|---|
| Lines of code (src/) | 5,363 (5,326 TS + 37 CSS) |
| Tests | 34 (7 files) |
| Total commits | 28 |
| Phase 2 commits | 15 |
| API endpoints | 11 |
| UI pages | 9 |
| Shared components | 5 |
| Models | 16 (unchanged from Phase 1) |
| Zod schemas | 8 |
| Error codes mapped | 20+ |
| Vulnerabilities | 1 high (Next.js upstream), 1 moderate (PostCSS upstream) |

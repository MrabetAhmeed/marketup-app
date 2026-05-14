# V1.1 Polish Backlog

Items deferred from V1 implementation. Each entry includes context,
implementation notes, and estimated effort.

---

## Reset password page — pre-validate token on load

Currently /reset?token=xxx shows the password form even with an invalid
or expired token. The user enters a new password, submits, and only then
sees RESET_TOKEN_INVALID / RESET_TOKEN_EXPIRED. Better UX: validate the
token on page load and show the error immediately.

Implementation:
- Add GET /api/v1/auth/password/validate-token?token=xxx
- Returns 200 if valid, 410 if expired, 400 if invalid
- /reset page does a useEffect fetch on mount, shows loading state
- If invalid → show error state immediately (don't render form)

Estimated effort: 1 hour (new endpoint + Zod + page state update).

Discovered during Phase 2 browser testing (Test 6).

---

## Phase 3 dependency — /dashboard route

During Phase 2 browser testing (Test 1), logging in with an active
company (seed user ahmed@technofab.tn) redirects to /dashboard which
returns 404. This is expected — /dashboard is in Phase 3 scope.

When Phase 3 starts, the dashboard skeleton will resolve this. Until
then, users with status="active" companies will see a 404 after login.

Not a bug, just a phase dependency to track.

---

## CGU hardening — Zod-level validation

The CGU checkbox is currently enforced only by HTML `required` attribute.
Add `z.literal(true)` field for CGU acceptance in `SignupUserSchema` for
server-side validation. Low risk (browser enforces it), but defense-in-depth.

Estimated effort: 15 minutes.

---

## Login route 429 — use jsonError instead of jsonOk

`src/app/api/v1/auth/login/route.ts` returns rate-limit error via
`jsonOk({ error: ... }, 429)`. Should use `jsonError()` for consistency
with the API error contract.

Estimated effort: 5 minutes.

---

## Forgot route outer catch — swallow Zod validation errors

`src/app/api/v1/auth/password/forgot/route.ts` outer catch uses
`handleApiError` which leaks Zod validation errors as 400. Not an
email-enumeration leak (result doesn't depend on account existence)
but exposes the API contract. Consider swallowing all errors and
returning 200 for zero-info-leak.

Estimated effort: 10 minutes.

---

## Mobile bottom sheets for onboarding dropdowns

The onboarding page's country and app launcher dropdowns use standard
click-toggled dropdowns. The mockup shows mobile bottom sheets with:
- Slide-up animation from bottom
- Drag handle bar at top
- Backdrop overlay
- Mobile-specific header with "Choisir un pays" / close button

3 items to implement. Desktop behavior is correct.

Estimated effort: 2 hours.

---

## Cleanup orphan signups — dev script

Users with `emailVerifiedAt=null AND createdAt < now-7d` should be
cascade-deleted along with their Company. Currently documented as a
TODO in `user.model.ts` (Phase 10 cron). For dev, a manual script
would be useful.

Estimated effort: 30 minutes.

---

## Unused dependencies cleanup

Phase 0 installed shadcn/ui which pulled in deps not used by our code:
- `lucide-react` — not imported (we use Material Symbols)
- `next-themes` — not imported
- `@base-ui/react` — not imported

Remove to reduce bundle size. Verify no shadcn component imports them
before removing.

Estimated effort: 15 minutes.

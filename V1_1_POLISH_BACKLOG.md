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

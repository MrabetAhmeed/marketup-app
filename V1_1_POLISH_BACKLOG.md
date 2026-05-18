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

## CGU hardening — z.literal(true) instead of HTML-only required

Currently CGU acceptance is enforced via HTML `required` attribute on
the checkbox. Can be bypassed by:
- Disabling JS in browser dev tools
- Submitting directly to the API

For V1.1, harden with Zod:
  cguAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les CGU." })
  })

And update signupUser service to generate acceptedTermsAt = new Date()
only when cguAccepted === true.

Estimated effort: 15 minutes.

---

## jsonError refactor for login route 429 response

login/route.ts currently uses:
  return jsonOk({ error: { code: "RATE_LIMITED", ... } }, 429);

Functionally correct (returns 429 with error body) but stylistically
inconsistent. Refactor to:
  return jsonError("RATE_LIMITED", "Trop de tentatives...", 429);

Estimated effort: 5 minutes.

---

## Forgot route — swallow Zod errors in outer catch

forgot/route.ts outer catch uses handleApiError which leaks Zod
validation errors as 400 ("email is required", etc). Not an
email-enumeration leak (result doesn't depend on account existence)
but exposes the API contract.

For V1.1 zero-info-leak compliance:
  } catch (err) {
    console.error("[forgot] outer error swallowed:", err);
    return jsonOk({ message: STANDARD_MESSAGE });
  }

Estimated effort: 10 minutes.

---

## Mobile bottom sheets — 3 items deferred from C4

Onboarding page mobile dropdowns currently use standard dropdown
behavior instead of slide-up bottom sheet pattern shown in mockup.

Items:
- Country dropdown mobile header ("Choisir un pays" + close button)
- App launcher mobile header ("Produits MARKET-UP" + close button)
- Mobile backdrop overlay (#mobileBackdrop) for both dropdowns

Estimated effort: 2-3 hours (CSS animations + state management).

Discovered during C4 audit. Page remains functional on mobile but
without the canonical UX polish.

---

## Cleanup orphan signups — dev tooling script

During development, testing signup creates "stuck" Users
(emailVerifiedAt=null, < 7 days old). Currently only fixable via manual
MongoDB Compass deletion.

For dev experience, add:
  scripts/cleanup-orphan-signups.ts

A script that:
- Connects to MongoDB
- Finds all Users where emailVerifiedAt=null
- Lists them with createdAt + accountEmail
- Asks for confirmation
- Cascade-deletes the User + their Company

Usage: npm run cleanup:orphans

Estimated effort: 30 minutes.

Note: production cleanup (cron for >7d orphans) tracked separately
for Phase 10.

---

## Storage — Path traversal defense in depth

Origin: Audit b2975ff finding B8.

Current state: LocalStorageAdapter uses options.companyId directly in
key construction. If a malicious companyId like "../../etc" reaches
the adapter, the resolved path would escape the uploads directory.

Risk: LOW. Real protection happens at the API route layer — companyId
is always read from session.user.companyId (verified ObjectId from
JWT), never from request body.

V1.1 hardening (~10 min):
- Add a guard in LocalStorageAdapter.upload() (and other methods
  consuming key):
    if (!/^[a-f0-9]{24}$/.test(options.companyId)) {
      throw new StorageError("Invalid companyId format");
    }
- This is belt-and-suspenders. The API route layer is the primary
  defense, but this prevents any future caller mistake from leaking
  paths.

Commit when implemented:
  fix(storage): defense-in-depth ObjectId validation in LocalAdapter

---

## Storage — Random suffix for collision-resistant keys

Origin: Audit b2975ff finding B3a.

Current state: Keys use YYYY-MM-DD date format. Two uploads of the
same filename on the same day would generate identical keys,
overwriting the first.

Risk: LOW for logo/banner (1 per company), MODERATE for gallery
uploads where users may upload multiple images per session.

V1.1 fix (~5 min):
- Switch from YYYY-MM-DD to a more granular timestamp:
    const ts = Date.now().toString(36); // base36 for shorter string
    const key = `companies/${id}/${cat}/${ts}-${slug}.${ext}`;
- Or use nanoid(8) for 8-char random suffix.

Phase 4 dependency: Implement BEFORE building gallery upload (gallery
needs collision resistance more than single-image fields).

Commit when implemented:
  fix(storage): time-precision + random suffix for collision resistance

---

## Remove unused shadcn deps

shadcn/ui installed deps not used in our app:
- lucide-react (we use Material Symbols)
- next-themes (no dark mode toggle yet)
- @base-ui/react (replaced by our custom components)
- sonner (replaced by our custom Toast)

Run: npm uninstall lucide-react next-themes @base-ui/react sonner
Verify: npm run lint + typecheck stay clean

Estimated effort: 5 minutes (but verify carefully).


### Compteur HARD message
- Actuellement : "Modifications à resoumettre · revalidation admin requise"
- Cible : "X modifications à resoumettre · revalidation admin requise"
- Cohérence avec compteur SOFT qui affiche déjà le nombre
- Fichier : ProfileActionBar.tsx (branches active + rejected + incomplete)

### Tests Vitest manquants Sprint 2
- profile-soft.service: dispatch by kind
- profile-soft.service: cross-tenant guard
- profile-soft.service: gallery reorder with markModified
- profile-soft.schema: strict mode + nested socials validation
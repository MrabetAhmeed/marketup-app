# Business Rules — Detailed Implementation Notes

> Extracted from CLAUDE.md §6.10-6.16 for context reduction. All rules are implemented and tested.
> Read this file when modifying the specific features described below.

---

## 6.10 TraceUP videos — hybrid hard/soft (updated PP-11, June 30 2026)

Per client feedback (demo May 22, decision Ahmed June 29): TraceUP video **additions** require admin review (hard change via `pendingData`). Video **deletions** remain instant (soft) when profile is active. Deletions are blocked during pending status.

- `createVideo()` writes to `pendingData.fields[key="videos"]` with a full snapshot (not to `data.videos`)
- Profile transitions to `pending` on first add (hidden publicly until admin validates)
- `deleteVideo()` is soft instant (active/rejected), blocked during pending
- `removeVideoFromPending()` lets the owner retract pending videos before admin review
- Auto-recovery: if pending snapshot matches `data.videos` → clear pending, restore previous status

---

## 6.11 Slug lifecycle — regeneration + 301 redirect (PP-12, July 6 2026)

When admin approves a `data.displayName` change via `approvePendingUpdates()`:
1. `generateSlug(newDisplayName)` produces a candidate slug
2. If candidate === current slug (no-op): skip — no slug change, no slugHistory entry
3. `ensureUniqueSlug(candidate, companyId)` checks uniqueness against all slugs **and** all `slugHistory` entries (excluding the company itself via `excludeCompanyId`)
4. Old slug → `company.slugHistory[]` ($addToSet); new slug → `company.slug`
5. "Retour interne" (reclaim own old slug): allowed, removed from slugHistory

**Anti-collision:** `ensureUniqueSlug()` checks `{ $or: [{ slug }, { slugHistory }] }`. An old slug is reserved forever for redirect. A new company signup that collides with another company's slugHistory gets a `-2` suffix.

**Redirect:** `getPublicProfileBySlug()` falls back to `Company.findOne({ slugHistory: slug })` when primary lookup fails. If found → throws `SlugRedirectError(kind, newSlug)`. Consumers:
- 3 SSR pages: catch → `permanentRedirect()` (308 Permanent Redirect)
- 3 API routes: catch → `NextResponse.redirect(newUrl, 301)`
- `generateMetadata()`: catch → return `{}` (empty metadata, page redirect handles it)

`SlugRedirectError` extends `Error` (NOT `AppError`) to avoid being caught by `handleApiError`.

---

## 6.12 Admin validation hub (PP-12, July 6 2026)

Single page `/admin/validation` with 4 tabs: Inscriptions · Modifications comptes · Profils · RSE. Tab active controlled by `?tab=` query param (deep-linkable).

- `listCompaniesWithPendingUpdates()`: active companies with `pendingUpdates !== null`
- 4th counter `companyUpdates` in `getPendingCountsForAdmin()`
- Old validation list pages (`/comptes`, `/profiles`, `/rse`) redirect to the hub
- Detail page "Retour" link infers tab from company status (pending → inscriptions, active → modifications)

---

## 6.13 Session invalidation — passwordChangedAt + S8 (PP-13, July 23 2026)

The NextAuth jwt() callback checks session validity against the DB on every authenticated request (Owner role only, SUPER_ADMIN skipped):

**Two parallel queries** per invocation (`.select().lean()`, minimal cost):
1. `User.findById(token.id).select("passwordChangedAt")`
2. `Company.findById(token.companyId).select("status")`

**Invalidation triggers:**
- `Math.floor(passwordChangedAt.getTime() / 1000) > token.iat` → password changed after token was issued (strict `>`, same-second sessions survive so the device that changed the password keeps its fresh JWT via signIn silencieux)
- `company.status in ["suspended", "deleted"]` → S8 fix: suspended/deleted companies lose all active sessions

**Fail-open:** if the DB is unreachable, the request proceeds (avoid logging out all users on a transient DB blip).

**Cost:** 2 queries per page load on protected routes (middleware + getServerSession each trigger jwt()). Acceptable for V1 single-instance. V1.1 item: add a short TTL cache (~30s) to reduce DB hits.

**Password change flow:**
- `PUT /api/v1/me/settings/password` — no company.status guard (accessible to rejected owners)
- After success, client calls `signIn("credentials", { email, newPassword, redirect: false })` for a fresh JWT
- Non-blocking confirmation email sent to owner (template: password-changed)
- Rate limited: 5/hour per userId

**Settings page:** exempt from `guardActiveCompany()` (like `/account/edit`) — rejected owners can change their password. Layout exemption added for `/dashboard/settings`.

---

## 6.15 Placeholder mode — "Bientot disponible" (PP-14.5, July 23 2026)

`Profile.placeholderMode` is an enum `"hidden" | "coming_soon"` (default `"hidden"`). It controls what visitors see when the owner voluntarily hides a profile (`isPublic: false`).

**Public page decision matrix** (evaluated in `getPublicProfileBySlug`, in this order):

| company.status | profile.status | isPublic | placeholderMode | publishedAt | Result |
|---|---|---|---|---|---|
| not active | any | any | any | any | **404** |
| active | disabled/incomplete | any | any | any | **404** |
| active | any | any | any | null + not active | **404** |
| active | any | false | coming_soon | set | **Placeholder DTO** |
| active | any | false | hidden | any | **404** |
| active | active/pending/rejected | true | any | any | **Full profile** |

**Placeholder DTO** — minimal, strict whitelist: `{ kind, placeholder: true, company: { displayName, logoUrl, slug } }`. No data, socials, coordinates, pendingData, or contact info. Prevents information leakage.

**Guard: publishedAt required** — a profile never validated by admin (`publishedAt null`) cannot show a placeholder. This prevents leaking company name/logo before admin validation.

**Pages:** the 3 `[slug]/page.tsx` detect `placeholder: true` in the DTO and render `<ComingSoonPage>` with the engine accent colour. `generateMetadata` returns `robots: { index: false }` for placeholders. HTTP status is 200 with noindex (App Router limitation — no custom status on SSR pages).

**Search engines:** a profile with `isPublic: false` remains **absent** from search results regardless of `placeholderMode`. The placeholder is only accessible via direct URL/QR.

**Mutation:** `placeholderMode` is a soft field (instant, no admin review) mutated via `PUT /profiles/[id]/soft` alongside `isPublic`. Zod enum strict.

**UI:** sub-choice appears under the "Profil public" toggle when OFF — two radio buttons: "Masquer completement" (hidden) / "Afficher 'Bientot disponible'" (coming_soon). Disabled conditions match the isPublic toggle per kind.

---

## 6.16 Account deletion + Suspension lifecycle (PP-14, July 24 2026)

**Owner self-delete** (`DELETE /api/v1/me`):
- Body: `{ password }` — bcrypt verification required, rate-limited 3/hour per userId
- Accessible from ANY company status (active, rejected, suspended)
- Cascade soft-delete in a Mongoose transaction across 9 models: Company (status→"deleted"), User, Profile (x3), Transaction, Boost, Sponsoring, RseReceipt, Notification (by recipientId), File (by ownerUserId)
- No hard delete. Physical file cleanup (Cloudinary/S3) deferred to V1.1 (RGPD J+30 purge)
- Email "account-deleted" sent non-blocking after transaction
- Session invalidation: handled by existing jwt() callback PP-13 (company.status === "deleted")
- Slug + slugHistory of deleted company remain reserved forever (`ensureUniqueSlug` uses `withDeleted: true`)
- Re-login impossible: soft-delete filter on User → findOne returns null → INVALID_CREDENTIALS

**Admin suspend** (`POST /admin/companies/[id]/suspend`):
- Body: `{ reason }` — Zod min 3 chars, max 500, required
- Writes `suspendedReason`, `suspendedAt`, `$push auditTrail { action: "suspended", byRole: "SUPER_ADMIN", details: { reason } }`
- Email "company-suspended" sent to owner with reason (non-blocking)
- Session invalidation: handled by existing jwt() callback PP-13 (company.status === "suspended")
- UI: modal with reason textarea required, warning about profile visibility and session impact

**Admin reactivate** (`POST /admin/companies/[id]/reactivate`):
- Clears `suspendedReason` and `suspendedAt`, `$push auditTrail { action: "reactivated" }`
- Email "company-reactivated" sent to owner (non-blocking)
- UI: simple confirmation modal

**A8 constat:** admin entreprises page has no status filter/onglet → deleted companies are NOT visible in admin. Item backlog V1.1 "corbeille admin complete" for deleted company listing + potential restoration.

# MARKET-UP — Claude Code Project Context

> **Read this file fully at the start of every session.**
> When in doubt about UX states or business rules, consult `reference/` — not your training data.

---

## 1. What we're building

**MARKET-UP** is a Tunisian B2B/B2C digital platform delivered at **vivasky.media**. It hosts three independent search engines and three corresponding profile types per company:

- **BrandUP** — institutional profile (blue accent `#0078D4`)
- **TraceUP** — media profile with video channel (YouTube · Dailymotion · Vimeo)
- **LinkUP** — digital business card (gold + black)

Plus a **Super Admin** workspace (purple accent `#5C2D91`) for validation workflows and monetization oversight.

**Vendor:** AGGREGAX SUARL (Ahmed Mrabet). **Client:** Tunisian business operator. **Currency:** DT (Tunisian Dinar). **VAT:** 19%.

This Next.js codebase is the **production rewrite** of static HTML mockups already shipped and frozen (**39 files** in `reference/mockups/`: 33 master mockups + 6 TechnoFab-specific variants as the demo canon). The mockups are the contract — they describe every UX state, narrative, and data shape. **Do not reinvent UI states; port them.**

---

## 2. Source of Truth (Read Order)

When implementing **any feature**, read these files **in this order** before writing code:

1. **`CLAUDE.md`** (this file) — coding conventions and forbidden patterns
2. **`reference/API_REFERENCE_MARKETUP.md`** — REST contract for every endpoint
3. **`reference/SEED_ARCHITECTURE.md`** — data model rationale, the 3-tier validation pattern
4. **`reference/CLAUDE_v3.md`** — original product spec
5. **`reference/mockups/<relevant>.html`** — the exact UX states to reproduce
6. **`reference/marketup_seed_data.js`** — seed data shape (enums, narrative canon, TechnoFab demo)
7. **`reference/Listes_b2b_b2c.pdf`** — authoritative list of B2B sectors and B2C categories (read **only** when seeding sectors or implementing the sector picker)

> **If a mockup and the spec disagree, the mockup wins.** Surface the inconsistency to the human, do not silently resolve it.

The narrative demo entity across all mockups is **TechnoFab Industries** (B2B · Mécanique · Sousse · owner Ahmed Mrabet). Its three profiles are canonically:
- **BrandUP: rejected** (with a rejection reason)
- **TraceUP: pending** (first submission awaiting admin review)
- **LinkUP: active + boosted + active sponsoring campaign**

Honour this canon when seeding dev databases.

---

## 2-bis. Mockup filenames ≠ Next.js routes (critical)

**The HTML filenames in `reference/mockups/` are documentation references, NOT routes to be recreated literally in the Next.js codebase.**

Several mockup files include a company slug in their filename (e.g. `public_brandup_technofab-industries.html`) — these are **rendered examples** showing what the page produces for that specific company. The Next.js implementation uses **dynamic routes** (`[slug]`) and renders the same template for any company at runtime.

### Filename → Next.js route mapping

| Mockup file | Purpose | Next.js route |
|---|---|---|
| `onboarding_onboarding.html` | Product picker | `app/(public)/onboarding/page.tsx` |
| `auth_inscription-entreprise.html` | Signup step 1 | `app/(auth)/signup/company/page.tsx` |
| `auth_inscription-utilisateur.html` | Signup step 2 | `app/(auth)/signup/user/page.tsx` |
| `auth_inscription-otp.html` | Signup step 3 | `app/(auth)/signup/verify/page.tsx` |
| `auth_validation-email.html` | Resend OTP | `app/(auth)/validation-email/page.tsx` |
| `auth_validation-success.html` | Post-OTP success | `app/(auth)/signup/success/page.tsx` |
| `auth_connexion.html` | Login | `app/(auth)/login/page.tsx` |
| `auth_mot-de-passe-oublie.html` | Forgot password | `app/(auth)/forgot/page.tsx` |
| `auth_modifier-mot-de-passe.html` | Reset password | `app/(auth)/reset/page.tsx` |
| `public_brandup.html` | **BrandUP search engine** | `app/(public)/brandup/page.tsx` |
| `public_traceup.html` | **TraceUP search engine** | `app/(public)/traceup/page.tsx` |
| `public_linkup.html` | **LinkUP search engine** | `app/(public)/linkup/page.tsx` |
| `public_brandup_technofab-industries.html` | Example of a BrandUP **profile page** (any company) | `app/(public)/brandup/[slug]/page.tsx` |
| `public_brandup_popup_technofab-industries.html` | Example of a BrandUP **popup quick-preview** (any company) | `<BrandUpPopup>` component used by `/brandup` search results |
| `public_traceup_technofab-industries.html` | Example of a TraceUP profile page | `app/(public)/traceup/[slug]/page.tsx` |
| `public_traceup_popup_technofab-industries.html` | Example of a TraceUP popup | `<TraceUpPopup>` component |
| `public_linkup_technofab-industries.html` | Example of a LinkUP card | `app/(public)/linkup/[slug]/page.tsx` |
| `public_linkup_popup_technofab-industries.html` | Example of a LinkUP popup | `<LinkUpPopup>` component |
| `dashboard_index.html` | Owner overview | `app/(dashboard)/dashboard/page.tsx` |
| `dashboard_account.html` | Owner account | `app/(dashboard)/dashboard/account/page.tsx` |
| `dashboard_settings.html` | Owner settings | `app/(dashboard)/dashboard/settings/page.tsx` |
| `dashboard_brandup.html` | Owner BrandUP editor | `app/(dashboard)/dashboard/brandup/page.tsx` |
| `dashboard_traceup.html` | Owner TraceUP editor | `app/(dashboard)/dashboard/traceup/page.tsx` |
| `dashboard_linkup.html` | Owner LinkUP editor | `app/(dashboard)/dashboard/linkup/page.tsx` |
| `dashboard_boost.html` | Owner boost overview | `app/(dashboard)/dashboard/boost/page.tsx` |
| `dashboard_sponsoring.html` | Owner sponsoring | `app/(dashboard)/dashboard/sponsoring/page.tsx` |
| `dashboard_rse.html` | Owner RSE | `app/(dashboard)/dashboard/rse/page.tsx` |
| `dashboard_billing.html` | Owner billing | `app/(dashboard)/dashboard/billing/page.tsx` |
| `dashboard_notifications.html` | Owner notifications | `app/(dashboard)/dashboard/notifications/page.tsx` |
| `admin_dashboard.html` | Admin overview | `app/(admin)/admin/page.tsx` |
| `admin_entreprises.html` | Admin company directory | `app/(admin)/admin/companies/page.tsx` |
| `admin_entreprise-detail.html` | Admin single-company view | `app/(admin)/admin/companies/[id]/page.tsx` |
| `admin_validation-comptes.html` | Account validation queue | `app/(admin)/admin/validation/accounts/page.tsx` |
| `admin_validation-profils.html` | Profile validation queue | `app/(admin)/admin/validation/profiles/page.tsx` |
| `admin_validation-rse.html` | RSE validation queue | `app/(admin)/admin/validation/rse/page.tsx` |
| `admin_brandup-detail.html` | Single BrandUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=brandup) |
| `admin_traceup-detail.html` | Single TraceUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=traceup) |
| `admin_linkup-detail.html` | Single LinkUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=linkup) |
| `admin_transactions.html` | All transactions | `app/(admin)/admin/transactions/page.tsx` |

### Three rules that follow from this mapping

1. **Never create a file named after a company slug** in the Next.js code. There is no `app/(public)/brandup/technofab-industries/page.tsx`. The route is `app/(public)/brandup/[slug]/page.tsx`, and `technofab-industries` is one of many possible slug values (resolved from the seed at runtime).
2. **The 6 TechnoFab mockup files** (`public_<type>(_popup)?_technofab-industries.html`) demonstrate **only one** narrative — they exist so you can see "what BrandUP looks like when status=rejected", "what TraceUP looks like when status=pending", "what LinkUP looks like when active+boosted". Reproduce the **template logic** (how to render any status), not the **specific content** (the TechnoFab pitch text).
3. **For the three admin profile-detail pages** (`admin_brandup-detail.html`, `admin_traceup-detail.html`, `admin_linkup-detail.html`), the Next.js implementation has **one** dynamic route (`admin/profiles/[id]/page.tsx`) that branches on `profile.kind` and renders the appropriate template — not three separate routes.

### Data sources for slug-based routes

When implementing `app/(public)/brandup/[slug]/page.tsx`:
- The slug comes from `params.slug` (e.g. `technofab-industries`).
- The service `getPublicProfileBySlug(slug, "brandup")` does `Company.findOne({ slug })` → `Profile.findOne({ companyId, kind: "brandup" })`.
- If `!isProfileVisible(profile, company)` → return `notFound()` (Next.js 404).
- Otherwise render the same template that the TechnoFab mockup demonstrates, with the dynamic data.

---

## 3. Tech Stack (Locked)

Do **not** introduce alternatives without explicit human approval.

| Layer | Choice |
|---|---|
| Framework | **Next.js 14 App Router** (no Pages Router, no Remix) |
| Language | **TypeScript strict** (no `any` — use `unknown` and narrow) |
| Runtime | Node.js 20+ |
| DB | **MongoDB + Mongoose** (no Prisma, no Drizzle in this project) |
| Auth | **NextAuth.js v5 (Auth.js)** with Credentials provider |
| Styling | **Tailwind CSS 3** + **shadcn/ui** (the only allowed UI lib) |
| Forms | **React Hook Form** + Zod resolver |
| Validation | **Zod** everywhere (client RHF + server route handlers) |
| Real-time | **Pusher Channels** (alternative: Ably) |
| Email | **Resend** (alternative: SendGrid) |
| File storage | **AWS S3** or **Cloudflare R2** behind a CDN |
| PDF generation | **@react-pdf/renderer** (lazy, server-side) |
| Tests | **Vitest** + **Playwright** for E2E |
| Lint | **ESLint** + **Prettier** (config provided) |

**Forbidden:** Material UI, MUI, Chakra, Mantine, Ant Design, Bootstrap, styled-components, Emotion, CSS Modules, raw CSS files (use Tailwind classes only).

---

## 4. Project Structure (Target)

```
src/
├── app/
│   ├── (public)/                  # /, /brandup, /traceup, /linkup, /brandup/[slug] ...
│   ├── (auth)/                    # /signup, /login, /verify-email, /forgot, /reset
│   ├── (dashboard)/               # /dashboard, /dashboard/brandup, ...
│   ├── (admin)/                   # /admin, /admin/companies, /admin/validation/* ...
│   ├── api/v1/
│   │   ├── auth/
│   │   ├── me/
│   │   ├── search/
│   │   ├── public/
│   │   ├── admin/
│   │   ├── resources/
│   │   ├── uploads/
│   │   └── webhooks/
│   ├── layout.tsx
│   └── error.tsx
├── components/
│   ├── ui/                        # shadcn primitives only
│   ├── shared/                    # cross-feature (Topbar, Sidebar, StatusPill, ...)
│   └── features/
│       ├── auth/
│       ├── profiles/
│       ├── boost/
│       ├── rse/
│       └── admin/
├── lib/
│   ├── db.ts                      # Mongoose connection singleton
│   ├── auth.ts                    # NextAuth config
│   ├── env.ts                     # Zod-validated process.env
│   ├── i18n.ts                    # FR/AR/EN helpers (pickFr, normalize)
│   ├── pricing.ts                 # HT → TTC computation
│   ├── visibility.ts              # profile.visible computation
│   ├── slug.ts                    # slug generation + collision handling
│   ├── api-response.ts            # standard JSON success/error wrappers
│   ├── api-error.ts               # AppError, ValidationError, NotFoundError, ...
│   ├── auth-guards.ts             # requireOwner(), requireAdmin()
│   ├── pusher.ts                  # real-time client
│   └── email/                     # Resend templates + sender
├── models/                        # one file per Mongoose model
│   ├── company.model.ts
│   ├── user.model.ts
│   ├── profile.model.ts           # discriminator: brandup | traceup | linkup
│   ├── transaction.model.ts
│   ├── rse-receipt.model.ts
│   ├── notification.model.ts
│   ├── boost.model.ts
│   ├── sponsoring.model.ts
│   ├── association.model.ts
│   ├── sector.model.ts            # B2B sectors + B2C categories (single collection, kind discriminator)
│   ├── gouvernorat.model.ts
│   └── admin-user.model.ts
├── services/                      # business logic (called from API routes)
│   ├── auth.service.ts
│   ├── company.service.ts
│   ├── profile.service.ts
│   ├── boost.service.ts
│   ├── rse.service.ts
│   ├── notification.service.ts
│   └── payment.service.ts
├── schemas/                       # Zod schemas (shared client/server)
│   ├── auth.schema.ts
│   ├── company.schema.ts
│   ├── profile.schema.ts
│   └── ...
├── types/                         # global TS types (enums, DTOs)
│   └── index.ts
├── middleware.ts                  # route protection
└── styles/
    └── globals.css                # Tailwind directives only

reference/                         # READ-ONLY — never modify these
.claude/skills/                    # custom skills available to Claude Code
```

---

## 4-bis. Static Assets — single source, mirrored to `public/`

**The single source of truth for shared static assets (logos, onboarding illustrations) lives in `reference/mockups/shared/`.** This folder mirrors the relative path used inside the HTML mockups so they remain visually functional when opened directly in a browser.

```
reference/mockups/
├── shared/                                         ← SOURCE — single editable location
│   ├── logos/
│   │   ├── logos-brandup.png
│   │   ├── logos-traceup.png
│   │   └── logos-linkup.png
│   └── onboarding-images/
│       ├── onboarding-images-b2b_img.jpg
│       └── onboarding-images-b2c_img.jpg
├── auth_*.html, dashboard_*.html, admin_*.html, public_*.html  ← reference paths like src="shared/logos/..."
└── README.md
```

**For Next.js to serve these at runtime, the same folder MUST also exist under `public/shared/`** — Next.js only serves files from `public/`, not from `reference/`.

### Mandatory setup step (Phase 0)

When initializing the project, copy the shared folder from the reference into `public/`:

```bash
mkdir -p public
cp -r reference/mockups/shared public/shared
```

This step is part of Phase 0 (see §9) and must be performed before the dev server runs. **If any logo or illustration is missing at runtime, this is almost always the cause** — re-run the cp command.

### Optional npm script to automate sync

If shared assets ever change (new logo, new onboarding image), keep `reference/mockups/shared/` as the single editable copy and re-sync:

```json
// package.json
{
  "scripts": {
    "sync-shared": "rm -rf public/shared && cp -r reference/mockups/shared public/shared",
    "prebuild": "npm run sync-shared",
    "predev": "npm run sync-shared"
  }
}
```

With this, `npm run dev` and `npm run build` auto-resync. Edit only `reference/mockups/shared/`; never edit `public/shared/` directly (it will be overwritten).

### Reference paths — HTML vs Next.js

The HTML mockups use **relative** paths (because they sit beside `shared/`):
```html
<!-- in reference/mockups/dashboard_index.html -->
<img src="shared/logos/logos-brandup.png" alt="BrandUP" />
```

The Next.js code uses **absolute** paths (because Next.js serves `public/` at `/`):
```tsx
// in src/components/...
<img src="/shared/logos/logos-brandup.png" alt="BrandUP" />
```

The only difference is the leading `/`. When porting a mockup, just prefix the path with `/`.

### External image domains

Avatars (`api.dicebear.com`) and placeholder banners (`picsum.photos`) and TraceUP thumbnails (`img.youtube.com`) are loaded from external CDNs. These must be whitelisted in `next.config.js` if you want to use `next/image`:

```ts
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "s1.dmcdn.net" },              // Dailymotion thumbnails
      { protocol: "https", hostname: "cdn.vivasky.media" },         // future production CDN
    ],
  },
};
```

If you stick to plain `<img>` tags during Phase 0–4 (port phase), you don't need this whitelist — the browser loads any URL. Add it before migrating to `next/image` (Phase 11 polish).

### What about uploaded company assets?

Logos, gallery images, RSE receipts, profile photos — these are user-uploaded files stored on object storage (S3 / R2). They live at `https://cdn.vivasky.media/uploads/...` and are referenced by URL in the DB. **Do not put them in `public/`** — they are dynamic, owner-scoped, and managed via `POST /api/v1/uploads` (see API_REFERENCE §11).

---

## 5. Coding Conventions

### Naming
- React components: `PascalCase.tsx` (e.g. `StatusPill.tsx`)
- Hooks: `useCamelCase.ts`
- Utilities: `kebab-case.ts` (e.g. `api-response.ts`)
- Mongoose models: `entity.model.ts`
- Zod schemas: `entity.schema.ts`
- API routes: `route.ts` in folders matching the URL path

### Imports
- Always use `@/` absolute aliases. **Never** `../../../`.
- Order within a file: external libs → internal `@/lib`, `@/models`, etc. → relative siblings → type-only imports last.
- Type-only imports use `import type { ... }`.

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
- Exported functions have explicit return types.
- Use `satisfies` for object literals instead of `as`.
- Never `as any`. Use `as unknown as T` only as last resort with a code comment explaining why.

### React/Next.js
- Default to **Server Components**. Use `"use client"` only when needed (forms, useState, useEffect, browser APIs).
- Data fetching in Server Components uses async functions calling services directly (no `fetch` to own routes).
- Forms use **React Hook Form + Zod resolver**.
- Loading states use `loading.tsx` (Suspense) per route segment.
- Errors handled by `error.tsx` per route segment.

### Tailwind
- Follow the **Fluent flat** design tokens documented in `.claude/skills/marketup-ui-canon/SKILL.md`.
- **No** `font-extrabold`, `rounded-2xl`/`rounded-3xl`, gradient hero backgrounds, or coloured shadows.
- Border radius: inputs/pills `rounded` (4px), buttons/cards `rounded-lg` (8px), modals `rounded-xl` (12px).

---

## 6. Critical Patterns (must follow)

### 6.1 The 3-tier validation pattern (the most important rule of the project)

Every editable field in `Company` and in each `Profile` falls into one of three zones:

| Zone | DB location | UX behaviour |
|---|---|---|
| **Live** (`liveData.*`) | written immediately on `PUT /me/account/live` | takes effect instantly, no admin review |
| **Data** (`data.*`) | written immediately for first-time `incomplete` fill; otherwise modifications go to `pendingData` | admin review required for changes |
| **Locked** | written only on signup, never editable after | RNE, vatNumber, accountEmail, type, country |

For profile-level edits: when a profile is `active` and the owner submits changes, write to `profile.pendingData` (not to `data`). The profile becomes **invisible publicly** until admin approves. On approve: merge `pendingData` into `data`, clear `pendingData`, re-publish. On reject: discard `pendingData`, keep `data`.

For company-level edits to validation-gated fields, write to `company.pendingUpdates` (the company stays `active`, profiles stay visible). Hard-change Company fields as of PP-12.5:

| Field | key in pendingUpdates |
|---|---|
| Nom d'entreprise | `data.displayName` |
| Logo | `data.logoUrl` |
| Bannière | `data.bannerUrl` |
| Gouvernorat | `liveData.gouvernorat` |
| Ville | `liveData.ville` |
| Adresse | `liveData.address` |

Live Company fields (instant, no admin review): `liveData.phone`, `liveData.whatsapp`, `liveData.contactEmail`, `liveData.languages`, `liveData.sectorId`, `liveData.gpsPosition`. Identity fields (User table): `firstName`, `lastName`.

**Read `reference/SEED_ARCHITECTURE.md` §4 before writing any service that touches profile or company content.**

### 6.2 Profile visibility is **computed**, never stored (PP-11.5 matrice 4 cas)

```ts
function isProfileVisible(
  profile: { status: ProfileStatus; isPublic: boolean; publishedAt?: Date | string | null },
  company: { status: CompanyStatus },
): boolean {
  if (company.status !== "active") return false;
  if (profile.status === "disabled" || profile.status === "incomplete") return false;
  if (!profile.isPublic) return false;
  // Cas 3: already published → visible even if pending/rejected (shows data, never pendingData)
  if (profile.publishedAt != null) {
    return profile.status === "active" || profile.status === "pending" || profile.status === "rejected";
  }
  // Cas 4: never published → only active
  return profile.status === "active";
}
```

A profile already validated at least once (`publishedAt` set) remains publicly visible with its **validated `data`** even while `pendingData` awaits admin review. This ensures QR codes, shared links, and SEO rankings are not disrupted by minor edits.

Never persist a `visible` column. Compute on every read. This makes suspension/reactivation reversible without dirty writes.

**Important:** `pendingData` is **never** exposed to the public. Public pages always read from `profile.data`.

### 6.3 Money is **HT in storage, TTC at read**

- Store `priceHT` (number, DT) and `vatRate` (number, e.g. `0.19`) per transaction.
- Compute `vatAmount = round(priceHT * vatRate, 2)` and `priceTTC = priceHT + vatAmount` at read-time.
- Snapshot `vatRate` per transaction so historical records stay correct if VAT changes.
- Display: `font-bold` on the number, `text-sm text-on-surface-variant` for the "DT" unit.
- French thousand separator: `1 250 DT` (non-breaking space). Never `1,250` or `1.250`.

### 6.4 i18n normalization at API boundary

The DB stores text as `{ fr, ar, en }`. **API responses always return a single string.**

```ts
// lib/i18n.ts
export function pickLocale(value: I18nString | string | null | undefined, lang: "fr" | "ar" | "en" = "fr"): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.fr || value.ar || value.en || "";
}
```

API route handlers read `?lang=` query param (default `fr`) and pass it to `pickLocale` for every i18n field.

### 6.5 Authentication

- Sessions only. JWT in headers is an **alternative** documented in API_REFERENCE_MARKETUP but **not the default** for this codebase.
- `middleware.ts` protects `/dashboard/*` (requires `role === "OWNER"`) and `/admin/*` (requires `role === "SUPER_ADMIN"`).
- Server actions and API routes additionally call `requireOwner()` or `requireAdmin()` from `@/lib/auth-guards`.
- **Never** trust client-sent `userId` / `companyId`. Always read from session.

### 6.6 Input validation

- **Every** API route validates its body with a Zod schema located in `@/schemas`.
- The **same** schema is imported by the client form (RHF resolver).
- Reject early: `400 { error: { code: "VALIDATION_FAILED", fields: { ... } } }`.

### 6.7 Errors

Use typed error classes. Catch at the API route boundary and map to standard responses.

```ts
// lib/api-error.ts
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}
export class NotFoundError extends AppError { /* status 404 */ }
export class AuthError extends AppError { /* 401 / 403 */ }
export class ValidationError extends AppError { /* 400 with .fields */ }
export class BusinessRuleError extends AppError { /* 422 */ }
```

### 6.8 Soft delete + audit

- Every model has `deletedAt: Date | null`. Default queries filter out non-null.
- Mutations on `Company`, `Profile`, `RseReceipt`, etc. append to an `auditTrail: { at, by, action, details }[]`.

### 6.9 Idempotency on payment endpoints

`POST /me/boost/checkout` and `POST /me/sponsoring/checkout` accept an `Idempotency-Key` header. Cache responses 24h keyed by `(userId, idempotencyKey)`. Return the cached response on retry.

### 6.10 TraceUP videos — hybrid hard/soft (updated PP-11, June 30 2026)

Per client feedback (demo May 22, decision Ahmed June 29): TraceUP video **additions** require admin review (hard change via `pendingData`). Video **deletions** remain instant (soft) when profile is active. Deletions are blocked during pending status.

- `createVideo()` writes to `pendingData.fields[key="videos"]` with a full snapshot (not to `data.videos`)
- Profile transitions to `pending` on first add (hidden publicly until admin validates)
- `deleteVideo()` is soft instant (active/rejected), blocked during pending
- `removeVideoFromPending()` lets the owner retract pending videos before admin review
- Auto-recovery: if pending snapshot matches `data.videos` → clear pending, restore previous status

### 6.11 Slug lifecycle — regeneration + 301 redirect (PP-12, July 6 2026)

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

### 6.12 Admin validation hub (PP-12, July 6 2026)

Single page `/admin/validation` with 4 tabs: Inscriptions · Modifications comptes · Profils · RSE. Tab active controlled by `?tab=` query param (deep-linkable).

- `listCompaniesWithPendingUpdates()`: active companies with `pendingUpdates !== null`
- 4th counter `companyUpdates` in `getPendingCountsForAdmin()`
- Old validation list pages (`/comptes`, `/profiles`, `/rse`) redirect to the hub
- Detail page "Retour" link infers tab from company status (pending → inscriptions, active → modifications)

---

## 7. API Conventions

- Base path: `/api/v1`
- Methods: GET, POST, PUT, DELETE (no PATCH unless explicitly required by the spec)
- All bodies and responses: `application/json`, snake_case in URLs, **camelCase in JSON**
- Pagination: `?page=N&limit=M` → `{ items, total, page, limit, totalPages }`
- Sorting: `?sort=field` or `?sort=-field`
- Date filters: `?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Search: `?q=...`
- Standard error body:
  ```json
  { "error": { "code": "STRING_UPPER_SNAKE", "message": "Human readable", "fields": { "field": "..." } } }
  ```

Every API route in `app/api/v1/.../route.ts` follows this skeleton:

```ts
import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { ProfileEditSchema } from "@/schemas/profile.schema";
import { updateProfile } from "@/services/profile.service";

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = ProfileEditSchema.parse(body); // throws ZodError → caught below
    const result = await updateProfile(session.user.companyId, params.type, parsed);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
```

`handleApiError` maps `ZodError → 400`, `AppError → e.status`, anything else → `500` + log.

---

## 8. Workflow with Claude Code

### Per-session pattern (recommended)

1. **`/clear`** at the start of each new feature to ensure clean context.
2. State the goal in one sentence: *"Implement the BrandUP profile CRUD endpoints (GET + PUT)."*
3. Ask: *"Read `CLAUDE.md`, then `reference/API_REFERENCE_MARKETUP.md` section 3, then `reference/mockups/dashboard_brandup.html`. Then propose a plan."*
4. Review the plan. Push back if it deviates from project structure or skips the 3-tier pattern.
5. Approve the plan, then ask for implementation.
6. **Read the diff** before saying "looks good". Run `npm run lint && npm run typecheck`.
7. Commit with a descriptive message.

### Skills to load on demand

When asked to do specific work, **always look in `.claude/skills/`** first:
- Data modelling? → `marketup-data-models/SKILL.md`
- API route? → `marketup-api-routes/SKILL.md`
- UI / component? → `marketup-ui-canon/SKILL.md`

### Don't

- Don't bundle multiple unrelated features in one session.
- Don't introduce new dependencies without explicit approval.
- Don't write CSS in JS or import raw CSS files. Tailwind classes only.
- Don't optimize prematurely. Make it correct, then make it fast if a profiler says so.
- Don't write tests for code that doesn't exist yet.
- Don't deviate from the project structure described in §4.
- Don't paraphrase rejection reasons or any text from `reference/marketup_seed_data.js` into your own words when seeding. Copy them verbatim — they're the demo canon.

---

## 9. Build Order (suggested phasing)

This is a suggested ordering; the human may override.

| Phase | Scope | Approx |
|---|---|---|
| **0 — Setup** | repo init, env vars, eslint, prettier, tsconfig, `lib/db.ts`, `lib/env.ts`, NextAuth scaffold, `middleware.ts` | 1 day |
| **1 — Models** | Mongoose models for all entities, seed script, `npm run db:seed` working | 2 days |
| **2 — Auth flow** | `/api/v1/auth/*`, `/(auth)/*` pages, email OTP via Resend | 3 days |
| **3 — Owner dashboard skeleton** | `/(dashboard)/*` layout + sidebar + topbar + `/me` endpoint | 1 day |
| **4 — Profile editing** | three profiles CRUD endpoints + dashboard pages | 5 days |
| **5 — Public search & profiles** | `/(public)/*` + search APIs | 4 days |
| **6 — Admin workspace** | `/(admin)/*` + validation endpoints | 4 days |
| **7 — Boost & Sponsoring** | endpoints + checkout flow + payment gateway integration | 3 days |
| **8 — RSE** | submission + admin validation + badge logic | 2 days |
| **9 — Notifications + real-time** | Pusher channels + bell dropdown | 2 days |
| **10 — Invoices + exports** | PDF generation + Excel export for admin | 2 days |
| **11 — Polish + E2E tests** | Playwright happy paths, accessibility check, perf budget | 3 days |

---

## 10. Commands

```bash
# Dev
npm run dev               # Start Next.js on :3000
npm run lint              # ESLint (fix with --fix)
npm run typecheck         # tsc --noEmit
npm run test              # Vitest (unit + integration)
npm run test:e2e          # Playwright

# DB
npm run db:seed           # Seed dev data (port from reference/marketup_seed_data.js)
npm run db:reset          # Drop + reseed (DEV ONLY)

# Build
npm run build
npm run start             # Production server

# Pre-commit checks (run all)
npm run lint && npm run typecheck && npm test
```

---

## 11. Quality Gates (before any commit)

1. `npm run lint -- --fix` passes
2. `npm run typecheck` passes
3. `npm test` passes (when tests exist)
4. Manual smoke test: page loads, no red console errors
5. Diff reviewed (no `console.log`, no `TODO` without ticket reference, no commented-out code)

If any gate fails, fix before committing.

---

## 12. Common Pitfalls (project-specific)

- **i18n leak:** returning a `{fr, ar, en}` object instead of a string from an API endpoint. Always pass through `pickLocale`.
- **Visibility drift:** writing `profile.visible` to the DB. Always compute.
- **VAT rounding:** computing TTC from a stored TTC instead of `priceHT * (1 + vatRate)`. Recompute every read.
- **Currency in EUR (€):** the platform is DT-only. There is no euro anywhere.
- **CSS in JS:** Tailwind classes only. No styled-components, no Emotion, no CSS Modules.
- **PendingData merge bugs:** when admin approves modifs, `data = { ...data, ...pendingData.fields-mapped }` is wrong. Use the explicit field map from `pendingData.fields[].newValue` keyed by `.key`.
- **TechnoFab canon drift:** the demo data must always show BrandUP rejected · TraceUP pending · LinkUP active+boosted. If your seed produces different states, the demo breaks.
- **TraceUP videos:** they don't go through `pendingData`. Direct CRUD only.

---

## 13. People & Roles

- **Owner** = the business person registered to the platform. One owner per company. Account email is the login.
- **Super Admin** = AGGREGAX / vivasky.media staff. Validates accounts, profiles, RSE receipts. Sees all transactions.
- The demo super admin is **Bassem Admin** (`bassem@vivasky.media`, avatar `BA` on purple `#5C2D91`).
- The demo owner is **Ahmed Mrabet** (`ahmed@technofab.tn`, avatar `AM`).

---

## 14. Out of Scope (V1)

- Mobile app (the reference doc `api_livreur_doc_reference.md` is from another product).
- Public profiles for users who don't own a company (LinkUP is company-owned only in V1).
- Multi-owner companies (1 company = 1 owner in V1).
- Advanced geo-search (`?near=lat,lng`) — deferred to V1.1.
- Sponsored video promotion (paid placement of a TraceUP video in another company's channel) — deferred.

---

*Last updated: May 12, 2026.*
*Maintained by: AGGREGAX SUARL — Ahmed Mrabet.*

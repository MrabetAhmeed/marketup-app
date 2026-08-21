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

The narrative demo entity across all mockups is **TechnoFab Industries** (B2B · Mecanique · Sousse · owner Ahmed Mrabet). Its three profiles are canonically:
- **BrandUP: rejected** (with a rejection reason)
- **TraceUP: pending** (first submission awaiting admin review)
- **LinkUP: active + boosted + active sponsoring campaign**

Honour this canon when seeding dev databases.

Mockup HTML filenames are documentation references, NOT literal Next.js routes. Full mapping: `reference/ROUTE_MAPPING.md`.

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
| Email | **Nodemailer** over client SMTP (see §3-bis) |
| File storage | **AWS S3** or **Cloudflare R2** behind a CDN |
| PDF generation | **@react-pdf/renderer** (lazy, server-side) |
| Tests | **Vitest** + **Playwright** for E2E |
| Lint | **ESLint** + **Prettier** (config provided) |

**Forbidden:** Material UI, MUI, Chakra, Mantine, Ant Design, Bootstrap, styled-components, Emotion, CSS Modules, raw CSS files (use Tailwind classes only).

---

## 3-bis. Email — SMTP via Nodemailer

Nodemailer connecte au SMTP du client. Si `SMTP_HOST` ou `SMTP_USER` vide, `sendEmail()` log un `console.warn` et return sans erreur. Architecture : `src/lib/email/sender.ts` (16 fonctions `send*`), templates dans `src/lib/email/templates/`.

**Regle dev local :** le filtre sortant SMTP (Infomaniak) rejette les emails contenant des liens `localhost` — c'est attendu. L'OTP (sans lien) passe. Pour tester les emails a liens, utiliser le serveur avec une URL https reelle.

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
│   └── email/                     # Nodemailer templates + sender
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
├── schemas/                       # Zod schemas (shared client/server)
├── types/                         # global TS types (enums, DTOs)
├── middleware.ts                  # route protection
└── styles/
    └── globals.css                # Tailwind directives only

reference/                         # READ-ONLY — never modify these
.claude/skills/                    # custom skills available to Claude Code
```

> **Static assets setup (logos, images):** see `reference/STATIC_ASSETS.md`. Key rule: source in `reference/mockups/shared/`, mirrored to `public/shared/` via `npm run sync-shared`.

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

For company-level edits to validation-gated fields, write to `company.pendingUpdates` (the company stays `active`, profiles stay visible). Hard-change Company fields as of FB-7a:

| Field | key in pendingUpdates |
|---|---|
| Nom d'entreprise | `data.displayName` |
| Logo | `data.logoUrl` |
| Banniere | `data.bannerUrl` |
| Gouvernorat | `liveData.gouvernorat` |
| Ville | `liveData.ville` |
| Adresse | `liveData.address` |
| Prenom du gerant | `liveData.gerantFirstName` |
| Nom du gerant | `liveData.gerantLastName` |
| Email de contact public | `liveData.contactEmail` |
| Telephone | `liveData.phone` |
| WhatsApp | `liveData.whatsapp` |

Live Company fields (instant, no admin review): `liveData.languages`, `liveData.sectorId`, `liveData.gpsPosition` (set via Leaflet pin in LinkUP dashboard — Nominatim removed in PP-12.6).

**Gerant identity (FB-7a):** `User.firstName`/`lastName` = identite declaree a l'inscription, NON affichee. `Company.liveData.gerantFirstName`/`gerantLastName` = identite publiee du gerant, modifiable uniquement via `pendingUpdates` + validation admin.

**GPS position (PP-12.6):** GeoJSON Point set via draggable map marker in LinkUP dashboard. Live field. Submitting LinkUP requires `gpsPosition != null` (guard `MISSING_GPS` 422). Nominatim fully removed.

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

Never persist a `visible` column. Compute on every read. **`pendingData` is never exposed to the public.** Public pages always read from `profile.data`.

### 6.3 Money is **HT in storage, TTC at read**

- Store `priceHT` (number, DT) and `vatRate` (number, e.g. `0.19`) per transaction.
- Compute `vatAmount = round(priceHT * vatRate, 2)` and `priceTTC = priceHT + vatAmount` at read-time.
- Snapshot `vatRate` per transaction so historical records stay correct if VAT changes.
- Display: `font-bold` on the number, `text-sm text-on-surface-variant` for the "DT" unit.
- French thousand separator: `1 250 DT` (non-breaking space). Never `1,250` or `1.250`.

### 6.4 i18n normalization at API boundary

The DB stores text as `{ fr, ar, en }`. **API responses always return a single string.**

```ts
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
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) { super(message); }
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

### 6.10–6.30 Implemented business rules — INDEX

> Full details: load skill **`marketup-business-rules`** (`.claude/skills/marketup-business-rules/SKILL.md`).

| # | Subject | Sprint |
|---|---|---|
| 6.10 | TraceUP videos: hybrid hard/soft add/delete | PP-11 |
| 6.11 | Slug lifecycle: regeneration + 301 redirect via `slugHistory` | PP-11 |
| 6.12 | Admin validation hub: 4 tabs, `?tab=` deep-linkable | PP-11 |
| 6.13 | Session invalidation: `passwordChangedAt` + S8 suspend/delete | PP-12 |
| 6.15 | Placeholder mode: `"hidden" \| "coming_soon"` for unpublished | PP-13 |
| 6.16 | Account deletion + suspension: 9-model cascade | PP-14 |
| 6.17 | Tracking stats: `ProfileStatsMonthly`, beacon, `<TrackView>` | PP-15a |
| 6.18 | Corbeille admin: restore cascade, `POST /admin/companies/[id]/restore` | PP-15b |
| 6.19 | Sponsoring dynamique: state machine, banner, stats, admin tab | C2 |
| 6.20 | Notification actions: read/read-all/delete, cross-tenant guard | FB-2 |
| 6.21 | Signup frontiere passwordHash: overwrite rules | FB-2 |
| 6.22 | Forgot-password non verifie: `ensureProfilesForCompany` | FB-2 |
| 6.23 | Obfuscation email support: `<ObfuscatedEmail />` | FB-2 |
| 6.24 | Secteurs referentiel: 50 secteurs, `SectorPickerModal` | FB-5 |
| 6.25 | Recherche refonte: auto-fetch, pagination 8/page, sector in bar | FB-3 |
| 6.26 | Timbre fiscal: `FISCAL_STAMP_DT = 1`, `computeTTC` 3e param | FB-6 |
| 6.27 | Visuels/finitions: boost star, RSE badge, CARTO tiles | FB-8 |
| 6.28 | Motif de refus pendingUpdates: `lastPendingRejection` | FB-7b |
| 6.29 | Notifications/emails validation compte | FB-7b |
| 6.30 | Document legal remplacable via `pendingUpdates` | FB-7b |

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
    const parsed = ProfileEditSchema.parse(body);
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
- Business rules (§6.10–6.30)? → `marketup-business-rules/SKILL.md`

### Don't

- Don't bundle multiple unrelated features in one session.
- Don't introduce new dependencies without explicit approval.
- Don't write CSS in JS or import raw CSS files. Tailwind classes only.
- Don't optimize prematurely. Make it correct, then make it fast if a profiler says so.
- Don't write tests for code that doesn't exist yet.
- Don't deviate from the project structure described in §4.
- Don't paraphrase rejection reasons or any text from `reference/marketup_seed_data.js` into your own words when seeding. Copy them verbatim — they're the demo canon.

---

## 9. Build Status & Roadmap

**PP-0 → PP-15b + SEC-1 delivered** (22 sprints, 210 tests green). Full sprint list: `reference/CHANGELOG.md`.

### Restant avant V1 prod

| Sprint | Scope |
|---|---|
| **C0–C3** | Monetisation complete (flag, boost, sponsoring, facturation) — **tout livre** |
| **PP-17** | Seed prod (donnees de production initiales, sans TechnoFab demo) |
| **DevOps** | Security headers S5, env prod, deploy pipeline |

---

## 9-bis. Deploiement

**Deployer via le BUILDER du dashboard Infomaniak** (`npm ci && npm run build`). **JAMAIS d'install/build en session SSH interactive** (CephFS tue les sessions longues). `git pull` en SSH est OK (operation legere). Details complets : `reference/DEPLOY.md`.

---

## 9-ter. Monetisation

Tout livre (C0–C3). Flag runtime `MONETIZATION_ENABLED` dans `env.ts` (OFF = fail-safe). Payment adapter pattern dans `src/lib/payment/` (simule en V1). Decisions produit D1–D12, transaction enums, pricing constants : voir `src/lib/pricing.ts`. Sprints W-B et W-CD livres : voir `reference/SPRINT_NOTES.md`.

---

## 10. Commands

```bash
npm run db:seed           # Seed dev data
npm run db:reset          # Drop + reseed (DEV ONLY)
```

**Apres un seed :** ouvrir une fenetre privee ou vider les cookies `next-auth.*` — un JWT stale provoque des 401.

---

## 11. Quality Gates (before any commit)

1. `npm run lint -- --fix` passes
2. `npm run typecheck` passes
3. `npm test` passes (when tests exist)
4. Manual smoke test: page loads, no red console errors
5. Diff reviewed (no `console.log`, no `TODO` without ticket reference, no commented-out code)

If any gate fails, fix before committing.

**Gate tsc — cache propre obligatoire :** le cache `tsbuildinfo` / `.next` peut masquer des erreurs preexistantes. Au demarrage de chaque sprint (Phase 0), executer `tsc --noEmit` sur un cache propre (`rm -rf .next tsconfig.tsbuildinfo` avant). Un tsc vert sur cache chaud ne prouve rien.

---

## 12. Common Pitfalls (project-specific)

- **i18n leak:** returning a `{fr, ar, en}` object instead of a string from an API endpoint. Always pass through `pickLocale`.
- **Visibility drift:** writing `profile.visible` to the DB. Always compute.
- **VAT rounding:** computing TTC from a stored TTC instead of `priceHT * (1 + vatRate)`. Recompute every read.
- **Currency in EUR:** the platform is DT-only. There is no euro anywhere.
- **CSS in JS:** Tailwind classes only. No styled-components, no Emotion, no CSS Modules.
- **PendingData merge bugs:** when admin approves modifs, use the explicit field map from `pendingData.fields[].newValue` keyed by `.key`. Never spread directly.
- **TechnoFab canon drift:** the demo data must always show BrandUP rejected · TraceUP pending · LinkUP active+boosted. If your seed produces different states, the demo breaks.

---

## 13. People & Roles

- **Owner** = business person, one per company. **Super Admin** = AGGREGAX/vivasky.media staff.
- Demo admin: **Bassem Admin** (`manager@vivasky.media`). Demo owner: **Ahmed Mrabet** (`ahmed@technofab.tn`).

---

## 14. Out of Scope (V1)

- Mobile app (the reference doc `api_livreur_doc_reference.md` is from another product).
- Public profiles for users who don't own a company (LinkUP is company-owned only in V1).
- Multi-owner companies (1 company = 1 owner in V1).
- Advanced geo-search (`?near=lat,lng`) — deferred to V1.1.
- Sponsored video promotion (paid placement of a TraceUP video in another company's channel) — deferred.

---

## Sprint notes (W-B, W-CD)

Detailed changes for Branding/Commandes/Banners (W-B) and Phone/RNE/PostalCode/CrossLinks (W-CD): see `reference/SPRINT_NOTES.md`.

---

*Last updated: August 20, 2026.*
*Maintained by: AGGREGAX SUARL — Ahmed Mrabet.*

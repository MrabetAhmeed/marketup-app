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

---

## 2-bis. Mockup filenames ≠ Next.js routes

Mockup HTML filenames are documentation references, NOT literal Next.js routes. The Next.js implementation uses dynamic routes (`[slug]`). All routes are implemented.

> **Full mapping table and rules:** see `reference/ROUTE_MAPPING.md`

Key rules: never create a file named after a company slug; TechnoFab mockups demonstrate template logic, not specific content; admin profile-detail uses one dynamic route branching on `profile.kind`.

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

## 3-bis. Email — SMTP client via Nodemailer

Resend a été remplacé par **Nodemailer** connecté au SMTP du client (PHPMailer credentials existants).

| Var | Description | Default |
|---|---|---|
| `SMTP_HOST` | Hostname du serveur SMTP | `""` (emails skippés si vide) |
| `SMTP_PORT` | Port SMTP (465 = SSL, 587 = STARTTLS) | `465` |
| `SMTP_SECURE` | Force TLS (`true`/`false`). Si absent : inféré (`true` si port 465) | *(auto)* |
| `SMTP_USER` | Login SMTP | `""` (emails skippés si vide) |
| `SMTP_PASS` | Mot de passe SMTP | `""` |
| `EMAIL_FROM` | Adresse expéditeur (doit correspondre au domaine/boite authentifiée — SPF/relay) | `onboarding@resend.dev` |

**Comportement dev :** si `SMTP_HOST` ou `SMTP_USER` est vide, `sendEmail()` log un `console.warn` et return sans erreur. Aucun email n'est envoyé.

**Vérification connectivité :** `npx tsx scripts/check-smtp.ts` — appelle `transporter.verify()`, ne send rien.

**Architecture :** `src/lib/email/sender.ts` expose 16 fonctions `send*`. Toutes passent par `sendEmail()` privé qui gère le transporter singleton. Les templates HTML sont dans `src/lib/email/templates/`. Chaque email est envoyé en multipart (HTML + text/plain auto-généré) pour la délivrabilité.

**Emails en dev local :** les templates contenant des liens construisent les URLs via `env.NEXTAUTH_URL` (`http://localhost:3000` en dev). Le filtre sortant SMTP (Infomaniak) rejette les emails avec des liens `localhost` — c'est attendu. L'OTP (sans lien) passe. Pour tester les emails à liens, utiliser le serveur avec une URL https réelle.

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
| Prénom du gérant | `liveData.gerantFirstName` |
| Nom du gérant | `liveData.gerantLastName` |
| Email de contact public | `liveData.contactEmail` |
| Téléphone | `liveData.phone` |
| WhatsApp | `liveData.whatsapp` |

Live Company fields (instant, no admin review): `liveData.languages`, `liveData.sectorId`, `liveData.gpsPosition` (set via Leaflet pin in LinkUP dashboard — Nominatim removed in PP-12.6).

**Gerant identity (FB-7a):** `User.firstName`/`lastName` = identité déclarée à l'inscription, resynchronisée en best-effort à chaque approbation admin, utilisée uniquement pour le guard de signup (`verifyOtp`) — NON affichée dans l'application. `Company.liveData.gerantFirstName`/`gerantLastName` = identité publiée du gérant, modifiable uniquement via `pendingUpdates` + validation admin ; source de vérité de l'affichage dashboard, des fiches admin et de la dénormalisation `ownerFullName`.

**GPS position (PP-12.6):** `Company.liveData.gpsPosition` is a GeoJSON Point set by the owner via a draggable map marker in the LinkUP dashboard editor. It is a live field (instant, no admin review). Submitting a LinkUP profile requires `gpsPosition != null` (guard `MISSING_GPS` 422). The Nominatim geocoding service has been fully removed — the pin is the sole source of GPS coordinates.

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

### 6.10–6.16 Implemented business rules (PP-11 → PP-14)

These rules are fully implemented and tested. **Summaries below; full details in `reference/BUSINESS_RULES_DETAILED.md`.**

- **6.10 TraceUP videos:** hybrid hard/soft — additions require admin review (`pendingData`), deletions are instant (soft). Deletions blocked during pending.
- **6.11 Slug lifecycle:** regeneration on displayName change + 301 redirect via `slugHistory`. `SlugRedirectError` extends `Error` (not `AppError`).
- **6.12 Admin validation hub:** single page `/admin/validation` with 4 tabs (Inscriptions · Modifications comptes · Profils · RSE), `?tab=` deep-linkable.
- **6.13 Session invalidation:** `passwordChangedAt` check in jwt() callback + S8 fix (suspended/deleted companies lose sessions). Fail-open on DB unreachable.
- **6.15 Placeholder mode:** `placeholderMode` enum `"hidden" | "coming_soon"` for `isPublic: false` profiles. Requires `publishedAt` set. Placeholder DTO is a strict whitelist (no data leak).
- **6.16 Account deletion + suspension:** owner self-delete cascades across 9 models (soft-delete). Admin suspend requires reason. Slugs remain reserved forever.
- **6.17 Tracking stats (PP-15a):** collection `ProfileStatsMonthly` (profileId + month YYYY-MM, unique index). Vues comptees par beacon client `<TrackView>` au mount reel (dedup sessionStorage, guard StrictMode). Clics sortants via `sendBeacon` sur ServicesGrid (s.external only). Endpoint `POST /api/v1/public/track` public, 204 always, bot filter UA, rate limit 60/min. `Profile.stats.viewsTotal/clicksTotal` incrementes en $inc parallele. `views30d` deprecie (conserve au schema, retire des DTO). Dashboard lit `ProfileStatsMonthly` mois courant + mois-1 pour tendance.
- **6.18 Corbeille admin (PP-15b):** onglet "Supprimees" dans `/admin/entreprises`, fiche detail consultable read-only pour les companies deleted (`withDeleted: true`). `restoreCompanyByAdmin()` = cascade inverse symetrique (9 models, match exact `deletedAt: cascadeTimestamp`, transaction Mongoose). E1: company jamais validee (`validatedAt null`) restauree en "pending". Profils retrouvent leur status exact d'avant (la cascade PP-14 n'ecrit que `deletedAt`, jamais `status`). Endpoint `POST /admin/companies/[id]/restore`. Email dedie "company-restored". StatusPill kind "deleted".

- **6.19 Sponsoring dynamique (C2):** workflow a etats : `pending` (demande owner) → `confirmed` (admin valide) → `active` (owner paie, from=paidAt, to=+7j) → `expired` (lazy). Terminaux : `rejected` (admin, raison obligatoire), `cancelled` (owner, pending/confirmed seulement — aucune annulation apres paiement V1). Guard anti-doublon : 1 seul sponsoring en pending|confirmed|active par (companyId, profileKind) → 409. rejected/cancelled/expired liberent le slot. Eligibilite demande : company active + profil du kind active+isPublic → sinon 422. Banniere publique : rotation aleatoire serveur parmi actifs du kind, mention "Sponsorise". Banniere defaut HTML/CSS quand aucun actif. Stats : impressions ($inc serveur au rendu SSR, fail-silent) + clics (sendBeacon sponsor_click → track endpoint, $inc fail-silent). Hub admin : onglet Sponsorings dans validation (5e tab), apercu banniere, lien cliquable, actions valider/refuser. Notifs : sponsoring_request_submitted (admin), sponsoring_validated (owner), sponsoring_rejected (owner), sponsoring_paid (admin+owner). 3 emails dedies + sendTransactionAdminEmail generique au paiement. Flag OFF : endpoints owner 403, admin accessible (lecture + valider/refuser).

- **6.20 Notification actions (FB-2):** 3 endpoints owner — `PATCH /me/notifications/read-all`, `PATCH /me/notifications/[id]/read`, `DELETE /me/notifications/[id]` (soft-delete). Tous requireOwner + cross-tenant guard strict (recipientId === session userId). UI optimiste (state local) sur la page + les cards. La cloche admin est un compteur de taches pending (pas de read/delete).

- **6.21 Signup frontiere passwordHash (FB-2):** a l'inscription, un user existant non verifie est ecrase SI il n'a PAS de passwordHash (etape 1 seule — le compte n'appartient a personne). Un user AVEC passwordHash (etape 2 faite) est refuse ("Cet email est deja utilise. Connectez-vous."). Au login, un user sans passwordHash recoit INVALID_CREDENTIALS generique (anti-enumeration). Le code SIGNUP_IN_PROGRESS est supprime.

- **6.22 Forgot-password non verifie (FB-2):** `forgotPassword` envoie le lien si le user a un passwordHash, MEME si emailVerifiedAt est null. `resetPassword` pose emailVerifiedAt + cree les 3 profils via `ensureProfilesForCompany` (idempotent, E11000-safe) si le user etait non verifie. `ensureProfilesForCompany` est la fonction partagee utilisee par verifyOtp, login (lazy filet) et resetPassword.

- **6.23 Obfuscation email support (FB-2):** l'email de support (`manager@vivasky.media`) n'apparait JAMAIS en clair dans le HTML source des pages rendues. Composant `<ObfuscatedEmail />` (client, assemble user+domain au mount via JS). Constante dans `src/lib/constants/support-email.ts`. Les emails HTML (templates Nodemailer) conservent l'email en clair (pas d'obfuscation dans un email).

- **6.24 Secteurs referentiel definitif (FB-5):** 50 secteurs (25 B2B en 7 poles, 25 B2C en 8 groupes). Model Sector a 3 nouveaux champs : `group` (libelle du pole), `groupOrder` (tri des poles), `description` (texte entre parentheses). Le seed remplace integralement les anciens secteurs. Le modal picker `SectorPickerModal` remplace le dropdown de selection : titres de poles NON cliquables, items numerotes avec description, recherche interne. Gouvernorats tries alphabetiquement. Les secteurs suivent l'ordre des poles du client (PAS alphabetique).

- **6.25 Recherche refonte (FB-3):** resultats affiches au chargement (auto-fetch au mount, limit 200). Pagination client 8/page (retour page 1 a chaque recherche). Secteur integre dans la barre de recherche (a cote de la ville). Liste "Populaire" retiree. Padding haut conserve, bas reduit. Ville + gouvernorat ajoutes au haystack texte des 3 moteurs (cherchable sans placeholder). Placeholders : BrandUP "Entreprise, secteur, activite…" · TraceUP "Entreprise, secteur, titre de video…" · LinkUP "Entreprise, contact, secteur…". Banniere sponsor filtre par `appliedSectorId` (apres recherche validee, pas au changement de filtre). Hauteur banniere h-[180px] md:h-[270px].

- **6.26 Timbre fiscal (FB-6):** `FISCAL_STAMP_DT = 1` (non soumis a la TVA). `computeTTC(priceHT, vatRate, fiscalStampDT)` — 3e param optionnel (default 0, retrocompat). Transaction.fiscalStampDT (Number, default 0). Boost = 50 HT + 9,50 TVA + 1 timbre = 60,50 TTC. Sponsoring = 100 HT + 19 TVA + 1 timbre = 120 TTC. Affichage : ligne "Timbre fiscal" dans les modals de checkout, billing owner, admin transactions. Retrocompat : transactions anciennes (stamp 0) n'affichent pas la ligne. Aucun montant hardcode dans les UI — tout derive des constantes pricing.

- **6.27 Visuels et finitions (FB-8):** Cards de recherche : boosted = etoile doree en overlay (rond, coin haut-droit), RSE = texte vert "RSE attestee" (remplace le pill gold). Badge RSE public : icone ESG (`public/badges/esg-icon.svg`, fill #1A2B8C) + libelle HTML "ENGAGEMENT SOCIAL ATTESTE" bleu marine a cote (responsive). Texte RSE : "Nous contribuons activement a la vie locale…". RseSection au canon (font-bold, rounded-xl, pas de gradient). Carte : tiles CARTO Light (`basemaps.cartocdn.com/light_all`). Admin : liens sociaux cliquables dans la fiche de validation (target=_blank + open_in_new). Notification in-app au refus RSE (`rse_receipt_rejected`, kind+icon+color coherents).

- **6.28 Motif de refus pendingUpdates (FB-7b):** `rejectPendingUpdates` exige un `rejectionNote` (min 3 caractères). Le motif est stocké dans `Company.lastPendingRejection { note, rejectedAt }` (visible au owner via MeResponse, jamais dans un DTO public) ET dans `auditTrail.details.note`. Le champ `lastPendingRejection` est effacé (`null`) à la prochaine soumission de modifications par l'owner. Le refus d'inscription (compte) reste inchangé (motif dans `Company.rejectedReason`).

- **6.29 Notifications/emails validation compte (FB-7b):** `approvePendingUpdates` et `rejectPendingUpdates` envoient notification in-app (`account_updates_approved` / `account_updates_rejected`) + email au owner. Les deux sont non-bloquants (try/catch). Les emails listent les labels des champs concernés. Le refus inclut le motif.

- **6.30 Document légal remplaçable (FB-7b):** `Company.identityDocumentUrl` est remplaçable via `pendingUpdates` (key `"identityDocumentUrl"`). Upload via `POST /api/v1/me/legal-document` (requireOwner, PDF/JPG/PNG, 2 Mo, catégorie storage `identity-docs`). Coexistence : l'ancien reste dans `identityDocumentUrl`, le nouveau dans `pendingUpdates.fields[].newValue`. Approbation : le nouveau remplace l'ancien. Refus : `storage.delete(newUrl)` best-effort, l'ancien demeure.

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
| **C0** | Socle monetisation (flag, guard, adapter, helper boost) — **livré** |
| **C3** | Facturation (billing owner, admin transactions, invoice numbering) — **livré** |
| **C1** | Boost dynamique (checkout, activation, expiration, shuffle search) — **livré** |
| **C2** | Sponsoring (voir §9-ter) — **livré** |
| **PP-17** | Seed prod (donnees de production initiales, sans TechnoFab demo) |
| **DevOps** | Security headers S5, env prod, deploy pipeline |

---

## 9-bis. Déploiement (Infomaniak / serveur RAM-limité)

Le conteneur de production dispose de **~1.5 Go RAM**. Sans les garde-fous ci-dessous, `next build` SIGABRT (OOM) lors de la phase "Generating static pages".

| Paramètre | Valeur | Où |
|---|---|---|
| `experimental.cpus` | `1` | `next.config.mjs` — limite les workers de static generation à 1 thread |
| `NODE_OPTIONS` | `--max-old-space-size=1536` | variable d'environnement serveur (build + start) |

**Rationale :** Next.js lance par défaut autant de workers que de CPU logiques. Sur un conteneur mutualisé avec peu de RAM, chaque worker consomme ~300-500 Mo → OOM. `cpus: 1` force un seul worker. `--max-old-space-size=1536` plafonne le heap V8 sous la limite conteneur.

**Impact local :** le build est légèrement plus lent (~+30 %) car mono-worker. Le runtime (`next start`, `next dev`) est **inchangé**.

**Règle de déploiement :** `git pull → npm run build → restart service`. Pas de CI/CD automatisé en V1 — déploiement manuel via SSH.

---

## 9-ter. Monetisation (C0 socle — sprint courant)

**Flag runtime** : `MONETIZATION_ENABLED` dans `env.ts`. Absent ou invalide = **OFF** (fail-safe). Pas de `NEXT_PUBLIC_*` — lu au runtime uniquement. Un seul code/build, plusieurs deploiements (`.env` different par environnement).

**Comportement OFF** : pages boost/sponsoring/billing = `FeatureComingSoonPage` (identique a avant). Endpoints monetisation futurs = `requireMonetization()` → 403 `MONETIZATION_DISABLED`.

**Comportement ON** : flux complet avec paiement **simule** (pas de PSP reel en V1).

### Adapter pattern (payment)

`src/lib/payment/` — meme pattern que `src/lib/storage/` :
- `types.ts` : `PaymentAdapter` interface (`createCheckout`, `verifyPayment`)
- `simulated.ts` : adapter simule (paiement instantane, reference `SIM-...`)
- `index.ts` : singleton `payment`, switch sur `PAYMENT_ADAPTER` env var (default `"simulated"`)
- Point de branchement PSP futur = nouvel adapter, zero refonte

### Decisions produit (D1-D12)

| # | Decision |
|---|---|
| D1 | Boost = **50 DT HT / 30 jours** (`lib/pricing.ts` constants) |
| D2 | Boost par **profileKind** (pas par company) |
| D3 | Multi-profils simultanes OK, mais **jamais 2 actifs/pending sur le meme (companyId, profileKind)** |
| D4 | Renouvellement **manuel** |
| D5 | Sponsoring = **100 DT HT / 7 jours** |
| D6 | Banniere sponsoring = **search uniquement** (pas sur pages profil public) |
| D7 | Rotation = **aleatoire par affichage** |
| D8 | Ciblage = **par moteur seul** (brandup/traceup/linkup) |
| D9 | Facture = **numero + page detail, PAS de PDF V1** |
| D10 | Admin transactions = **inclus en C3** |
| D11 | Notif paiement admin = **in-app + email** |
| D12 | `paid_simulated` = label owner **"Paye"**, mention "(test)" **admin only** |

### Roadmap monetisation

| Sprint | Scope | Depend |
|---|---|---|
| **C0** | Flag + guard + PaymentAdapter + helper boost + pricing constants | — | **livré** |
| **C3** | Facturation : page billing, endpoint transactions, admin transactions, `generateInvoiceNumber` (MU-YYYY-NNNNN, Counter atomique). Admin voit toujours (pas de requireMonetization). D12 : owner voit "paid" pour paid_simulated, admin voit "Payé (test)". | C0 | **livré** |
| **C1** | Boost : `checkoutBoost` (Mongoose session atomique Transaction+Boost), `expireStaleBoosts` lazy dans getMe, shuffle Fisher-Yates boosted x3 search, page dashboard 3 cards + modal checkout, notifs owner+admin in-app, email admin generique `sendTransactionAdminEmail`, `createNotification` generique. Guard anti-doublon `findActiveBoosts` (pas de status pending sur Boost). Renouvellement apres expiration seulement (D4). **Guard R1** : checkout exige `profile.status === "active" && isPublic === true` (422 BOOST_PROFILE_NOT_PUBLIC). **R1.4** : un boost deja actif n'est PAS coupe si le profil change d'etat ensuite (pas de pause/remboursement V1, expire naturellement). | C0+C3 | **livré** |
| **C2** | Sponsoring : machine a etats (pending/confirmed/active/expired/rejected/cancelled), workflow demande→validation admin→paiement→banniere. SponsorBanner dynamique + defaut HTML/CSS. Stats impressions/clics. Hub admin onglet Sponsorings. | C0+C3 | **livré** |

### Transaction model enums

`status` : `"pending"` | `"paid"` | `"paid_simulated"` | `"refunded"` | `"failed"`
`paymentMethod` : `"card"` | `"bank_transfer"` | `"manual"` | `"simulated"`

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

**Gate tsc — cache propre obligatoire :** le cache `tsbuildinfo` / `.next` peut masquer des erreurs préexistantes. Au démarrage de chaque sprint (Phase 0), exécuter `tsc --noEmit` sur un cache propre (`rm -rf .next tsconfig.tsbuildinfo` avant). Un tsc vert sur cache chaud ne prouve rien.

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

- **Owner** = the business person registered to the platform. One owner per company. Account email is the login.
- **Super Admin** = AGGREGAX / vivasky.media staff. Validates accounts, profiles, RSE receipts. Sees all transactions.
- The demo super admin is **Bassem Admin** (`manager@vivasky.media`, avatar `BA` on purple `#5C2D91`).
- The demo owner is **Ahmed Mrabet** (`ahmed@technofab.tn`, avatar `AM`).

---

## 14. Out of Scope (V1)

- Mobile app (the reference doc `api_livreur_doc_reference.md` is from another product).
- Public profiles for users who don't own a company (LinkUP is company-owned only in V1).
- Multi-owner companies (1 company = 1 owner in V1).
- Advanced geo-search (`?near=lat,lng`) — deferred to V1.1.
- Sponsored video promotion (paid placement of a TraceUP video in another company's channel) — deferred.

---

*Last updated: July 25, 2026.*
*Maintained by: AGGREGAX SUARL — Ahmed Mrabet.*

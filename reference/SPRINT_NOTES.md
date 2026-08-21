# Sprint Notes — Changes livrees

> Historique detaille des sprints recents. Consulter quand on travaille sur les fonctionnalites concernees.

---

## W-B Sprint Changes (August 2026)

### Branding: MARKET-UP → vivasky.media
- **BRAND_NAME constant:** `src/lib/constants/brand.ts` — `BRAND_NAME = "vivasky.media"`, `BRAND_EMAIL_FOOTER = "vivasky.media - Tunisie"`.
- All UI, emails, metadata now use `vivasky.media` instead of `MARKET-UP`.
- Email display name: `vivasky.media <email@...>`.
- Copyright: `© 2026 Vivaskymedia s.a.r.l. Tous droits reserves. Developpee par AGGREGAX.` (year auto-extends after 2026).

### Facturation → Commandes
- **URL:** `/dashboard/billing` → `/dashboard/commandes` (301 redirect in `next.config.mjs`).
- **Vocabulary:** "Facturation" → "Commandes", "N° de facture" → "N° de commande" everywhere.
- **Numbering format:** `YYYY-NNNNN` (e.g. `2026-00001`). Old `MU-` prefix removed. Counter key unchanged (`invoice-{year}`).

### Search titles per B2B/B2C type
`PRODUCT_TITLES` in `SearchPageClient.tsx` — 6 combinations (3 engines x 2 types):
- BrandUP B2B: "La reference des acteurs economiques tunisiens" / "Au coeur des marques"
- BrandUP B2C: "La reference des marques en Tunisie" / "Au coeur des marques"
- TraceUP: "Le flux video de l'economie tunisienne" / "L'actualite des entreprises pres de chez vous"
- LinkUP: "L'acces direct a l'economie tunisienne" / "S'interconnecter et echanger"

### Banner system
- **Public banner ratio:** `aspect-ratio: 4/1` (replaces fixed heights `h-[180px] md:h-[270px]`).
- **Default images:** `public/banners/default-{brandup,traceup,linkup}.jpg` per engine. HTML/CSS fallback if image missing.
- **"En savoir plus" button:** HTML overlay `absolute bottom-3 right-3`, default banner only.
- **Dashboard preview:** `aspect-ratio: 4/1`, recommended `1600x400 px`.
- **URL paste mode:** disabled via `_switchMode` prefix (code preserved).

---

## W-CD Sprint Changes (August 2026)

### Phone/WhatsApp normalization (+216)
- **Helper:** `src/lib/phone.ts` — `normalizeTunisianPhone()` + `tunisianPhoneSchema` (Zod).
- Rules: 8 digits → `+216XXXXXXXX`, `216+8` → `+216`, `+216+8` → OK, any other prefix → rejected.
- Applied to **3 schemas**: `auth.schema.ts`, `account.schema.ts`, `account-resubmit.schema.ts`.
- To open other countries: add their codes in `phone.ts` and adjust the regex.

### RNE format (legalId)
- **Format:** `^\d{7}[A-Z]$` (7 digits + 1 uppercase letter, e.g. `1234567A`).
- Validated at signup only. `legalId` is `immutable: true` — existing accounts unaffected.

### Required fields at signup (new registrations only)
- `identityDocumentUrl`: now required (was optional). Label: "Document officiel recent (RNE)".
- `address`: now required (was optional).
- `postalCode`: new field, required. Format: 4 digits (Tunisian standard).
- Existing accounts without these fields are never blocked (Zod server tolerant on account edit).

### Postal code (Company.liveData.postalCode)
- **Obligatoire** au signup, modifiable depuis le Compte via `pendingUpdates` (validation admin).
- LinkUP editor: **lecture seule** (renvoi vers le Compte).
- Affichage public: integre dans `fullAddress` (`ProfileHero`).
- Admin validation: affiche dans la fiche + diff de pendingUpdates.

### Cross-links par entreprise
- `CrossLinks` component receives `slug` + `visibleProfiles` (sibling profile visibility).
- Cards point to `/{kind}/{slug}` (enterprise-specific, not generic engine homepage).
- Card hidden if target profile is not publicly visible.
- `siblingProfiles` computed in `public-profile.service.ts` for all 3 profile types.
- **"Catalogue de Production" → "Nos activites"** (public + editor).

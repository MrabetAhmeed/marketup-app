# CONVENTIONS AND POLICIES — MARKET-UP

**Date :** 23 mai 2026
**Etat :** post-demo, pre-V1.1
**Ce document complete** `RESUME_CONVERSATION_22_MAI.md` et `PROJECT_TRANSFERT_v3.md`

---

## Table des matieres

- [Section 13 — Race condition admin valide 2 profils en parallele](#section-13--race-condition-admin-valide-2-profils-en-parallele)
- [Section 14 — Storage policy quand pendingData annule](#section-14--storage-policy-quand-pendingdata-annule)
- [Section 15 — 3 endroits qui lisent liveData.phone](#section-15--3-endroits-qui-lisent-livedataphone)
- [Section 16 — Conventions commits](#section-16--conventions-commits)
- [Section 17 — Companies seed actuelles](#section-17--companies-seed-actuelles)
- [Section 18 — Composants partages dashboard / admin](#section-18--composants-partages-dashboard--admin)
- [Section 19 — Bug cache .next](#section-19--bug-cache-next)
- [Section 20 — Methodologie debug Sprint 7C+++](#section-20--methodologie-debug-sprint-7c)

---

## Section 13 — Race condition admin valide 2 profils en parallele

### Protection actuelle

**Aucune protection explicite (lock optimiste, version field, transaction).**

Le code utilise `findByIdAndUpdate` avec un filtre implicite (le profile doit exister), mais :

```ts
// admin-profile.service.ts
const profile = await ProfileModel.findById(profileId).lean();
if (profile.status !== "pending") throw BusinessRuleError("NOT_PENDING");
// ... build setMap ...
await Model.findByIdAndUpdate(profileId, { $set: setMap });
```

C'est un pattern read-then-write NON-atomique. Entre le `findById` et le `findByIdAndUpdate`, un autre request peut avoir deja valide le profil.

### Comportement observe en cas de double-click

1. **Meme profil, 2 onglets :** les 2 requests lisent `status: "pending"`, les 2 passent le guard, les 2 font `findByIdAndUpdate`. La 2eme est un no-op (meme $set) — pas de corruption, mais 2 emails envoyes.

2. **2 profils differents :** aucun probleme — operations independantes.

### Fix recommande V1.1

Remplacer le read-then-write par un `findOneAndUpdate` atomique avec filtre sur status :

```ts
const result = await Model.findOneAndUpdate(
  { _id: profileId, status: "pending" },
  { $set: setMap },
  { new: true },
);
if (!result) throw new BusinessRuleError("NOT_PENDING", "...");
```

---

## Section 14 — Storage policy quand pendingData annule

### Question : que devient le fichier uploade ?

Quand un user fait :
1. Upload image → `POST /api/v1/uploads/image` → fichier sauve dans `public/uploads/companies/{id}/gallery/`
2. Ajoute a gallery → `POST /api/v1/profiles/[id]/gallery` → ecrit dans `data.gallery`
3. Submit → `POST /profiles/[id]/submit` → snapshot dans `pendingData.fields[gallery].newValue`
4. Cancel → `DELETE /profiles/[id]/pending` → `pendingData` = null, status restaure

### Ce que fait le code de cancel

```ts
// profile-hard.service.ts — cancelPendingSubmission()
await Model.findByIdAndUpdate(profileId, {
  $set: {
    status: previousStatus,
    pendingData: null,
    submittedAt: null,
  },
});
```

**Le fichier dans `public/uploads/` N'EST PAS supprime.** Aucun code de cleanup.

L'image reste aussi dans `data.gallery` (car elle y a ete ajoutee par le POST /gallery en etape 2, qui est un write soft).

### Consequences

- **Pas de fuite de stockage critique** en V1 — les images restent dans `data.gallery` et sont donc toujours referencees
- **Mais :** si le user cancel apres avoir supprime une image de la gallery (qui etait dans le newValue mais pas dans le proposed gallery), cette image est perdue dans le pending mais reste dans `data.gallery`
- **V1.1 backlog :** implementer un cron de cleanup qui supprime les fichiers orphelins (references par aucun document en DB)

---

## Section 15 — 3 endroits qui lisent liveData.phone

### Les 3 (+1) lieux dans le code

| # | Fichier | Ligne | Contexte |
|---|---------|-------|----------|
| 1 | `src/services/public-profile.service.ts` | 148 | `phone: company.liveData.phone ?? null` — pages publiques (BrandUP, TraceUP, LinkUP) |
| 2 | `src/services/me.service.ts` | 231 | `phone: company.liveData.phone ?? null` — dashboard /me endpoint |
| 3 | `src/services/account.service.ts` | 36 | `setMap["liveData.phone"] = patch.phone` — ecriture PATCH /me/account |
| +1 | `src/services/account-resubmit.service.ts` | 44 | `"liveData.phone": payload.phone ?? company.liveData?.phone` — resubmit |

### Les 3 endroits qui lisent liveData.whatsapp (meme pattern)

| # | Fichier | Contexte |
|---|---------|----------|
| 1 | `public-profile.service.ts:149` | Pages publiques |
| 2 | `profile-editor.service.ts:227` | Dashboard LinkUP editor (fallback contactCard) |
| 3 | `admin-profile.service.ts:245` | Admin review LinkUP (fallback contactCard) |

### Pourquoi data.phone n'existe pas

`data.phone` n'existe pas dans le schema Company. Les coordonnees de contact (phone, whatsapp, contactEmail, address, ville) vivent dans `liveData.*` car elles sont modifiables sans admin review (live changes). Seuls `displayName`, `logoUrl`, `bannerUrl` sont dans `data.*` (validation-gated).

C'est une decision d'architecture Phase 5 : les coordonnees sont un concern transversal (affichees sur les 3 profils), pas un champ de profil individuel. `liveData` est la source de verite unique.

---

## Section 16 — Conventions commits

### 10 derniers commits (git log --oneline)

```
c1ed99a docs: add session summary for conversation transfer (22 mai - sprints 7)
bb5cd0f docs: update transfer files for pre-demo-improvements complete state
0abce76 fix(pre-demo-7c-plus-plus-plus): currentGallery snapshot read from pendingData
e832484 wip(sprint-7c): all BrandUP hard change — NOT browser-tested
452cc07 feat(pre-demo-7b): enrich admin visibility + console-style navigation
d68a713 feat(pre-demo): hide certifications + auto-create 3 profiles on signup
2d77aa9 docs: update transfer files for Phase 5 + 6 complete state
f0e04a6 feat(phase-5): public search engines + profile pages + popups + seed enrichment
a2a5dc8 feat(phase-6-sprint-2c): user-driven correction + suspend/reactivate + 5-layer gating
36bab4e wip(phase-6-sprint-2c): code livre, non teste en browser
```

### Convention etablie

- **Format :** Conventional Commits (`type(scope): description`)
- **Types utilises :** `feat`, `fix`, `wip`, `docs`
- **Scope :** phase ou sprint (`phase-5`, `sprint-7c`, `pre-demo-7b`, `pre-demo-7c-plus-plus-plus`)
- **Langue :** anglais pour le message principal, francais autorise dans le detail
- **wip :** utilise pour les commits non testes en browser (etape intermediaire avant test Ahmed)
- **Co-Authored-By :** `Claude <noreply@anthropic.com>` (ajoute par Claude Code)
- **Tags :** `phase-5-complete`, `phase-6-complete`, `pre-demo-improvements`

---

## Section 17 — Companies seed actuelles

### Companies dans `reference/marketup_seed_data.js` (verifie par extraction du seed le 23 mai 2026)

| ID | Slug | displayName | Type | Secteur | Ville | Status Company | BrandUP | TraceUP | LinkUP |
|----|------|-------------|------|---------|-------|---------------|---------|---------|--------|
| c-001 | technofab-industries | TechnoFab Industries | B2B | mecanique | Sahline | active | **rejected** | **pending** | **active** (boosted) |
| c-002 | mediacom | MediaCom | B2B | marketing | Tunis | active | active | active | active |
| c-003 | greenlife-bio | GreenLife Bio & Naturel | B2C | alimentation | Sousse | active | active | incomplete | active |
| c-004 | buildtech-construction | BuildTech Construction | B2B | btp | Tunis | **pending** | incomplete | **disabled** | active |
| c-005 | foodcorner-restaurant | FoodCorner | B2C | restauration | Sfax | **suspended** | active | active | active |
| c-006 | archstudio-architecture | ArchStudio | B2B | architecture | Tunis | **pending** | active | active | active |
| c-007 | autoplus | AutoPlus | B2B | automobile-pro | Sousse | active | active | active | active |
| c-008 | pharmatn | PharmaTN | B2C | sante | Tunis | **pending** | incomplete | incomplete | incomplete |
| c-009 | edupro | EduPro Formation | B2B | formation-pro | Tunis | active | active | active | **disabled** |
| c-010 | textiltunis | TextilTunis | B2B | textile | Ksar Hellal | active | **rejected** | **rejected** | active |

**Notes :**
- c-001 (TechnoFab) est la company canonique de la demo avec les 3 status differents
- c-005 (FoodCorner) est suspendue (litige facturation — utile pour tester le flow suspended)
- c-004, c-006, c-008 sont pending (pour tester les queues admin)
- c-004 TraceUP et c-009 LinkUP sont `disabled` (pas `incomplete` — profils existants desactives intentionnellement dans le seed)
- 7 companies B2B, 3 companies B2C
- 5 active, 3 pending, 1 suspended, 0 rejected au niveau company

### Compte admin

Un seul admin : **Bassem Admin** (`bassem@vivasky.media`), role `SUPER_ADMIN`.

### Aggregax (compte test Sprint 7X)

Aggregax etait un compte test cree manuellement en browser pour verifier le bug Sprint 7X (profils non crees a signup). **Il n'est PAS dans le seed.** Il existe seulement si la DB de dev a ete utilisee avec le flow signup reel. Pas d'ID fixe — c'est un ObjectId genere dynamiquement.

---

## Section 18 — Composants partages dashboard / admin

### Liste complete de `src/components/shared/`

| Composant | Usage dashboard | Usage admin | Description |
|-----------|----------------|-------------|-------------|
| `StatusPill.tsx` | AccountForm, BrandUpEditor, TraceUpEditor, LinkUpEditor, OverviewProfiles, RseReceiptsList | — | Pill colore (active/pending/rejected/...) |
| `StatusDot.tsx` | DashboardSidebar | — | Point colore dans la sidebar |
| `MoneyAmount.tsx` | — | — | Formatte `1 250 DT` avec separateur |
| `FieldBadge.tsx` | AccountForm | — | Badge "Verrouille" / "En direct" / "Validation" |
| `Toast.tsx` | — | ProfileReviewActions, CompanyReviewActions, RseReviewActions, EntreprisesPage | Notifications toast (useToast hook) |
| `DashboardSidebar.tsx` | Toutes pages dashboard | — | Sidebar navigation owner |
| `DashboardTopbar.tsx` | Toutes pages dashboard | — | Topbar avec avatar + company name |
| `PublicProfileHeader.tsx` | — | — | Header pages publiques profils |
| `PublicSearchHeader.tsx` | — | — | Header pages publiques search |
| `PublicFooter.tsx` | — | — | Footer pages publiques |
| `PopupHeader.tsx` | — | — | Header popups search results |
| `ProfileStatusBlock.tsx` | — | — | Block status profil |
| `EmptyState.tsx` | — | — | Placeholder "aucun contenu" |
| `SectionHeader.tsx` | — | — | Titre de section avec icone |
| `CopyGroup.tsx` | — | — | Copier dans le clipboard |
| `AuthLeftPanel.tsx` | — | — | Panel gauche pages auth |
| `AuthErrorBanner.tsx` | — | — | Banniere d'erreur auth |
| `OtpInput.tsx` | — | — | Input 6 digits OTP |
| `PasswordInput.tsx` | — | — | Input password avec toggle visibility |
| `AppLauncher.tsx` | — | — | Grid d'apps (onboarding) |
| `LangChip.tsx` | — | — | Chip langue (FR/AR/EN) |
| `FeatureComingSoonPage.tsx` | — | — | Placeholder "Bientot disponible" |

### Composant partage dashboard + admin

Seul **`Toast.tsx`** est utilise a la fois cote dashboard (pas directement, mais via les features) et cote admin (via les ReviewActions).

### Duplications intentionnelles

| Duplication | Justification |
|-------------|---------------|
| `profile-editor.service.ts` / `admin-profile.service.ts` | Le service editor construit les donnees pour le dashboard owner (avec overlay pendingData). Le service admin construit les donnees pour la review admin (avec diff current/new). Les shapes de sortie sont differentes (editor = formulaire editable, admin = comparaison). |
| `getModelForKind()` dans 3 fichiers | Re-declare dans `admin-profile.service.ts`, `profile-hard.service.ts`, `profile-soft.service.ts`. Chaque service importe ses propres discriminator models. Pas un helper partage car chaque service a des imports differents. |
| `buildBrandUp()` dans 2 fichiers | `profile-editor.service.ts` (pour dashboard) et `admin-profile.service.ts` (pour admin review). La version admin inclut `pendingGallery` et `currentGallery` pour le diff. |

---

## Section 19 — Bug cache .next (Sprint 7C+++)

### Contexte

Survenu sur localhost dev (`npm run dev`) apres le Sprint 7C+++ — multiples modifications en cascade : schema Mongoose (ajout `previousStatus` au sub-schema pendingData), types TypeScript, services (profile-hard, profile-editor, admin-profile), et composants React (BrandUpEditor, admin review page).

### Symptome exact

Apres un hot reload, le navigateur affichait une page blanche avec des erreurs 404 dans la console :

```
GET http://localhost:3000/_next/static/chunks/main-app.js          404
GET http://localhost:3000/_next/static/chunks/app-pages-internals.js 404
GET http://localhost:3000/_next/static/chunks/app/(dashboard)/dashboard/brandup/page.js 404
GET http://localhost:3000/_next/static/css/app/layout.css           404
```

Toutes les pages etaient cassees (pas seulement la page modifiee).

### Cause

Le cache `.next/` a ete corrompu par le hot reload de Next.js apres trop de modifications successives en cascade (schema Mongoose → types TS → services → composants). Next.js tente de servir des chunks compiles references par un manifeste perime, mais les fichiers physiques ont ete regeneres avec de nouveaux hashes.

### Fix applique

```bash
# 1. Arreter le serveur dev
Ctrl+C

# 2. Supprimer le cache .next
# PowerShell :
Remove-Item -Recurse -Force .next
# Ou bash :
rm -rf .next

# 3. Relancer
npm run dev
```

### Prevention

- **Apres un gros refactor en cascade** (schema → types → services → composants) : arreter le serveur, supprimer `.next/`, relancer
- **Indicateur :** si les 404 touchent `main-app.js` ou `app-pages-internals.js` (fichiers core Next.js), c'est toujours un probleme de cache — ne pas chercher de bug dans le code
- **En production :** toujours `rm -rf .next && npm run build` avant de deployer

---

## Section 20 — Methodologie debug Sprint 7C+++

### Le bug : les tags NOUVEAU ne s'affichaient jamais

#### Symptome

Apres un submit BrandUP avec une nouvelle image gallery, le dashboard et l'admin n'affichaient aucun tag "NOUVEAU" (vert) sur les nouvelles images. Toutes les images etaient marquees "kept" dans le diff.

#### Hypothese 1 — le diff code est faux

Le code de diff compare `currentValue` (pre-edit) avec `newValue` (post-edit). Si une image est dans newValue mais pas dans currentValue, elle est "added" (NOUVEAU).

Test : inspecter les `pendingData.fields[gallery]` en DB apres un submit.

**Resultat :** `currentValue` et `newValue` contenaient les MEMES images (y compris la nouvelle). Donc le diff voyait tout comme "kept".

#### Hypothese 2 — currentValue est lu depuis le mauvais endroit

Le service `buildBrandupPendingFields()` utilisait `data.gallery` comme `currentValue`. Mais `data.gallery` contenait deja la nouvelle image (car le POST /gallery ecrit en soft dans `data.gallery` AVANT le submit).

**Confirmation :** en ajoutant un `console.log` de `data.gallery` au moment du submit, la nouvelle image etait deja dedans.

#### Root cause identifiee

Le POST /gallery (Phase 1, sprint 4) ecrit directement dans `data.gallery` — c'est du soft write. Quand ensuite le submit (Phase 3, sprint 7C) lit `data.gallery` comme "etat actuel avant edits", il y trouve deja la nouvelle image.

#### Fix v1 (client-side snapshot)

Le client envoie `currentGallery` dans le body du submit — c'est le snapshot de la gallery telle qu'elle etait AVANT que le user commence a editer.

Ajoute au schema Zod :
```ts
currentGallery: z.array(GalleryItemSchema).optional(),
```

Et dans `buildBrandupPendingFields()` :
```ts
const currentGallery = parsed.currentGallery
  ? parsed.currentGallery.map(...)
  : (data.gallery ?? []);
```

#### Pourquoi fix v1 a ete valide (pas rejete)

Le fix v1 a bien ete le fix final. Le fichier `RESUME_CONVERSATION_22_MAI.md` mentionne un "Fix v2" cote service, mais c'etait une amelioration complementaire : le service `buildBrandUp()` (pour l'affichage dashboard) lit aussi le `currentGallery` depuis `pendingData.fields[gallery].currentValue` au lieu de `data.gallery`, pour la coherence du diff visuel.

#### Timeline des fixes

1. **Sprint 7C** : tous les champs BrandUP hard change (pitch, about, gallery)
2. **Sprint 7C+** : router.refresh() apres submit/cancel, tags visuels NOUVEAU/SUPPRIMEE
3. **Sprint 7C++** : previousStatus dans pendingData (bug strict:true Mongoose)
4. **Sprint 7C+++** : currentGallery snapshot (le vrai bug — timing Phase 1 soft vs Phase 3 hard)

# WORKFLOWS REFERENCE — MARKET-UP

**Date :** 23 mai 2026
**Etat :** post-demo, pre-V1.1
**Ce document complete** `RESUME_CONVERSATION_22_MAI.md` et `PROJECT_TRANSFERT_v3.md`

---

## Table des matieres

- [Section 7 — Flow "Admin clique Valider"](#section-7--flow-admin-clique-valider)
- [Section 8 — Flow upload image gallery](#section-8--flow-upload-image-gallery)
- [Section 9 — Login d'un user en status rejected](#section-9--login-dun-user-en-status-rejected)
- [Section 10 — Propagation Account.liveData vers profils publics](#section-10--propagation-accountlivedata-vers-profils-publics)
- [Section 11 — Search /brandup query MongoDB](#section-11--search-brandup-query-mongodb)
- [Section 12 — Protection contre profile sans kind](#section-12--protection-contre-profile-sans-kind)

---

## Section 7 — Flow "Admin clique Valider"

### Trace complete du click au refresh

#### 1. Composant React (`src/components/features/admin/ProfileReviewActions.tsx`)

Le bouton "Valider" emet un `POST /api/v1/admin/profiles/[profileId]/validate` via `fetch()`. Utilise le hook `useToast` de `@/components/shared/Toast` pour feedback.

#### 2. Route handler (`src/app/api/v1/admin/profiles/[profileId]/validate/route.ts`)

```ts
export async function POST(_req: NextRequest, { params }) {
  const session = await requireAdmin();      // Auth guard SUPER_ADMIN
  const { profileId } = await params;
  await validateProfileByAdmin(profileId, session.user.id);
  return jsonOk({ validated: true });
}
```

#### 3. Service (`src/services/admin-profile.service.ts`)

`validateProfileByAdmin(profileId, adminId)` :
1. Load profile par ID (`.lean()`)
2. Guard `status !== "pending"` → throw `BusinessRuleError`
3. Select discriminator model via `getModelForKind(kind)`
4. Build `setMap` : status=active, publishedAt=now, pendingData=null, rejectionReason=null
5. Pour chaque `pendingData.fields[]` : `setMap[data.${field.key}] = field.newValue`
6. `Model.findByIdAndUpdate(profileId, { $set: setMap })` — une operation atomique

#### 4. Side effects

- **Email :** `sendProfileValidatedEmail()` via Resend (non-blocking try/catch)
- **Audit log :** PAS IMPLEMENTE en V1 (backlog)
- **Notification en base :** PAS IMPLEMENTE en V1 (backlog)

#### 5. Revalidation UI

Le composant `ProfileReviewActions` fait un `router.refresh()` apres le POST reussi, ce qui re-fetch la page server-side et rafraichit les donnees.

---

## Section 8 — Flow upload image gallery

### Trace complete

#### 1. Composant

Le dashboard BrandUP editor (`BrandUpEditor.tsx`) a un formulaire d'upload. L'image est d'abord uploadee via `POST /api/v1/uploads/image` (retourne `{ url }`), puis ajoutee a la gallery via `POST /api/v1/profiles/[id]/gallery`.

#### 2. Route handler (`src/app/api/v1/profiles/[profileId]/gallery/route.ts`)

```ts
export async function POST(req, { params }) {
  const session = await requireOwner();
  const { profileId } = await params;

  // Load profile + cross-tenant guard
  const profile = await ProfileModel.findById(profileId).lean();
  // ... ownership check ...

  // Kind check — gallery only for BrandUP
  if (profile.kind !== "brandup") throw ...;

  // Gallery limit check (MAX_GALLERY = 9)
  const currentGallery = profile.data?.gallery ?? [];
  if (currentGallery.length >= 9) throw ...;

  // Validate body
  const parsed = GalleryAddSchema.parse(body);  // { url: string, title: string }

  // Create gallery item
  const newItem = {
    id: crypto.randomUUID(),
    url: parsed.url,
    caption: { fr: parsed.title, ar: "", en: "" },
    order: currentGallery.length,
  };

  // Push via BrandUp discriminator model
  await BrandUpModel.findByIdAndUpdate(profileId, {
    $push: { "data.gallery": newItem },
  });

  return jsonOk({ id, url, caption, order }, 201);
}
```

#### 3. Point critique — write SOFT dans data.gallery

Cette route ecrit **directement dans `data.gallery`** (pas dans pendingData). C'est du "Phase 1" soft write.

Quand ensuite le user fait un hard submit (POST /submit), le service `buildBrandupPendingFields()` utilise le `currentGallery` envoye par le client comme snapshot pre-edit (pas `data.gallery` qui contient deja la nouvelle image). C'est le fix du Sprint 7C+++ pour eviter que le diff soit faux.

#### 4. Storage

L'image est stockee via `POST /api/v1/uploads/image` qui utilise le `LocalStorageAdapter` (ou Cloudinary en prod). Le fichier est sauve dans `public/uploads/companies/{companyId}/gallery/`.

**Pas de cleanup au cancel** — voir Section 14.

---

## Section 9 — Login d'un user en status rejected

### Que se passe-t-il exactement ?

#### auth.service.ts — login()

```ts
// Rejected: allow login (user can correct + resubmit)
// Active: allow login (normal flow)
// All others: block
if (company.status !== "active" && company.status !== "rejected") {
  if (company.status === "pending")
    throw new AuthError("COMPANY_PENDING", ...);
  if (company.status === "suspended")
    throw new AuthError("COMPANY_SUSPENDED", ...);
  throw new AuthError("COMPANY_NOT_ACTIVE", ...);
}
```

**Resultat :** un user `rejected` PEUT se connecter. C'est intentionnel — il doit corriger son dossier et resoumettre.

#### Dashboard pour un user rejected

Le `guardActiveCompany()` dans `src/lib/auth-guards.ts` :

```ts
export function guardActiveCompany(companyStatus: CompanyStatus): void {
  if (companyStatus === "rejected") {
    redirect("/dashboard/account/edit?reason=rejected");
  }
  if (companyStatus === "suspended") {
    redirect("/login?error=COMPANY_SUSPENDED");
  }
  if (companyStatus === "pending") {
    redirect("/login?error=COMPANY_PENDING");
  }
}
```

**Resultat :** toutes les pages dashboard SAUF `/account/edit` appellent `guardActiveCompany()`, donc le user rejected est toujours redirige vers la page d'edition du compte.

#### Les 5 couches de defense

1. **JWT callback** — inclut `companyStatus` dans le token
2. **Layout SSR** — charge `companyStatus` et appelle `guardActiveCompany()`
3. **Page guards** — chaque page dashboard appelle `guardActiveCompany()`
4. **Sidebar mask** — cache les liens non-pertinents pour rejected
5. **Topbar mask** — indicateur visuel du status

#### Endpoints autorises pour rejected

- `PATCH /api/v1/me/account` — modifier liveData (phone, email, etc.)
- `POST /api/v1/me/account/resubmit` — resoumettre le dossier (avec nouveau PDF si necessaire)
- `POST /api/v1/me/account/logo` et `banner` — re-upload

#### Company suspended

Login **bloque** au niveau `auth.service.ts` (throw `COMPANY_SUSPENDED`). Le user ne peut pas se connecter du tout.

#### Company pending

Login **bloque** au niveau `auth.service.ts` (throw `COMPANY_PENDING`). Le user ne peut pas se connecter.

---

## Section 10 — Propagation Account.liveData vers profils publics

### Confirmation : c'est une lecture LIVE, pas une copie

Les pages publiques lisent **directement** `company.liveData.*` a chaque requete. Il n'y a PAS de copie dans `profile.data`.

#### Code de la page publique

`src/app/(public)/brandup/[slug]/page.tsx` :

```ts
export default async function BrandUpProfilePage({ params }) {
  const { slug } = await params;
  const data = await getPublicProfileBySlug("brandup", slug);
  return <BrandUpPublic data={data} />;
}
```

#### Le service `getPublicProfileBySlug` (`src/services/public-profile.service.ts`)

```ts
// Dans resolveCompanyBase() — appele pour chaque profil public :
return {
  contactEmail: company.liveData.contactEmail ?? company.accountEmail,
  phone: company.liveData.phone ?? null,
  whatsapp: company.liveData.whatsapp ?? null,
  address: company.liveData.address ?? null,
  ville: company.liveData.ville,
  // ...
};
```

#### Pourquoi pas une copie ?

Le design est delibere : quand le owner modifie `liveData.phone` via `PATCH /me/account`, le changement est immediatement visible sur TOUS les profils publics (BrandUP, TraceUP, LinkUP) sans aucune synchronisation manuelle.

#### Exception : LinkUP contactCard

Le `contactCard` dans `profile.data.contactCard` contient AUSSI des champs `phone`, `whatsapp`, `email`. Mais le code lit en priorite `company.liveData` :

```ts
// profile-editor.service.ts buildLinkUp():
whatsapp: liveData.whatsapp ?? contactCard.whatsapp ?? null,
```

Le contactCard est un fallback pour les donnees seed. En V1.1, les champs dupliques du contactCard seront nettoyes.

---

## Section 11 — Search /brandup query MongoDB

### Fichier : `src/services/public-search.service.ts`

### Architecture de la recherche

La recherche n'utilise PAS `$text` MongoDB. Elle fonctionne en 3 etapes :

#### Etape 1 — Trouver les companies actives

```ts
const companyQuery = { status: "active" };
if (filters.type) companyQuery.type = filters.type;
if (filters.gouvernorat) companyQuery["liveData.gouvernorat"] = filters.gouvernorat;
if (filters.sectorId) companyQuery["liveData.sectorId"] = filters.sectorId;

const companies = await CompanyModel.find(companyQuery).lean();
```

**Index utilises :** `{ status: 1, registeredAt: 1 }`, `{ liveData.sectorId: 1, status: 1 }`, `{ liveData.gouvernorat: 1, status: 1 }`

#### Etape 2 — Trouver les profils visibles

```ts
const profiles = await ProfileModel.find({
  companyId: { $in: companyIds },
  kind: profileKind,
  status: "active",
  isPublic: true,
  pendingData: null,
}).lean();
```

**Note :** les 4 conditions de `isProfileVisible()` sont ici appliquees directement dans la query MongoDB (sauf `company.status` qui est deja filtre a l'etape 1).

#### Etape 3 — Filtrage texte client-side

```ts
// Normalisation accents (NFD + strip diacritics + lowercase)
function normalize(str) { ... }

// AND logic: chaque token doit matcher
function buildAndRegex(q) {
  return normalize(q).split(/\s+/).map(t => new RegExp(t, "i"));
}

// BrandUP: displayName + pitch + about + sectorName
const haystack = normalize([displayName, pitch, about, sectorName].join(" "));
return regexes.every(r => r.test(haystack));
```

**C'est du filtrage in-memory, pas une query MongoDB.** Toutes les companies/profils actifs sont charges d'abord, puis filtres. C'est un backlog V1.1 de passer a `$text` index pour scalabilite.

#### Tri

```ts
// Boosted first, then by registeredAt desc
filtered.sort((a, b) => {
  const aBoosted = boostedCompanyIds.has(companyId) ? 1 : 0;
  const bBoosted = boostedCompanyIds.has(companyId) ? 1 : 0;
  if (aBoosted !== bBoosted) return bBoosted - aBoosted;
  return bDate - aDate;  // registeredAt desc
});
```

#### Pagination

```ts
const paginated = filtered.slice((page - 1) * limit, page * limit);
```

Skip/limit client-side (pas cursor MongoDB).

### Differences entre les 3 moteurs

| Moteur | Haystack de recherche |
|--------|----------------------|
| BrandUP | displayName + pitch + about + sectorName |
| TraceUP | displayName + sectorName + video titles + video descriptions |
| LinkUP | displayName + sectorName + fullName + title + bio + company |

TraceUP et LinkUP utilisent aussi le BrandUP pitch comme description fallback dans les cards de recherche.

---

## Section 12 — Protection contre profile sans kind

### Defenses en place

#### 1. Schema niveau — `kind` est le discriminatorKey

Le champ `kind` n'est PAS declare explicitement dans le schema — il est injecte automatiquement par Mongoose quand on utilise un discriminator model. Si on cree via `ProfileModel.create()` (le base model), le `kind` ne sera PAS present.

**Il n'y a PAS de `kind: { required: true, enum: [...] }` dans le base schema.** C'est Mongoose qui gere.

#### 2. Index unique compound `{ companyId, kind }`

```ts
ProfileSchema.index({ companyId: 1, kind: 1 }, { unique: true });
```

Cet index :
- Empeche 2 profils du meme kind pour la meme company
- Empeche un profil sans kind d'etre duplique (mais n'empeche pas un seul profil sans kind)

**Test existant :** `src/models/__tests__/profile.model.test.ts` ligne 61 :
```ts
it("the (companyId, kind) compound index is unique", async () => { ... });
```

#### 3. Pattern PROFILE_MODELS[kind].create()

La seule protection effective est le pattern de creation :

```ts
// auth.service.ts — verifyOtp() et login()
for (const kind of ["brandup", "traceup", "linkup"] as const) {
  try {
    await PROFILE_MODELS[kind].create({
      companyId: user.companyId,
      status: "incomplete",
      isPublic: true,
      data: {},
    });
  } catch (err: unknown) {
    // Ignore E11000 duplicate key
    if (err instanceof Error && "code" in err && (err as any).code !== 11000) throw err;
  }
}
```

Ce pattern garantit que :
- Le discriminator model injecte `kind` automatiquement
- Les defaults `data.*` sont appliques par le sub-schema
- Le `try/catch E11000` rend l'operation idempotente

#### 4. Ce qui MANQUE (V1.1)

- **Pas de MongoDB validator** au niveau collection (pas de `$jsonSchema` qui exige `kind`)
- **Pas de pre-save hook** qui throw si `!kind`
- **Pas de validation post-creation** qui verifie que les 3 profils existent et ont le bon kind
- Un call direct `ProfileModel.create({ companyId, ... })` sans discriminator serait silencieusement accepte par MongoDB (mais sans `kind`, donc invisible a la plupart des queries qui filtrent par kind)

**Risque en V1 :** faible — seul le code cree des profils, et les 2 endroits (verifyOtp + login) utilisent le pattern correct. Mais pour la robustesse V1.1, une validation post-creation est recommandee.

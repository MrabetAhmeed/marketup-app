# SEED_ARCHITECTURE.md

**Projet** : MARKET-UP (vivasky.media)
**Document** : Architecture du fichier `marketup_seed_data.js`
**Version** : 1.0
**Date** : 2026-04-22
**Auteur** : AGGREGAX SUARL — Ahmed Mrabet
**Audience** : audit qualité, équipe développement Next.js + MongoDB

---

## 0. Executive Summary

`marketup_seed_data.js` est la **source unique de données** pour les maquettes HTML statiques de MARKET-UP. Sa structure est conçue pour mimer **à 1:1 le futur schéma MongoDB**, ce qui rend la migration vers Next.js + Mongoose mécanique : chaque entité du seed devient un model Mongoose, chaque helper devient une méthode de model ou une route API.

**Décisions structurantes** :
1. Convention **camelCase** uniforme (compatibilité Mongoose/JavaScript)
2. **Embed** pour les relations 1:N bornées (profils, transactions, reçus RSE, historique boost/sponsoring)
3. **Reference** (collection séparée) pour les relations many-to-many ou cross-entity (litiges, notifications, référentiels)
4. Pattern de validation à 3 zones : `liveData` (instant), `data` (publié), `pendingData` (en attente d'admin)
5. **Visibilité computed** au read-time, jamais stockée (réversibilité des suspensions)
6. **Multilingue ready** : structure `{ fr, ar, en }` sur tous les contenus rédactionnels (FR populé V1, AR/EN vides en attendant)
7. **Mono-utilisateur par entreprise V1**, structure prévue pour l'évolution multi-user V1.1+
8. 5 statuts profil : `incomplete | pending | active | rejected | disabled`

**Contraintes business respectées** :
- Modèle B strict : tout profil avec `pendingData` est invisible publiquement
- Cascade : suspension d'un compte → invisibilité des 3 profils (sans muter `profile.status`)
- Monnaie : DT (dinar tunisien) avec TVA 19%, calcul `ttc = ht * 1.19`

---

## 1. Conventions globales

### 1.1 Nommage des champs

**camelCase** sur tous les champs.

```js
// ✅ Conforme
{ displayName: "...", validationStatus: "active", pendingData: null }

// ❌ À éviter
{ display_name: "...", validation_status: "active", pending_data: null }
```

**Justification** : Mongoose et JavaScript natifs utilisent camelCase. Les conversions snake_case ↔ camelCase à la lecture/écriture coûtent en lisibilité et créent des bugs subtils. Aucun plugin Mongoose officiel ne gère le snake_case proprement.

**Exception** : les status enums sont en lowercase plat (`"active"`, `"pending"`, jamais `"Active"` ni `"isActive"`).

### 1.2 Identifiants

**Format en seed** : `{prefix}-{NNN}` avec préfixe par type d'entité.

| Préfixe | Entité |
|---|---|
| `c-` | Company |
| `t-` | Transaction |
| `r-` | RseReceipt |
| `b-` | Boost |
| `s-` | Sponsoring |
| `n-` | Notification |
| `d-` | Dispute |
| `a-` | Association (référentiel partenaires) |
| `u-` | AdminUser |
| `v-` | Video (TraceUP) |
| `g-` | Gallery image (BrandUP) |

**Justification** : ces IDs human-readable facilitent le debug et l'audit pendant le dev des maquettes. On voit immédiatement à quoi un ID fait référence.

**En production MongoDB** : remplacés par des `ObjectId` 24-hex via le script `seed-import.js` (à coder en phase Next.js). Toutes les références (ex: `transaction.companyId: "c-001"`) sont résolues lors de l'insert.

**Important** : les profils embedés **n'ont pas d'ID propre** — ils sont identifiés par le tuple `(companyId, profileType)`. Ex : le BrandUP de TechnoFab = `companies['c-001'].profiles.brandup`.

### 1.3 Slugs

Format : lowercase, ASCII, hyphenated, no special chars.

```js
"technofab-industries"   // ✅
"mediascom-tunis"        // ✅
"TechnoFab Industries"   // ❌ (uppercase, space)
"techno_fab"             // ❌ (underscore)
```

**Génération** : depuis `company.data.displayName.fr` via `slugify` lib au moment de l'inscription. Lockée après création (modification = ticket support, impact SEO).

**Unicité** : `companies.slug` doit être unique. Index unique en MongoDB.

### 1.4 Dates

Format **ISO 8601 UTC** : `"2026-04-15T10:30:00.000Z"`.

```js
registeredAt: "2026-01-15T08:00:00.000Z"   // ✅
registeredAt: "15/01/2026"                  // ❌ (locale-dependent)
registeredAt: "2026-01-15"                  // ⚠️ (date seule, OK si pas de heure)
```

**Justification** : Mongoose convertit automatiquement en `Date` à l'insert. Pas de timezone locale stockée — toujours UTC. Affichage formaté côté UI selon `Intl.DateTimeFormat` et la locale utilisateur.

**Cas spécial** : les dates "calendaires" sans heure (ex: `donationDate` d'un reçu RSE) peuvent être stockées en `"YYYY-MM-DD"` pour clarté sémantique.

### 1.5 Monnaie

Stockée en **`Number` (entier DT)** dans le seed. Ex : `50` pour 50 DT HT, `5200` pour 5200 DT.

```js
priceHT: 50,           // 50 DT HT
priceHT: 100,          // 100 DT HT
amount: 5200           // 5200 DT (donation RSE)
```

**TVA calculée à la volée** : `ttc = ht * (1 + vatRate)`. Le rate est dans `platformSettings.pricing.vatRate` (= 0.19).

```js
const priceTTC = priceHT * 1.19;  // 50 → 59.5 DT TTC
```

**En production MongoDB** : type recommandé `Decimal128` pour les montants financiers (évite les floating-point errors sur les multiplications). Mongoose schema :
```js
{ type: mongoose.Schema.Types.Decimal128, get: v => parseFloat(v.toString()) }
```

**Helpers d'affichage** :
- `formatMoneyHT(50)` → `"50,00 DT HT"` (virgule pour FR)
- `formatMoneyTTC(50, 0.19)` → `"59,50 DT TTC"`
- `formatMoneyAR(50)` → `"50,00 د.ت"` (V1.1)

### 1.6 Multilingue (i18n object pattern)

**Tous les contenus rédactionnels saisis par l'utilisateur** sont stockés comme objets `{ fr, ar, en }`.

```js
// ✅ Pattern multilingue (V1 : FR populé, AR/EN vides)
displayName: { fr: "TechnoFab Industries", ar: "", en: "" }
pitch:       { fr: "Spécialiste mécanique...", ar: "", en: "" }

// ❌ String simple (à éviter pour les contenus user-generated)
displayName: "TechnoFab Industries"
```

**Quels champs sont multilingues** :
- `data.displayName`
- `data.pitch` (BrandUP)
- `data.videos[].title` (TraceUP)
- `data.videos[].description` (TraceUP)
- `data.contactCard.title` (LinkUP — fonction du contact)
- `data.contactCard.bio` (LinkUP — bio courte si présente)
- `data.links[].label` (texte du lien, ex "Site web" / "موقعنا" / "Website")
- `data.services[].name` (V1.1 si BrandUP a des services listés)
- `rejectionReason` (admin écrit en FR par défaut, traduit en V1.1)

**Quels champs ne sont PAS multilingues** (mono-langue / structurés) :
- IDs, slugs, URLs, emails, phones
- Dates, codes monétaires, codes couleur (hex)
- Status enums, types, references (sectorId, gouvernorat, country)
- Documents URLs (legal-id.pdf, banner.jpg)
- Adresses physiques (Tunis se dit Tunis partout)
- Noms de personnes (firstName, lastName)
- Numéros (legalId, fiscalId)

**Règle simple** : si c'est du **contenu rédactionnel** que l'utilisateur écrit lui-même, c'est multilingue. Si c'est de la **donnée structurelle** (ID, code, référence, format normé), c'est string.

**Validation côté seed** : champs multilingues doivent **toujours** avoir au minimum `{ fr: "..." }` non vide pour les profils `active`. AR/EN peuvent être vides jusqu'à V1.1.

**Migration vers full multilingue V1.1** : aucune migration de schéma nécessaire — on ajoute juste du contenu dans les champs `ar` et `en` existants. Le frontend fait `pitch[currentLocale] || pitch.fr` pour fallback.

### 1.7 URLs de placeholders (dev seed only)

Pour les maquettes statiques, les assets utilisent des services déterministes gratuits qui ne demandent ni clé API ni stockage local.

| Asset | Service | Pattern |
|---|---|---|
| **Logo entreprise** | [DiceBear initials](https://www.dicebear.com/) | `https://api.dicebear.com/7.x/initials/svg?seed={CompanyName}&backgroundColor={hex}` |
| **Bannière compte** | [Picsum seed](https://picsum.photos/) | `https://picsum.photos/seed/{companyId}-banner/1200/400` |
| **Galerie BrandUP (4-8 images)** | Picsum seed | `https://picsum.photos/seed/{companyId}-brandup-img-{N}/800/600` |
| **Photo contact LinkUP** | DiceBear avataaars | `https://api.dicebear.com/7.x/avataaars/svg?seed={FullName}` |
| **Vidéos YouTube** | URLs publiques curées | `https://www.youtube.com/embed/{videoId}` |
| **Vidéos Dailymotion** | URLs publiques curées | `https://www.dailymotion.com/embed/video/{videoId}` |
| **Vidéos Vimeo** | URLs publiques curées | `https://player.vimeo.com/video/{videoId}` |
| **Thumbnails vidéos** | URLs natives plateformes | YouTube: `https://img.youtube.com/vi/{id}/hqdefault.jpg` (Dailymotion/Vimeo via oEmbed côté serveur) |

**Avantages** :
- **Déterministes** : même seed = même asset à chaque chargement
- **Gratuits** : pas de quota, pas de clé API
- **CDN-cached** : rapides après premier accès
- **Indépendants** : fonctionnent même offline si le navigateur a mis en cache

**En production** : remplacer par uploads sur S3/Backblaze/Cloudflare R2. Les URLs en seed servent uniquement à la phase maquette + tests dev locaux.

### 1.8 Dossier `shared/` pour les documents (PDFs)

Pour les documents que l'utilisateur upload (identifiant légal, reçus RSE), un dossier dédié à la racine du projet :

```
/marketup-project/
├── shared/
│   ├── sample-legal-id.pdf      ← document fictif partagé par les 20 entreprises
│   ├── sample-rse-receipt.pdf   ← reçu RSE fictif partagé par tous les reçus
│   └── README.md                 ← documentation interne du dossier
└── ...
```

**Toutes les `c-001` à `c-020` du seed pointent vers `/shared/sample-legal-id.pdf`** :
```js
identityDocumentUrl: "/shared/sample-legal-id.pdf"
```

**Tous les reçus RSE pointent vers `/shared/sample-rse-receipt.pdf`** :
```js
receiptDocumentUrl: "/shared/sample-rse-receipt.pdf"
```

**Justification** :
- 1 fichier réel suffit pour démontrer le flow (admin clique → PDF s'ouvre)
- Pas de pollution de stockage pendant le dev
- Réaliste : en prod, chaque entreprise aura son propre upload S3 → on remplace juste l'URL

---

## 2. Top-level Structure (`window.MARKETUP_DATA`)

```js
window.MARKETUP_DATA = {
  // ===== Métadonnées du seed =====
  _meta: {
    version: "1.0",
    schemaUpdatedAt: "2026-04-22T00:00:00.000Z",
    demoAdminId: "u-001",
    currentUserCompanyId: "c-001"  // identifie "qui est loggé" pour les pages dashboard
  },

  // ===== Entité principale (avec sub-entities embedded) =====
  companies: [/* 20 entreprises */],

  // ===== Collections séparées (relations cross-entity) =====
  disputes: [/* 2 litiges ouverts */],
  notifications: [/* notifications par récipient */],
  adminUsers: [/* 1-2 admins V1 */],

  // ===== Référentiels (lookup read-only) =====
  sectorsB2B: [/* 25 secteurs avec i18n names */],
  categoriesB2C: [/* 25 catégories */],
  gouvernorats: [/* 24 gouvernorats TN avec villes principales */],
  associations: [/* 4-6 associations RSE partenaires */],

  // ===== Configuration plateforme =====
  platformSettings: {
    pricing: { boostHT: 50, sponsoringHT: 100, vatRate: 0.19 },
    sla: { accountValidationHours: 48, profileValidationHours: 48, rseValidationHours: 72 },
    durations: { boostDays: 30, sponsoringDays: 7 },
    validation: {
      rejectionMode: "strict"   // "strict" (V1, Option B) | "lenient" (V2+, Option A)
    },
    minContent: { /* règles contenu minimum par profil — voir §4.7 */ }
  },

  // ===== KPIs globaux (pour dashboard admin) =====
  kpisGlobal: {
    companiesTotal: 20,
    companiesActive: 11,
    companiesPending: 8,
    companiesSuspended: 1,
    monthlyRevenueHT: 800,
    rseDonationsValidated: 34200
  }
};

// Helpers attachés en parallèle (read-only, pures, pas de mutation)
window.MARKETUP_HELPERS = {
  getCompanyBySlug, getCompanyById, getCurrentUserCompany,
  isProfileVisible, getActiveBoost, getActiveSponsoring,
  computeTTC, formatMoneyHT, formatMoneyTTC,
  getVisibleProfiles, getCompaniesByValidationStatus,
  getRsePendingCount, getKpiSnapshot
  // ... documenté en section 14
};
```

**Choix architecturaux** :

- **`_meta`** : sépare les métadonnées (versionning, identifiant de l'utilisateur "courant" pour les dashboards) des données métier
- **`companies` au top-level** : tout est centré sur l'entité Company. Les profils, transactions, RSE receipts, boost history sont **embedded** dedans (voir §3)
- **`disputes`, `notifications`, `adminUsers`** : collections séparées car les patterns de lecture sont **cross-company** (un admin voit tous les litiges, pas ceux d'une seule entreprise)
- **Référentiels** : top-level arrays, lecture seule, branchés sur les selects/filtres dans le frontend
- **`platformSettings`** : éditable par l'admin V1.2 (tarifs, SLA, durées). Stocké en DB pour permettre des modifications sans redéploiement

---

## 3. Entity: Company

### 3.1 Shape complet (exemple TechnoFab Industries — c-001)

```js
{
  // ----- LOCKED (set at registration, not editable) -----
  id: "c-001",
  slug: "technofab-industries",
  type: "B2B",  // "B2B" | "B2C"
  legalId: "B12345",
  identityDocumentUrl: "/shared/sample-legal-id.pdf",
  accountEmail: "ahmed@technofab.tn",
  country: "TN",  // ISO 3166-1 alpha-2

  // ----- ACCOUNT USER (single user V1) -----
  accountUser: {
    id: "u-c-001",
    firstName: "Ahmed",
    lastName: "Mrabet",
    phone: "+216 71 234 567",
    languages: ["fr", "ar"],
    auth: {
      emailVerified: true,
      emailVerifiedAt: "2026-01-15T08:30:00.000Z",
      passwordHash: "$2b$10$placeholder.bcrypt.hash.dev.only",
      otpCode: null,
      otpExpiresAt: null
    }
  },

  // ----- LIVE DATA (instant edit, no validation) -----
  liveData: {
    contactEmail: "contact@technofab.tn",
    phone: "+216 73 222 333",        // téléphone fixe / standard
    whatsapp: "+216 20 123 456",     // WhatsApp business (peut être identique à phone)
    address: "Rue de l'Industrie, ZI Sahline",
    gouvernorat: "sousse",   // ref to gouvernorats[].slug
    ville: "Sahline",
    sectorId: "mecanique",   // ref to sectorsB2B[].slug (or categoriesB2C if type=B2C)
    languages: ["fr"]        // V1: only French selectable (multi-select UI ready for V1.1)
  },

  // ----- VALIDATED DATA (published, requires admin approval) -----
  data: {
    displayName: { fr: "TechnoFab Industries", ar: "", en: "" },
    logo: "https://api.dicebear.com/7.x/initials/svg?seed=TechnoFab&backgroundColor=0078D4",
    banner: "https://picsum.photos/seed/c-001-banner/1200/400"
  },

  // ----- PENDING DATA (null when nothing pending) -----
  pendingData: null,
  /*
  Shape when pending:
  {
    displayName: { fr: "TechnoFab Industries SA", ar: "", en: "" },
    logo: "https://...",
    modifiedFields: ["displayName", "logo"],
    submittedAt: "2026-04-20T14:00:00.000Z"
  }
  */

  // ----- VALIDATION STATUS -----
  validationStatus: "active",  // pending | active | suspended | rejected

  // ----- EMBEDDED: 3 PROFILES -----
  profiles: {
    brandup: {/* see §4.3 */},
    traceup: {/* see §4.4 */},
    linkup:  {/* see §4.5 */}
  },

  // ----- EMBEDDED: TRANSACTIONS -----
  transactions: [/* see §6.1 */],

  // ----- EMBEDDED: RSE RECEIPTS -----
  rseReceipts: [/* see §6.2 */],
  rseBadgeStatus: "validated",  // none | pending | validated | revoked

  // ----- TIMESTAMPS & AUDIT -----
  registeredAt: "2026-01-15T08:00:00.000Z",
  validatedAt:  "2026-01-16T10:00:00.000Z",
  validatedBy:  "u-001",
  suspendedAt:  null,
  suspendedReason: null,
  rejectedAt:   null,
  rejectedReason: null,
  deletedAt:    null  // soft delete
}
```

### 3.2 Field categories matrix

Chaque champ d'une Company appartient à une **catégorie** qui définit son comportement à l'édition :

| Catégorie | Champs | Comportement à l'édition |
|---|---|---|
| **locked** | `legalId`, `identityDocumentUrl`, `accountEmail`, `type`, `country`, `slug` | Non éditables après registration. Modification = ticket support. |
| **live** | tout `liveData.*`, `accountUser.firstName/lastName/phone/languages` | Update instantané. Pas de `pendingData`. `validationStatus` inchangé. |
| **validated** | `data.displayName`, `data.logo`, `data.banner` | Modification → écrite dans `pendingData`, `validationStatus = "pending"`, **les 3 profils deviennent invisibles** (cascade). |
| **auth-restricted** | `accountUser.auth.*` (passwordHash, otp, etc.) | Modifiable uniquement via flow dédié (reset password, OTP, email verification). Pas via `/account`. |

**Justification de cette séparation** :
- Audit-friendly : on peut tracer précisément qui a modifié quoi et à quel niveau de validation
- Performance : les écritures `live` sont rapides (pas de cascade), les `validated` déclenchent un workflow
- Sécurité : les champs `auth-restricted` ne transitent jamais dans le payload `/account`

### 3.3 Pattern de validation : `data` + `pendingData` + `liveData`

C'est le **cœur du workflow**. Trois zones distinctes :

```js
{
  liveData:    { /* éditable instantané, pas de validation admin */ },
  data:        { /* publié, visible publiquement (champs nécessitant validation) */ },
  pendingData: null  /* ou { ...nouvelles valeurs, modifiedFields, submittedAt } */
}
```

**Cycle complet (exemple : user modifie son logo)** :

```
État 1 (initial)
─────────────────
data: { logo: "logo-v3.png", displayName: {...}, banner: "banner-v2.jpg" }
pendingData: null
validationStatus: "active"
→ Profils visibles publiquement ✅

État 2 (user upload nouveau logo et clique "Sauvegarder")
─────────────────
data: { logo: "logo-v3.png", displayName: {...}, banner: "banner-v2.jpg" }
                               ↑ inchangé tant que l'admin n'approuve pas
pendingData: {
  logo: "logo-v4.png",
  modifiedFields: ["logo"],
  submittedAt: "2026-04-20T14:00:00.000Z"
}
validationStatus: "pending"
→ Tous les profils invisibles (cascade) ❌

État 3a (admin approuve)
─────────────────
data: { logo: "logo-v4.png", ... }   ← merge depuis pendingData
pendingData: null
validationStatus: "active"
validatedAt: "2026-04-21T10:00:00.000Z"
validatedBy: "u-001"
→ Profils re-visibles ✅

État 3b (admin rejette les modifications) — V1 mode strict
─────────────────
data: { logo: "logo-v3.png", ... }   ← inchangé, reste l'ancienne valeur (préservé par le pattern)
pendingData: null                    ← discard des modifs proposées
validationStatus: "rejected"         ← compte BLOQUÉ jusqu'à nouvelle soumission
rejectedAt: "2026-04-21T11:00:00.000Z"
rejectedReason: "Logo basse résolution"
rejectedBy: "u-001"
→ Profils INVISIBLES publiquement (cascade rejected)
→ User doit modifier et resoumettre via /dashboard/account
```

**Décision V1 (Option B — mode strict)** : un rejet de modifications fait passer le compte en `rejected`. Les profils restent invisibles publiquement jusqu'à ce que le user soumette une nouvelle version validée par l'admin. Le statut `rejected` couvre donc deux cas en V1 : (1) refus initial à l'inscription, (2) rejet de modifications post-activation.

**Pourquoi Option B en V1** : protège la qualité de la plateforme dès le début, force les utilisateurs à soumettre du contenu soigné, et soulage l'admin du tri "soumissions bâclées".

**Migration prévue Option A en V2** : un toggle dans `platformSettings.validation.rejectionMode` permettra de basculer en mode `lenient` (rejet → retour à `active` avec anciennes valeurs) sans changer le schéma. Voir §16.6.

**Notification au user** : email envoyé "Vos modifications ont été refusées : [motif]. Modifiez et resoumettez votre profil." Le dashboard affiche un banner rouge persistant avec le motif et un CTA "Corriger mes informations".

**Cycle complet rejet → resoumission** :
```
État 3b: validationStatus = "rejected", pendingData = null, data inchangé
   ↓ user édite à nouveau dans /dashboard/account
État 4: pendingData = { logo: "logo-v5.png", ... }
        validationStatus = "pending"  ← nouvelle revue admin
   ↓ admin approuve
État 5: data.logo = "logo-v5.png"
        pendingData = null
        validationStatus = "active"
        rejectedReason = null  ← clear le motif précédent
```

### 3.4 Workflow `validationStatus`

```
[Inscription] → "pending"  ← admin n'a pas encore validé le compte initial
              ↓ admin approuve
              "active"  ← état nominal, profils visibles si leur status l'autorise
              ↓ admin suspend (litige, fraude, etc.)
              "suspended"  ← profils invisibles (cascade), réversible
              ↑ admin lève la suspension
              "active"
              ↓ admin rejette (à l'inscription)
              "rejected"  ← compte refusé définitivement (rare)
```

**Note sur `pending`** : le compte est en `pending` dans deux scénarios :
1. **Inscription initiale** : compte créé, OTP validé, en attente de la validation admin (24-48h)
2. **Modifications de `validated fields`** : compte en `pending` temporairement le temps de valider les modifs

Ces deux scénarios sont **distinguables par la présence de `pendingData`** :
- `pending` + `pendingData = null` → 1er scénario (inscription)
- `pending` + `pendingData != null` → 2e scénario (modifs)

Le frontend admin peut différencier ces cas pour adapter l'UI.

---

## 4. Embedded: Profiles

### 4.1 Pourquoi embed (et pas reference)

**Décision** : les 3 profils (BrandUP, TraceUP, LinkUP) sont **embedded** dans le document Company, pas dans une collection séparée.

**Justifications** :

| Critère | Embed | Reference |
|---|---|---|
| Pattern de lecture dashboard | 1 query → toute la donnée | 1+3 queries ou aggregation |
| Pattern de lecture profil public | 1 query par slug → tout | 1+1 join |
| Pattern de lecture admin entreprise | 1 query → tout | 1+3 queries |
| Pattern moteur (filtre cross-companies) | Aggregation `$project` simple | `$lookup` complexe |
| Atomicité des updates | Update sur sous-document = atomique | 2 collections à synchroniser |
| Taille document MongoDB | < 1 MB par company (limite 16 MB) | Pas de souci |
| Simplicité de raisonnement | "Une company = un document" | "Joins permanents" |

**Volumétrie typique** par company :
- 3 profils + leur `data` : ~5-10 KB chacun
- TraceUP videos[] : jusqu'à 50 vidéos × 1 KB metadata = 50 KB
- transactions[] : 12 transactions × 0.5 KB = 6 KB
- rseReceipts[] : 6 receipts × 0.3 KB = 2 KB
- boostHistory[] et sponsoringHistory[] : ~20 entrées × 0.3 KB = 6 KB

**Total estimé** : ~80 KB par company (largement sous la limite MongoDB 16 MB).

**Risque** : si une entreprise dépose des centaines de vidéos TraceUP, on peut approcher des limites. Mitigation V1.1 : extraire `traceup.videos[]` en collection séparée avec `companyId` reference.

### 4.2 Common shape (commun aux 3 profils)

```js
{
  type: "brandup" | "traceup" | "linkup",
  status: "incomplete" | "pending" | "active" | "rejected" | "disabled",

  data: { /* type-specific, voir §4.3, 4.4, 4.5 */ },
  pendingData: null,  // ou { ...modifiedFields, submittedAt }

  rejectionReason: null,  // string FR (multilingue V1.1)
  rejectedAt: null,
  rejectedBy: null,  // adminId

  publishedAt: null,  // datetime de la première mise en ligne (status: incomplete → pending → active)

  stats: {
    viewsTotal: 0,
    views30d: 0,
    clicksTotal: 0
  },

  boostHistory: [/* see §5.1 */],
  sponsoringHistory: [/* see §5.2 */]
}
```

### 4.3 BrandUP-specific data

```js
brandup: {
  type: "brandup",
  status: "active",  // ou autre

  data: {
    pitch:          { fr: "Spécialiste de la mécanique de précision...", ar: "", en: "" },  // 50-500 chars, résumé court
    about:          { fr: "Fondée en 2010 à Sousse, TechnoFab Industries est spécialisée...", ar: "", en: "" },  // ≤1000 chars, bloc "Expertise & Vision"
    color:          "#0078D4",
    links: [
      { label: { fr: "Site web", ar: "", en: "" }, url: "https://technofab.tn", icon: "language" },
      { label: { fr: "LinkedIn", ar: "", en: "" }, url: "https://linkedin.com/...", icon: "linkedin" }
    ],
    gallery: [
      { id: "g-001-1", url: "https://picsum.photos/seed/c-001-brandup-img-1/800/600", caption: { fr: "", ar: "", en: "" } },
      { id: "g-001-2", url: "https://picsum.photos/seed/c-001-brandup-img-2/800/600", caption: { fr: "", ar: "", en: "" } }
      // ... min 6, max 8 images
    ],
    projects: [
      // Catalogue de Production (images des réalisations)
      {
        id: "proj-c-001-1",
        name: { fr: "Pièces aéronautiques A320", ar: "", en: "" },
        image: "https://picsum.photos/seed/c-001-proj-1/600/400",
        description: { fr: "Production de pièces structurelles aluminium...", ar: "", en: "" },
        order: 1
      }
      // ... up to 12 projects
    ],
    certifications: [
      // Certifications & Standards (badges du profil public)
      {
        id: "cert-c-001-1",
        name: "ISO 9001:2015",                                            // string simple, nom officiel
        label: { fr: "Management de la qualité", ar: "", en: "" },         // description courte
        icon: "verified",                                                  // material icon fallback
        image: "https://picsum.photos/seed/c-001-cert-iso9001/200/200",   // optional logo certif
        issuedAt: "2024-06-01",                                            // date d'obtention
        expiresAt: "2027-06-01"                                            // date d'expiration (null si permanent)
      }
      // ... liste des certifications
    ],
    services: [
      { name: { fr: "Usinage CNC", ar: "", en: "" } },
      { name: { fr: "Tôlerie industrielle", ar: "", en: "" } }
      // V1.1+ : description par service
    ],
    openingHours: null  // V1.1+
  },
  pendingData: null,
  // ... common fields
}
```

**Champs spécifiques** :
- `pitch` (multilingue, 50-500 chars) : résumé court d'accroche affiché en haut du profil public et dans les cards moteur. Sert de sous-titre/pitch commercial.
- `about` (multilingue, ≤1000 chars) : description longue affichée dans la **section "Expertise & Vision"** du profil public. C'est le texte principal de présentation détaillée de l'entreprise.
- `color` (hex) : couleur de marque, customise certains éléments visuels du profil public.
- `links[]` : liens externes (site web, réseaux sociaux), chaque lien a un `label` multilingue.
- `gallery[]` : 6-8 images de vitrine (locaux, produits, équipe). Chaque image a une `caption` multilingue optionnelle.
- `projects[]` : **liste des images du "Catalogue de Production"** affiché dans le profil public. Chaque projet = image + nom optionnel + description optionnelle. Max 12 visibles avec "+N More" si plus.
- `certifications[]` : **bloc "Certifications & Standards"** du profil public. Chaque certification a un nom officiel, un label descriptif, une icône fallback, et une image optionnelle (logo). Si `image` vide, on affiche `icon` material.
- `services[]` : liste simple V1, enrichissable V1.1+
- `openingHours` : V1.1+

**Champs NON utilisés sur BrandUP** (décision Ahmed 2026-04-23) :
- ❌ `tagline` — pas de tagline sur BrandUP, le `pitch` joue ce rôle. Tagline est utilisé uniquement sur TraceUP et LinkUP.
- ❌ `foundedYear`, `employeesCount`, `clients` — non utilisés en V1, reportés à V1.1+ si jamais besoin.

### 4.4 TraceUP-specific data (multi-plateforme vidéos)

```js
traceup: {
  type: "traceup",
  status: "pending",  // ou autre

  data: {
    channelName: { fr: "TechnoFab Studio", ar: "", en: "" },  // optional, peut différer du company displayName
    videos: [
      {
        id: "v-001",
        source: "youtube",  // "youtube" | "dailymotion" | "vimeo"
        videoId: "dQw4w9WgXcQ",  // ID extrait selon plateforme
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  // URL originale
        thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        category: "actualite",  // "actualite" | "offres" | "astuces" | "emplois"
        title: { fr: "Visite de notre usine", ar: "", en: "" },
        description: { fr: "Découvrez nos lignes de production...", ar: "", en: "" },
        status: "active",  // "pending" | "active" | "rejected" — par vidéo
        publishedAt: "2026-03-20T10:00:00.000Z",
        addedAt: "2026-03-20T09:55:00.000Z",
        order: 1  // ordre d'affichage dans le profil
      },
      // ... jusqu'à 50 vidéos
    ]
  },
  pendingData: null,
  // ... common fields
}
```

**Champs spécifiques** :
- `channelName` (multilingue, optional) : nom de la "chaîne" TraceUP. Permet à l'entreprise de brander sa présence média avec un nom différent du nom légal (ex : "TechnoFab Studio" pour "TechnoFab Industries"). **Si vide, le frontend affiche `company.data.displayName` par défaut.** Placement UI à confirmer (dashboard édition + profil public).
- `videos[]` : tableau des vidéos publiées sur le profil (voir détails ci-dessous).

**Note** : pas de `tagline` sur TraceUP. L'en-tête commun aux 3 profils affiche les infos de `company.liveData` (téléphone, whatsapp, email, adresse) + le badge RSE si validé. Les infos de personnalisation TraceUP sont uniquement le `channelName` et la liste des vidéos.

**Patterns regex d'extraction** (à implémenter côté server Next.js) :

```js
const VIDEO_PATTERNS = {
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ],
  dailymotion: [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/
  ],
  vimeo: [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/
  ]
};
```

**URLs d'embed standardisées** :
- YouTube : `https://www.youtube.com/embed/{videoId}`
- Dailymotion : `https://www.dailymotion.com/embed/video/{videoId}`
- Vimeo : `https://player.vimeo.com/video/{videoId}`

**Statut par vidéo** : chaque vidéo a son propre `status`. Si une vidéo est `rejected` (contenu inapproprié), le profil reste `active` mais cette vidéo seule est masquée. Le profil entier ne devient `pending` que si l'utilisateur réorganise / modifie en masse.

**Note canon V1** : décision prise précédemment de **ne pas re-valider chaque vidéo ajoutée** par l'admin (ajout libre pour fluidité user). Mais le statut `rejected` reste possible si signalement (cf. `admin_contenus-sensibles.html` hors-scope V1).

### 4.4.1 ⚠️ TraceUP : exception au pattern `pendingData`

**Important** : contrairement à BrandUP et LinkUP, **les vidéos TraceUP ne passent PAS par `pendingData` en V1**. Toutes les opérations sur `data.videos` sont **directes et instantanées** :

| Opération user | Comportement V1 |
|---|---|
| Ajouter une vidéo | Insérée directement dans `data.videos` avec `status: "active"`. Visible immédiatement. |
| Modifier titre/description vidéo | Modifié directement dans `data.videos[i]`. Pas de cycle de validation. |
| Supprimer une vidéo | Retirée directement de `data.videos`. Pas de cycle de validation. |
| Réordonner les vidéos | Modifie directement `data.videos[i].order`. Instantané. |

**Le profil TraceUP reste `active` pendant ces opérations.** `pendingData` reste à `null`.

**Justification** : les vidéos sont ajoutées fréquemment (workflow content marketing) et bloquer le profil à chaque ajout serait un goulot d'étranglement. La modération est faite **a posteriori** via le système de signalements V1.1+ (`admin_contenus-sensibles.html`) : un admin peut passer une vidéo signalée à `status: "rejected"` (vidéo cachée mais conservée pour audit).

**Conséquence schéma** : `profiles.traceup.pendingData` est toujours `null` en V1. Le champ existe pour cohérence avec BrandUP/LinkUP et pour évolution V1.1+ si besoin de re-validation pré-publication.

**Évolution V1.1+** : si business decision de re-valider chaque vidéo, on activera le pattern `pendingData.videos = [...new array]` (full replacement). Pas de refactoring de schéma.

### 4.5 LinkUP-specific data

```js
linkup: {
  type: "linkup",
  status: "active",

  data: {
    contactCard: {
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=AhmedMrabet",
      fullName: "Ahmed Mrabet",  // string simple, pas multilingue
      title: { fr: "Directeur Général", ar: "", en: "" },
      company: { fr: "TechnoFab Industries", ar: "", en: "" },  // peut différer du displayName entreprise
      bio: { fr: "Passionné par l'industrie 4.0...", ar: "", en: "" },
      email: "ahmed@technofab.tn",
      phone: "+216 71 234 567",
      whatsapp: "+216 71 234 567",
      website: "https://technofab.tn",
      address: "Rue de l'Industrie, ZI Sahline, Sousse",  // string simple (les noms de lieux ne se traduisent pas)
      gpsPosition: {
        type: "Point",
        coordinates: [10.5907, 35.7628]   // [longitude, latitude] — format GeoJSON Point
      }
    },
    qrConfig: {
      style: "rounded",  // "rounded" | "square" | "dots"
      colorForeground: "#000000",
      colorBackground: "#FFFFFF",
      logoOverlay: true  // overlay du logo entreprise au centre du QR
    },
    socials: [
      { platform: "linkedin", url: "https://linkedin.com/in/ahmedmrabet" },
      { platform: "facebook", url: "https://facebook.com/technofab.tn" },
      { platform: "instagram", url: "https://instagram.com/technofab" },
      { platform: "twitter", url: null }  // null si non rempli
    ]
  },
  pendingData: null,
  // ... common fields
}
```

**Champs spécifiques** :
- `contactCard.photo` : avatar du contact (généré DiceBear en seed, upload S3 en prod)
- `contactCard.title/company/bio` : multilingue
- `contactCard.gpsPosition` : **GeoJSON Point** `{ type: "Point", coordinates: [longitude, latitude] }`. Format MongoDB-natif compatible avec l'index `2dsphere` pour les requêtes "à proximité" V1.1+. Renseigné via picker carte dans le formulaire LinkUP (Leaflet/Mapbox côté frontend).
- `qrConfig` : personnalisation du QR code généré dynamiquement à l'affichage
- `socials[]` : liste fixe de 7-10 plateformes possibles, `url: null` si non renseigné

### 4.6 Création initiale : 3 profils "incomplete" auto-créés

**Décision (Option A)** : à la fin du flow d'inscription (après OTP + validation admin du compte), **les 3 profils sont automatiquement créés** dans le document Company avec `status: "incomplete"`.

**Justification** :
- La sidebar dashboard a toujours 3 items cohérents (BrandUP / TraceUP / LinkUP)
- L'utilisateur comprend immédiatement qu'il a 3 outils à sa disposition
- Modèle DB prédictible : `company.profiles` toujours `{ brandup, traceup, linkup }`
- Pas de logique conditionnelle "si profil existe... sinon créer"

**Initial state** des 3 profils à la création :

```js
profiles: {
  brandup: {
    type: "brandup",
    status: "incomplete",
    data: {
      pitch: { fr: "", ar: "", en: "" },
      color: "#0078D4",  // default
      links: [],
      gallery: [],
      services: [],
      openingHours: null
    },
    pendingData: null,
    rejectionReason: null,
    publishedAt: null,
    stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
    boostHistory: [],
    sponsoringHistory: []
  },
  traceup: {
    type: "traceup",
    status: "incomplete",
    data: { videos: [] },
    pendingData: null,
    /* ... defaults */
  },
  linkup: {
    type: "linkup",
    status: "incomplete",
    data: {
      contactCard: {
        photo: null,  // user ajoutera
        fullName: "",  // pré-rempli depuis accountUser au 1er édit ?
        title: { fr: "", ar: "", en: "" },
        // ... vides
      },
      qrConfig: { style: "rounded", colorForeground: "#000000", colorBackground: "#FFFFFF", logoOverlay: false },
      socials: []
    },
    /* ... defaults */
  }
}
```

### 4.7 Règles de contenu minimum pour soumission

Un profil peut transitionner de `incomplete` → `pending` **seulement si** son contenu minimum est rempli. Ces règles sont à valider côté frontend (UX, bouton "Soumettre" disabled) **et** côté server (sécurité, validation Zod).

| Profil | Champs requis pour `incomplete → pending` |
|---|---|
| **BrandUP** | `data.pitch.fr.length >= 50`, `data.color !== null`, `company.data.logo !== null`, `data.gallery.length >= 6` |
| **TraceUP** | `data.videos.length >= 1` AND chaque vidéo a `title.fr` rempli |
| **LinkUP** | 9 champs obligatoires (cf. ci-dessous) |

**Détail LinkUP** — les **9 champs obligatoires** pour soumission :

| Champ | Validation V1 |
|---|---|
| `contactCard.photo` | non vide, URL valide |
| `contactCard.fullName` | non vide, min 2 chars |
| `contactCard.title.fr` | non vide |
| `contactCard.company.fr` | non vide |
| `contactCard.email` | non vide, format email valide |
| `contactCard.phone` | non vide, format `+216 XX XXX XXX` |
| `contactCard.whatsapp` | non vide, format `+216 XX XXX XXX` |
| `contactCard.address` | non vide, min 5 chars |
| `contactCard.gpsPosition` | objet GeoJSON Point valide avec coordinates non null |

**Champs optionnels LinkUP** : `bio`, `website`, `socials[]` (peuvent rester vides).

**Stockage des règles** : dans `platformSettings.minContent` (éditable V1.2 par admin). Le frontend lit ces règles pour activer/désactiver le bouton "Soumettre".

```js
platformSettings.minContent = {
  brandup: {
    pitchMinLength: 50,
    colorRequired: true,
    logoRequired: true,
    galleryMinImages: 6,        // V1 = 6, modifiable V1.2 par admin
    galleryMaxImages: 8
  },
  traceup: {
    minVideos: 1,
    titleRequiredPerVideo: true
  },
  linkup: {
    requiredFields: [
      "contactCard.photo",
      "contactCard.fullName",
      "contactCard.title",
      "contactCard.company",
      "contactCard.email",
      "contactCard.phone",
      "contactCard.whatsapp",
      "contactCard.address",
      "contactCard.gpsPosition"
    ]
  }
};
```

---

## 5. Embedded: Boost & Sponsoring

### 5.1 boostHistory[] (par profil)

Chaque profil porte son propre historique de boost (visibilité achetée, 30 jours).

```js
profiles.linkup.boostHistory = [
  {
    id: "b-001",
    from: "2026-03-24T00:00:00.000Z",
    to:   "2026-04-23T23:59:59.000Z",
    durationDays: 30,
    priceHT: 50,
    transactionId: "t-002",
    viewsAdded: 212,  // attribué à ce boost
    clicksAdded: 18,
    status: "active"  // "scheduled" | "active" | "expired" | "cancelled"
  },
  {
    id: "b-000",
    from: "2026-02-10T00:00:00.000Z",
    to:   "2026-03-12T23:59:59.000Z",
    durationDays: 30,
    priceHT: 50,
    transactionId: "t-prev-1",
    viewsAdded: 145,
    clicksAdded: 9,
    status: "expired"
  }
];
```

**Champs** :
- `from / to` : période de validité du boost (calculée auto à l'achat : `to = from + 30j`)
- `transactionId` : lien vers `company.transactions[].id`
- `viewsAdded / clicksAdded` : compteurs incrémentaux pendant la période active
- `status` :
  - `scheduled` : acheté mais pas encore commencé (paiement en attente)
  - `active` : période en cours, profil boosté
  - `expired` : période finie
  - `cancelled` : annulé par admin (rare, ex : remboursement litige)

### 5.2 sponsoringHistory[] (par profil)

Identique au boost mais pour les campagnes (7 jours, ciblées par catégorie).

```js
profiles.linkup.sponsoringHistory = [
  {
    id: "s-001",
    from: "2026-04-15T00:00:00.000Z",
    to:   "2026-04-22T23:59:59.000Z",
    durationDays: 7,
    priceHT: 100,
    transactionId: "t-001",
    targetCategory: "mecanique",  // ref to sectorsB2B[].slug
    impressions: 1250,
    clicks: 45,
    status: "active"  // "scheduled" | "active" | "expired" | "cancelled"
  }
];
```

**Différences avec boost** :
- `durationDays: 7` au lieu de 30
- `priceHT: 100` au lieu de 50
- `targetCategory` (obligatoire) : la campagne cible un secteur/catégorie précise
- `impressions` (au lieu de `viewsAdded`) : nombre d'affichages dans le carousel sponsorisé du moteur

### 5.3 Helpers `getActiveBoost` / `getActiveSponsoring`

Plutôt que de stocker un flag `isActive: true` (qui demanderait une mise à jour à chaque changement de date), on **calcule à la volée** :

```js
function getActiveBoost(profile) {
  const now = new Date();
  return profile.boostHistory.find(b => {
    const from = new Date(b.from);
    const to = new Date(b.to);
    return from <= now && now <= to && b.status === 'active';
  }) || null;
}
```

**Avantages** : pas de drift, pas de cron job pour expirer les boosts, single source of truth (les dates).

**MongoDB query équivalente** (pour le moteur public qui filtre les profils boostés) :

```js
db.companies.find({
  "profiles.brandup.status": "active",
  "profiles.brandup.boostHistory": {
    $elemMatch: {
      from: { $lte: new Date() },
      to: { $gte: new Date() },
      status: "active"
    }
  }
});
```

Le tri des moteurs publics priorise les profils avec boost actif.

---

## 6. Embedded: Transactions & RseReceipts

### 6.1 transactions[] (par company)

```js
company.transactions = [
  {
    id: "t-001",
    type: "sponsoring",  // "boost" | "sponsoring"
    refId: "s-001",  // ref vers boost ou sponsoring entry
    profileType: "linkup",
    priceHT: 100,
    vatRate: 0.19,
    vatAmount: 19,
    priceTTC: 119,
    status: "paid",  // "pending" | "paid" | "failed" | "refunded"
    paidAt: "2026-04-15T10:00:00.000Z",
    paymentMethod: "card",  // "card" | "bank_transfer" | "manual"
    paymentReference: "MP-20260415-XXX",  // référence externe (Stripe, banque, etc.)
    invoiceUrl: "/shared/sample-invoice.pdf",
    invoiceNumber: "INV-2026-0001",
    createdAt: "2026-04-15T09:55:00.000Z"
  }
];
```

**Champs critiques** :
- `vatAmount` stocké explicitement : permet exports comptables sans recalcul
- `invoiceNumber` : séquentiel, généré côté server au paiement (format à définir)
- `paymentReference` : trace la transaction côté payment provider (Stripe ou banque)
- `status: "refunded"` : utilisé pour les remboursements suite à litige

**Pattern admin cross-company** : la page `admin_transactions.html` lit toutes les transactions cross-company via aggregation :

```js
db.companies.aggregate([
  { $unwind: "$transactions" },
  { $sort: { "transactions.paidAt": -1 } },
  { $project: {
      companyId: "$_id",
      companySlug: "$slug",
      companyName: "$data.displayName",
      transaction: "$transactions"
  }},
  { $limit: 50 }
]);
```

### 6.2 rseReceipts[] (par company)

```js
company.rseReceipts = [
  {
    id: "r-001",
    associationId: "a-001",  // ref to associations[]
    associationName: "Al Ahed",  // dénormalisé pour fast read (évite un join)
    amount: 5200,  // DT
    donationDate: "2026-04-18",  // date seule, pas de datetime
    receiptDocumentUrl: "/shared/sample-rse-receipt.pdf",
    status: "pending",  // "pending" | "validated" | "rejected"
    submittedAt: "2026-04-18T11:00:00.000Z",
    validatedAt: null,
    validatedBy: null,
    rejectedReason: null
  }
];
```

**Justification de la dénormalisation `associationName`** : évite un `$lookup` à chaque lecture. Si une association change de nom, on update les receipts existants via une migration (rare).

**Important** : les **dons RSE ne transitent PAS par la plateforme** (le donateur paie directement l'association, le reçu est juste une preuve). Ils n'apparaissent **jamais** dans `transactions[]`. Cette règle est canon V1.2.

**Pattern admin cross-company** : `admin_validation-rse.html` lit toutes les receipts en `pending` cross-company :

```js
db.companies.aggregate([
  { $unwind: "$rseReceipts" },
  { $match: { "rseReceipts.status": "pending" } },
  { $sort: { "rseReceipts.submittedAt": 1 } },  // FIFO
  { $project: { companyId: "$_id", companyName: "$data.displayName", receipt: "$rseReceipts" }}
]);
```

### 6.3 rseBadgeStatus (top-level company)

Distinct de la liste des receipts, c'est le **statut global** du badge RSE de l'entreprise :

```js
company.rseBadgeStatus = "validated";  // "none" | "pending" | "validated" | "revoked"
```

**Logique** :
- `none` : entreprise n'a soumis aucun reçu, ou aucun n'est validé
- `pending` : au moins un reçu est en cours de validation, aucun encore validé
- `validated` : au moins un reçu validé → badge affiché publiquement
- `revoked` : badge retiré par admin (suite à fraude détectée par exemple)

**Calculé automatiquement** côté server lors de chaque approbation/rejet de reçu :

```js
function recomputeBadgeStatus(company) {
  const validated = company.rseReceipts.some(r => r.status === 'validated');
  const pending = company.rseReceipts.some(r => r.status === 'pending');
  if (company.rseBadgeStatus === 'revoked') return 'revoked';  // admin override
  if (validated) return 'validated';
  if (pending) return 'pending';
  return 'none';
}
```

---

## 7. Separate Collections

### 7.1 disputes (litiges)

Collection séparée car les patterns de lecture sont **cross-company** (admin voit tous les litiges en cours).

```js
disputes: [
  {
    id: "d-001",
    companyId: "c-005",  // ref
    raisedBy: "user",  // "user" | "admin"
    type: "billing",  // "billing" | "content" | "account" | "rse"
    subject: "Facturation incorrecte boost mars",
    description: "Le boost a été facturé deux fois...",
    status: "investigating",  // "open" | "investigating" | "resolved" | "closed"
    priority: "medium",  // "low" | "medium" | "high"
    openedAt: "2026-04-10T09:00:00.000Z",
    assignedTo: "u-001",  // adminId
    resolution: null,
    resolvedAt: null,
    closedAt: null,
    relatedTransactionId: "t-prev-2"  // optionnel
  }
];
```

**V1.2** : page `admin_litiges.html` (hors-scope V1 actuel mais documentée pour préparer la migration).

### 7.2 notifications (par récipient)

Collection séparée car volumétrie potentiellement élevée (notifications retentes 30j) et patterns de lecture par récipient.

```js
notifications: [
  {
    id: "n-001",
    recipientType: "company",  // "company" | "admin"
    recipientId: "c-001",  // companyId ou adminId
    type: "boost_expiring",  // type technique pour grouper/filter
    icon: "trending_up",
    color: "primary",  // pour le rendu UI : primary | warning | success | danger | gold
    title: { fr: "Votre boost LinkUP", ar: "", en: "" },
    body:  { fr: "expire dans 3 jours", ar: "", en: "" },
    actionUrl: "/dashboard/boost",  // optionnel, lien à suivre
    read: false,
    createdAt: "2026-04-19T10:00:00.000Z",
    readAt: null
  }
];
```

**Types de notifications canoniques** (à enrichir V1.1) :
- `boost_expiring` (3j avant expiration boost)
- `boost_expired`
- `sponsoring_expiring`
- `sponsoring_metrics` (rapport quotidien d'une campagne active)
- `account_validated` (compte approuvé par admin)
- `account_rejected`
- `profile_validated` (BrandUP/TraceUP/LinkUP approuvé)
- `profile_rejected`
- `rse_receipt_submitted` (auto-confirmation utilisateur)
- `rse_receipt_validated`
- `rse_receipt_rejected`
- `dispute_opened` (admin notifié quand user ouvre un litige)

**Stratégie de retention V1** : pas de purge auto. À évaluer V1.1 (TTL index sur `createdAt` ou archivage 90j).

### 7.3 adminUsers

```js
adminUsers: [
  {
    id: "u-001",
    firstName: "Bassem",
    lastName: "Admin",
    email: "bassem@vivasky.media",
    role: "super_admin",  // "super_admin" | "moderator" (V1.1+)
    avatar: { initials: "BA", backgroundColor: "#5C2D91" },  // calculé en frontend, stocké pour cohérence
    languages: ["fr"],
    auth: {
      emailVerified: true,
      passwordHash: "$2b$10$placeholder.bcrypt.hash.dev.only",
      lastLoginAt: "2026-04-22T08:00:00.000Z",
      mfaEnabled: false  // V1.1+
    },
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
```

**V1** : 1 seul super admin (Bassem). **V1.1+** : plusieurs admins avec rôles (super_admin, moderator avec permissions limitées).

---

## 8. Référentiels (read-only)

### 8.1 sectorsB2B et categoriesB2C

```js
sectorsB2B: [
  {
    id: "mecanique",
    slug: "mecanique",  // = id pour les références (sectorId)
    name: { fr: "Mécanique", ar: "ميكانيك", en: "Mechanical" },
    icon: "settings",  // material icon name
    order: 1
  },
  // ... 24 autres
];

categoriesB2C: [
  {
    id: "alimentation",
    slug: "alimentation",
    name: { fr: "Alimentation", ar: "تغذية", en: "Food" },
    icon: "restaurant",
    order: 1
  },
  // ... 24 autres
];
```

**Source de la liste** : `Listes_b2b_b2c.pdf` (uploadé dans le projet) — 25 secteurs + 25 catégories.

**En MongoDB** : collections `sectors` et `categories` séparées, chacune avec `slug` comme unique key.

### 8.2 gouvernorats

```js
gouvernorats: [
  {
    id: "tunis",
    slug: "tunis",
    name: { fr: "Tunis", ar: "تونس", en: "Tunis" },
    villes: ["Tunis", "La Marsa", "Le Bardo", "Carthage"]  // strings simples (les noms de lieux ne se traduisent pas)
  },
  {
    id: "sousse",
    slug: "sousse",
    name: { fr: "Sousse", ar: "سوسة", en: "Sousse" },
    villes: ["Sousse", "Sahline", "Kalaa Kebira", "Hammam Sousse"]
  },
  // ... 22 autres
];
```

**Couverture** : 24 gouvernorats TN, chacun avec 3-6 villes principales.

**En MongoDB** : collection `gouvernorats`, ou simplement embedded dans une config si jamais modifié.

### 8.3 associations (partenaires RSE)

```js
associations: [
  {
    id: "a-001",
    slug: "al-ahed",
    name: { fr: "Association Al Ahed", ar: "جمعية العهد", en: "Al Ahed Association" },
    description: { fr: "Soutien aux familles défavorisées...", ar: "", en: "" },
    logo: "https://api.dicebear.com/7.x/initials/svg?seed=AlAhed&backgroundColor=10B981",
    website: "https://al-ahed.tn",
    causes: ["solidarite", "enfance"],  // tags
    accreditationDocumentUrl: "/shared/sample-accreditation.pdf",
    accreditedSince: "2020-01-01",
    active: true
  },
  // ... 3-5 autres
];
```

**V1.2** : page `admin_associations.html` (hors-scope V1 actuel) permettra à l'admin de CRUD ces associations.

---

## 9. Status enums consolidés

Tous les status enums du système, à l'usage du dev pour les types/Zod/Mongoose enum validators :

```ts
// Company
type CompanyValidationStatus = "pending" | "active" | "suspended" | "rejected";

// Profile (commun BrandUP/TraceUP/LinkUP)
type ProfileStatus = "incomplete" | "pending" | "active" | "rejected" | "disabled";

// Type Profile
type ProfileType = "brandup" | "traceup" | "linkup";

// Video (sub-doc TraceUP)
type VideoStatus = "pending" | "active" | "rejected";
type VideoSource = "youtube" | "dailymotion" | "vimeo";
type VideoCategory = "actualite" | "offres" | "astuces" | "emplois";

// Boost & Sponsoring
type BoostStatus = "scheduled" | "active" | "expired" | "cancelled";
type SponsoringStatus = "scheduled" | "active" | "expired" | "cancelled";

// Transactions
type TransactionType = "boost" | "sponsoring";
type TransactionStatus = "pending" | "paid" | "failed" | "refunded";
type PaymentMethod = "card" | "bank_transfer" | "manual";

// RSE
type RseReceiptStatus = "pending" | "validated" | "rejected";
type RseBadgeStatus = "none" | "pending" | "validated" | "revoked";

// Disputes
type DisputeType = "billing" | "content" | "account" | "rse";
type DisputeStatus = "open" | "investigating" | "resolved" | "closed";
type DisputePriority = "low" | "medium" | "high";

// Company type
type CompanyType = "B2B" | "B2C";

// User roles
type AdminRole = "super_admin" | "moderator";

// Locales
type Locale = "fr" | "ar" | "en";
```

---

## 10. Visibility & Cascade Rules

### 10.1 Règle de visibilité publique

> **⚠️ OBSOLÈTE** — cette section était une spec pré-implémentation qui divergeait déjà du code (company.pendingData/deletedAt jamais vérifiés, validationStatus → status, isPublic absent). Depuis PP-11.5, la visibilité suit la matrice 4 cas avec publishedAt — voir CLAUDE.md §6.2.

Un profil est **visible publiquement** si et seulement si :

```js
function isProfileVisible(company, profileType) {
  // Cascade niveau compte
  if (company.validationStatus !== 'active') return false;
  if (company.pendingData) return false;
  if (company.deletedAt) return false;

  // Niveau profil
  const profile = company.profiles[profileType];
  if (profile.status !== 'active') return false;
  if (profile.pendingData) return false;

  return true;
}
```

**Implications** :

| `validationStatus` Company | `pendingData` Company | `status` Profile | `pendingData` Profile | Visible ? |
|---|---|---|---|---|
| `active` | `null` | `active` | `null` | ✅ OUI |
| `active` | `null` | `active` | `{...}` | ❌ Non (modifs profil en revue) |
| `active` | `{...}` | `active` | `null` | ❌ Non (modifs compte en revue) |
| `pending` | * | `active` | * | ❌ Non (compte non validé) |
| `suspended` | * | * | * | ❌ Non (cascade suspension) |
| `rejected` | * | * | * | ❌ Non (compte refusé) |
| `active` | `null` | `incomplete\|pending\|rejected\|disabled` | * | ❌ Non |

### 10.2 Règle de cascade (suspension compte)

Quand admin suspend une company :
- `company.validationStatus = "suspended"` (write)
- **Les `profile.status` ne sont PAS modifiés** (read-time cascade only)

**Justification** :
- **Réversibilité** : admin lève la suspension → tous les profils retrouvent leur état antérieur sans intervention
- **Audit** : le journal montre `suspendedAt`, pas une cascade d'updates sur les 3 profils
- **Performance** : 1 seul write au lieu de 4 (compte + 3 profils)

**Exception** : seuls `validatedAt`, `validatedBy`, `suspendedAt`, `suspendedReason` sont des champs de tracking. Ils sont indépendants du status workflow.

### 10.3 Règle de modification (profil active → modifs)

Quand un user édite des champs `validated` d'un profil `active` :
1. Les nouvelles valeurs vont dans `profile.pendingData` (pas dans `data`)
2. `modifiedFields[]` est rempli avec la liste des keys touchées
3. `submittedAt` est posé
4. `profile.status` reste `active` (l'ancien contenu est toujours techniquement valide)
5. Mais la **règle de visibilité retourne `false`** car `pendingData !== null`

**Donc** : pour le public, le profil est invisible le temps de la validation. L'ancien contenu reste dans `data` mais n'est pas montré (cohérence visuelle : on ne montre PAS un mix vieux + nouveau pendant la review).

### 10.4 Règle d'approbation admin

```js
// Approuver le pendingData d'un profil
async function approveProfilePending(companyId, profileType) {
  const company = await Company.findById(companyId);
  const profile = company.profiles[profileType];
  if (!profile.pendingData) return;

  const { modifiedFields, submittedAt, ...newValues } = profile.pendingData;

  // Merge pendingData → data (uniquement les champs modifiés)
  modifiedFields.forEach(field => {
    profile.data[field] = newValues[field];
  });

  profile.pendingData = null;
  profile.publishedAt = profile.publishedAt || new Date();  // 1ère mise en ligne
  profile.lastValidatedAt = new Date();
  profile.lastValidatedBy = adminId;

  await company.save();
}
```

---

## 11. Indexes MongoDB requis

Pour les patterns de requête identifiés, voici les indexes à créer :

### 11.1 Collection `companies`

```js
// Lookups directs (unique)
db.companies.createIndex({ slug: 1 }, { unique: true });
db.companies.createIndex({ accountEmail: 1 }, { unique: true });
db.companies.createIndex({ legalId: 1 }, { unique: true });

// Admin queue (validations en attente, FIFO)
db.companies.createIndex({ validationStatus: 1, registeredAt: 1 });

// Moteurs publics (filtrage par profil actif)
db.companies.createIndex({
  validationStatus: 1,
  "profiles.brandup.status": 1
});
db.companies.createIndex({
  validationStatus: 1,
  "profiles.traceup.status": 1
});
db.companies.createIndex({
  validationStatus: 1,
  "profiles.linkup.status": 1
});

// Filtrage moteur par secteur + type
db.companies.createIndex({
  type: 1,
  "liveData.sectorId": 1,
  "profiles.brandup.status": 1
});

// Filtrage moteur par gouvernorat
db.companies.createIndex({
  "liveData.gouvernorat": 1,
  "profiles.brandup.status": 1
});

// Soft delete (exclure les supprimés)
db.companies.createIndex({ deletedAt: 1 });
```

### 11.2 Collection `disputes`

```js
db.disputes.createIndex({ companyId: 1, status: 1 });
db.disputes.createIndex({ status: 1, openedAt: -1 });  // admin queue
db.disputes.createIndex({ assignedTo: 1, status: 1 });
```

### 11.3 Collection `notifications`

```js
db.notifications.createIndex({ recipientId: 1, recipientType: 1, read: 1, createdAt: -1 });
// Index composite : récupère les non-lues d'un utilisateur, triées desc
```

### 11.4 Collection `adminUsers`

```js
db.adminUsers.createIndex({ email: 1 }, { unique: true });
```

### 11.5 Collections référentielles

```js
db.sectors.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ slug: 1 }, { unique: true });
db.gouvernorats.createIndex({ slug: 1 }, { unique: true });
db.associations.createIndex({ slug: 1 }, { unique: true });
```

---

## 12. Mapping vers Mongoose

### 12.1 Approche générale

Le seed JS se traduit en **Mongoose schemas** quasi 1:1. Conventions :

- `_id` est auto-généré par MongoDB (remplace les `c-001` du seed)
- `createdAt`, `updatedAt` ajoutés automatiquement via `{ timestamps: true }`
- Les sub-documents (Profile, Transaction, etc.) sont déclarés comme **Schema imbriqués**, pas comme collections séparées

### 12.2 Exemple : schema Company

```js
// models/Company.js
import mongoose from 'mongoose';

const I18nStringSchema = new mongoose.Schema({
  fr: { type: String, default: '' },
  ar: { type: String, default: '' },
  en: { type: String, default: '' }
}, { _id: false });

const VideoSchema = new mongoose.Schema({
  source: { type: String, enum: ['youtube', 'dailymotion', 'vimeo'], required: true },
  videoId: { type: String, required: true },
  videoUrl: { type: String, required: true },
  thumbnailUrl: String,
  category: { type: String, enum: ['actualite', 'offres', 'astuces', 'emplois'], required: true },
  title: I18nStringSchema,
  description: I18nStringSchema,
  status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
  publishedAt: Date,
  addedAt: { type: Date, default: Date.now },
  order: Number
}, { _id: true });

const BoostSchema = new mongoose.Schema({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  durationDays: { type: Number, default: 30 },
  priceHT: { type: mongoose.Schema.Types.Decimal128, required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  viewsAdded: { type: Number, default: 0 },
  clicksAdded: { type: Number, default: 0 },
  status: { type: String, enum: ['scheduled', 'active', 'expired', 'cancelled'], default: 'scheduled' }
}, { _id: true });

// Sponsoring schema similaire ...

const ProfileSchema = new mongoose.Schema({
  type: { type: String, enum: ['brandup', 'traceup', 'linkup'], required: true },
  status: { type: String, enum: ['incomplete', 'pending', 'active', 'rejected', 'disabled'], default: 'incomplete' },

  // data shape varies by type — handled in Zod validation, Mongoose uses Mixed
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  pendingData: { type: mongoose.Schema.Types.Mixed, default: null },

  rejectionReason: { type: String, default: null },
  rejectedAt: Date,
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },

  publishedAt: Date,
  lastValidatedAt: Date,
  lastValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },

  stats: {
    viewsTotal: { type: Number, default: 0 },
    views30d: { type: Number, default: 0 },
    clicksTotal: { type: Number, default: 0 }
  },

  boostHistory: [BoostSchema],
  sponsoringHistory: [/* SponsoringSchema */]
}, { _id: false });

const CompanySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ['B2B', 'B2C'], required: true },
  legalId: { type: String, required: true, unique: true, trim: true },
  identityDocumentUrl: { type: String, required: true },
  accountEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  country: { type: String, default: 'TN' },

  accountUser: {
    firstName: String,
    lastName: String,
    phone: String,
    languages: [String],
    auth: {
      emailVerified: { type: Boolean, default: false },
      emailVerifiedAt: Date,
      passwordHash: String,  // never selected by default
      otpCode: String,
      otpExpiresAt: Date
    }
  },

  liveData: {
    contactEmail: String,
    phone: String,
    address: String,
    gouvernorat: String,
    ville: String,
    sectorId: String,
    languages: [String]
  },

  data: {
    displayName: I18nStringSchema,
    logo: String,
    banner: String
  },

  pendingData: { type: mongoose.Schema.Types.Mixed, default: null },

  validationStatus: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'pending' },

  profiles: {
    brandup: ProfileSchema,
    traceup: ProfileSchema,
    linkup: ProfileSchema
  },

  transactions: [/* TransactionSchema */],
  rseReceipts: [/* RseReceiptSchema */],
  rseBadgeStatus: { type: String, enum: ['none', 'pending', 'validated', 'revoked'], default: 'none' },

  registeredAt: { type: Date, default: Date.now },
  validatedAt: Date,
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  suspendedAt: Date,
  suspendedReason: String,
  rejectedAt: Date,
  rejectedReason: String,
  deletedAt: Date
}, { timestamps: true });

// Hide passwordHash from default queries
CompanySchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.accountUser?.auth?.passwordHash) delete ret.accountUser.auth.passwordHash;
    return ret;
  }
});

// Slug auto-generation
import slugify from 'slugify';
CompanySchema.pre('validate', function(next) {
  if (!this.slug && this.data?.displayName?.fr) {
    this.slug = slugify(this.data.displayName.fr, { lower: true, strict: true });
  }
  next();
});

// Virtual for "isVisible per profile type"
CompanySchema.methods.isProfileVisible = function(profileType) {
  if (this.validationStatus !== 'active') return false;
  if (this.pendingData) return false;
  if (this.deletedAt) return false;
  const p = this.profiles[profileType];
  return p && p.status === 'active' && !p.pendingData;
};

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
```

### 12.3 Choix discutés dans ce schema

| Choix | Justification |
|---|---|
| `data` et `pendingData` typés `Mixed` | Le shape varie par profile type. La validation est faite en Zod côté API, pas en Mongoose. Évite des Schemas conditionnels complexes. |
| Profile `_id: false` | Les profils sont identifiés par leur clé dans `profiles.{brandup,traceup,linkup}`. Pas besoin d'_id propre. |
| Video `_id: true` | Chaque vidéo a un ID stable (référencé dans pendingData, stats per-video, modération). |
| `Decimal128` pour money | Évite les floating-point errors sur les calculs TVA. |
| `passwordHash` masqué dans `toJSON` | Sécurité : jamais exposé via API par défaut. |
| `slug` auto-généré en `pre('validate')` | Évite oublis, garantit cohérence. |

### 12.4 Schemas séparés (collections autonomes)

```js
// models/Dispute.js
const DisputeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  raisedBy: { type: String, enum: ['user', 'admin'], required: true },
  type: { type: String, enum: ['billing', 'content', 'account', 'rse'], required: true },
  subject: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  openedAt: { type: Date, default: Date.now },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  resolution: String,
  resolvedAt: Date,
  closedAt: Date,
  relatedTransactionId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

// models/Notification.js
const NotificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['company', 'admin'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  icon: String,
  color: String,
  title: { fr: String, ar: String, en: String },
  body: { fr: String, ar: String, en: String },
  actionUrl: String,
  read: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

// models/AdminUser.js (idem à Company.accountUser mais standalone)
// models/Sector.js, Category.js, Gouvernorat.js, Association.js (référentiels)
```

---

## 13. Mapping vers Zod (validation API)

### 13.1 Schemas Zod par entité

```ts
// schemas/i18n.ts
import { z } from 'zod';

export const I18nStringSchema = z.object({
  fr: z.string().default(''),
  ar: z.string().default(''),
  en: z.string().default('')
});

// schemas/company.ts
export const CompanyLiveDataSchema = z.object({
  contactEmail: z.string().email(),
  phone: z.string().regex(/^\+216 \d{2} \d{3} \d{3}$/),
  whatsapp: z.string().regex(/^\+216 \d{2} \d{3} \d{3}$/),  // peut être identique à phone
  address: z.string().min(5).max(200),
  gouvernorat: z.string(),
  ville: z.string().min(2).max(50),
  sectorId: z.string(),
  languages: z.array(z.enum(['fr', 'ar', 'en'])).min(1).max(3)
});

export const CompanyValidatedDataSchema = z.object({
  displayName: I18nStringSchema.refine(d => d.fr.length >= 2, "FR name required (min 2 chars)"),
  logo: z.string().url(),
  banner: z.string().url().optional().nullable()
});

export const CompanyRegisterSchema = z.object({
  type: z.enum(['B2B', 'B2C']),
  legalId: z.string().min(2).max(20),
  accountEmail: z.string().email(),
  identityDocumentUrl: z.string().url(),  // upload obligatoire
  // ... plus user fields
});

// schemas/profile.brandup.ts
// Note : pas de TaglineSchema — le concept de tagline a été abandonné (décision 2026-04-23).
// L'en-tête commun aux 3 profils affiche les infos de company.liveData (phone, whatsapp, email, address).

export const BrandUpDataSchema = z.object({
  // No tagline on BrandUP — pitch plays that role (decision 2026-04-23)
  pitch: I18nStringSchema.refine(d => d.fr.length >= 50 && d.fr.length <= 500, "Pitch FR 50-500 chars"),
  about: I18nStringSchema.refine(d => d.fr.length <= 1000, "About FR max 1000 chars").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  links: z.array(z.object({
    label: I18nStringSchema,
    url: z.string().url(),
    icon: z.string().optional()
  })).max(10),
  gallery: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    caption: I18nStringSchema.optional()
  })).min(6).max(8),
  projects: z.array(z.object({
    id: z.string(),
    name: I18nStringSchema,
    image: z.string().url(),
    description: I18nStringSchema.optional(),
    order: z.number().int().min(1)
  })).max(20).optional().default([]),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string().min(1).max(100),
    label: I18nStringSchema,
    icon: z.string().default('verified'),
    image: z.string().url().optional().nullable(),
    issuedAt: z.string(),  // ISO date
    expiresAt: z.string().nullable().optional()  // ISO date or null if permanent
  })).max(20).optional().default([]),
  services: z.array(z.object({
    name: I18nStringSchema
  })).max(20).optional()
});

// schemas/profile.traceup.ts
export const VideoSchema = z.object({
  source: z.enum(['youtube', 'dailymotion', 'vimeo']),
  videoUrl: z.string().url(),
  category: z.enum(['actualite', 'offres', 'astuces', 'emplois']),
  title: I18nStringSchema.refine(d => d.fr.length >= 1 && d.fr.length <= 120, "Title FR required (1-120 chars)"),
  description: I18nStringSchema.optional()
});

export const TraceUpDataSchema = z.object({
  channelName: I18nStringSchema.optional(),  // optional, fallback to company.data.displayName
  videos: z.array(VideoSchema).min(1).max(50)
});

// schemas/profile.linkup.ts
export const GpsPositionSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),  // longitude
    z.number().min(-90).max(90)     // latitude
  ])
});

export const LinkUpDataSchema = z.object({
  contactCard: z.object({
    photo: z.string().url(),
    fullName: z.string().min(2),
    title: I18nStringSchema.refine(d => d.fr.length >= 1, "Title FR required"),
    company: I18nStringSchema.refine(d => d.fr.length >= 1, "Company FR required"),
    bio: I18nStringSchema.optional(),
    email: z.string().email(),
    phone: z.string().regex(/^\+216 \d{2} \d{3} \d{3}$/),
    whatsapp: z.string().regex(/^\+216 \d{2} \d{3} \d{3}$/),
    website: z.string().url().nullable().optional(),
    address: z.string().min(5),
    gpsPosition: GpsPositionSchema
  }),
  qrConfig: z.object({
    style: z.enum(['rounded', 'square', 'dots']),
    colorForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    colorBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    logoOverlay: z.boolean()
  }),
  socials: z.array(z.object({
    platform: z.enum(['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok']),
    url: z.string().url().nullable()
  })).optional().default([])
});
```

### 13.2 Usage dans les API routes Next.js

```ts
// app/api/dashboard/profile/[type]/route.ts
import { NextRequest } from 'next/server';
import { BrandUpDataSchema } from '@/schemas/profile.brandup';

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  const body = await req.json();

  let validated;
  try {
    if (params.type === 'brandup') validated = BrandUpDataSchema.parse(body);
    else if (params.type === 'traceup') validated = TraceUpDataSchema.parse(body);
    else validated = LinkUpDataSchema.parse(body);
  } catch (err) {
    return Response.json({ error: err.errors }, { status: 400 });
  }

  // Save to pendingData ...
}
```

---

## 14. Helpers API

```ts
// helpers/marketup.ts (ou window.MARKETUP_HELPERS dans la maquette)

// ===== Lookups =====
export const getCompanyBySlug = (slug: string): Company | null =>
  MARKETUP_DATA.companies.find(c => c.slug === slug) || null;

export const getCompanyById = (id: string): Company | null =>
  MARKETUP_DATA.companies.find(c => c.id === id) || null;

export const getCurrentUserCompany = (): Company | null =>
  getCompanyById(MARKETUP_DATA._meta.currentUserCompanyId);

// ===== Visibility =====
export function isProfileVisible(company: Company, profileType: ProfileType): boolean {
  if (company.validationStatus !== 'active') return false;
  if (company.pendingData) return false;
  if (company.deletedAt) return false;

  const profile = company.profiles[profileType];
  if (profile.status !== 'active') return false;
  if (profile.pendingData) return false;

  return true;
}

// ===== Filtres moteurs =====
export const getVisibleProfiles = (profileType: ProfileType): Company[] =>
  MARKETUP_DATA.companies.filter(c => isProfileVisible(c, profileType));

export const filterByGeography = (companies: Company[], gouvernorat: string): Company[] =>
  companies.filter(c => c.liveData.gouvernorat === gouvernorat);

export const filterBySector = (companies: Company[], sectorId: string): Company[] =>
  companies.filter(c => c.liveData.sectorId === sectorId);

// ===== Computed boost/sponsoring =====
export function getActiveBoost(profile: Profile): Boost | null {
  const now = new Date();
  return profile.boostHistory.find(b => {
    return new Date(b.from) <= now && now <= new Date(b.to) && b.status === 'active';
  }) || null;
}

export const getActiveSponsoring = (profile: Profile): Sponsoring | null => /* idem */ null;

export const hasActiveBoost = (profile: Profile): boolean => getActiveBoost(profile) !== null;

// ===== Money =====
export const computeTTC = (priceHT: number, vatRate = 0.19): number => priceHT * (1 + vatRate);
export const computeVATAmount = (priceHT: number, vatRate = 0.19): number => priceHT * vatRate;

export const formatMoneyHT = (price: number): string =>
  `${price.toFixed(2).replace('.', ',')} DT HT`;
export const formatMoneyTTC = (price: number, vatRate = 0.19): string =>
  `${computeTTC(price, vatRate).toFixed(2).replace('.', ',')} DT TTC`;

// ===== Aggregations admin =====
export const getCompaniesByValidationStatus = (status: CompanyValidationStatus): Company[] =>
  MARKETUP_DATA.companies.filter(c => c.validationStatus === status);

export const getRsePendingCount = (): number =>
  MARKETUP_DATA.companies.reduce((sum, c) =>
    sum + c.rseReceipts.filter(r => r.status === 'pending').length, 0);

export const getProfilesPendingCount = (): number =>
  MARKETUP_DATA.companies.reduce((sum, c) => {
    return sum +
      (c.profiles.brandup.pendingData ? 1 : 0) +
      (c.profiles.traceup.pendingData ? 1 : 0) +
      (c.profiles.linkup.pendingData ? 1 : 0) +
      (c.profiles.brandup.status === 'pending' && !c.profiles.brandup.pendingData ? 1 : 0) +
      (c.profiles.traceup.status === 'pending' && !c.profiles.traceup.pendingData ? 1 : 0) +
      (c.profiles.linkup.status === 'pending' && !c.profiles.linkup.pendingData ? 1 : 0);
  }, 0);

// ===== KPIs globaux =====
export function getKpiSnapshot() {
  const companies = MARKETUP_DATA.companies;
  return {
    companiesTotal: companies.length,
    companiesActive: companies.filter(c => c.validationStatus === 'active').length,
    companiesPending: companies.filter(c => c.validationStatus === 'pending').length,
    companiesSuspended: companies.filter(c => c.validationStatus === 'suspended').length,
    rseDonationsValidated: companies.reduce((sum, c) =>
      sum + c.rseReceipts.filter(r => r.status === 'validated').reduce((s, r) => s + r.amount, 0), 0
    ),
    monthlyRevenueHT: companies.reduce((sum, c) =>
      sum + c.transactions
        .filter(t => t.status === 'paid' && isThisMonth(t.paidAt))
        .reduce((s, t) => s + t.priceHT, 0), 0
    )
  };
}
```

**Pureté** : tous les helpers sont **read-only**, aucun ne mute le seed. Pendant les maquettes, les "Sauvegarder" affichent un toast mais ne modifient pas `MARKETUP_DATA`. En production, ces helpers deviennent des méthodes de model Mongoose ou des fonctions dans `helpers/`.

---

## 15. Edge cases coverage matrix

Le seed doit couvrir explicitement les cas suivants pour que le dev frontend puisse tester chaque chemin UI **sans coder de mock additionnel**.

### 15.1 Distribution voulue des 20 entreprises

| ID | Type | Validation | Profils (BU/TU/LU) | pendingData | Boost | Sponsoring | RSE | Litige |
|---|---|---|---|---|---|---|---|---|
| c-001 TechnoFab | B2B Méca | active | rejected / pending / active | none | LU active | LU active | validated 2/3 | aucun |
| c-002 MediaCom | B2B Pub | active | active / active / active | none | aucun | aucun | none | aucun |
| c-003 GreenLife | B2C Bio | active | active / incomplete / active | none | BU active | aucun | validated 1/1 | aucun |
| c-004 BuildTech | B2B BTP | active | incomplete / disabled / active | banner pending | aucun | aucun | none | aucun |
| c-005 FoodCorner | B2C Resto | suspended | active / active / active | none | aucun | aucun | revoked | 1 ouvert |
| c-006 ArchStudio | B2B Archi | pending (modifs) | active / active / active | logo pending | aucun | aucun | validated 2/2 | aucun |
| c-007 AutoPlus | B2B Auto | active | active / pending (modifs) / active | none | TU expired | aucun | none | aucun |
| c-008 PharmaTN | B2C Santé | pending (initial) | incomplete x3 | none | aucun | aucun | none | aucun |
| c-009 EduPro | B2B Educ | active | active / active / disabled | none | BU active | BU active | validated 1/1 | aucun |
| c-010 TextilTunis | B2B Textile | active | rejected / rejected / active | none | LU expired | LU expired | none | 1 ouvert |
| c-011 to c-020 | mix | mix | mix | sample | sample | sample | sample | aucun |

**Cette matrice garantit** :
- 4/4 validationStatus représentés (pending init / pending modifs / active / suspended)
- 5/5 profile statuses représentés
- pendingData niveau company ET niveau profil
- Boost/sponsoring : actif, expiré, jamais
- RSE : none / pending / validated (1 et plusieurs reçus) / revoked
- Litiges : 0 ou 1 par company concernée
- Mix B2B (~12) et B2C (~8)
- Couverture géographique : ≥ 8 gouvernorats différents

### 15.2 Cas UI explicitement couverts

| Écran | Cas couvert | Company de test |
|---|---|---|
| Moteur BrandUP | Tri boost actif first | c-003 boostée vs c-002 normale |
| Moteur TraceUP | Profils invisibles si pendingData | c-007 cachée |
| Profil public BrandUP | Galerie 4 vs 8 images | c-002 (8) vs c-003 (4) |
| Dashboard incomplete | Onboarding 1er profil | c-008 (full incomplete) |
| Dashboard rejected | Banner motif refus | c-001 BrandUP / c-010 BU+TU |
| Dashboard boost expiré | CTA renouveler | c-007 / c-010 |
| Dashboard RSE 0 reçu | Empty state | c-002 / c-007 |
| Dashboard RSE multi | Liste paginée | c-006 (2 receipts) |
| Admin file comptes | FIFO sur pending | c-008 + autres |
| Admin file profils | Filtre par type BU/TU/LU | mix |
| Admin file RSE | Décisions multi | c-001 (al-ahed pending) |
| Admin entreprise suspended | Badge + motif | c-005 |
| Admin litige ouvert | Affichage assigné | c-005, c-010 |

### 15.3 Edge cases textuels

- **Nom long** : `c-002 = "MediaCom Communication & Stratégie de Marque"` (60 chars) → wrapping
- **Pitch max** : `c-006` pitch FR 500 chars (limite haute)
- **Pitch min** : `c-003` pitch FR 50 chars (limite basse acceptée)
- **Bio LinkUP vide** : `c-007` (champ optionnel)
- **0 social network** : `c-009` (mais website renseigné, donc soumissible)

---

## 16. Migration paths (V1.1+)

### 16.1 Multilingue full (FR + AR + EN)

**Aucune migration de schema nécessaire**. Les champs `{ fr, ar, en }` existent déjà. On ajoute du contenu via :

```js
// Migration V1.1
db.companies.updateMany(
  { "data.displayName.ar": "" },
  [{ $set: { "data.displayName.ar": /* traduction */ } }]
);
```

Le frontend déjà capable de fallback : `pitch[locale] || pitch.fr`.

### 16.2 Multi-utilisateurs par entreprise

Transformation : `accountUser` (objet) → `users[]` (array).

```js
// Migration V1.1+
db.companies.updateMany(
  {},
  [{ $set: {
    users: [{ $mergeObjects: ["$accountUser", { role: "owner" }] }]
  }}, { $unset: "accountUser" }]
);
```

Schemas et UI à adapter (gestion d'invitation, rôles). Effort : moyen.

### 16.3 Decimal128 pour la monnaie

Si pas fait dès V1 :

```js
db.companies.updateMany(
  {},
  [{ $set: {
    "transactions.$[].priceHT": { $toDecimal: "$transactions.priceHT" }
  }}]
);
```

Recommandé de faire **dès V1** côté Mongoose (pas de migration nécessaire en pratique).

### 16.4 Analytics séparée

Si TraceUP videos[] explose (>50 par company) ou si stats deviennent volumineuses, extraction en collection séparée :

```js
// Avant
company.profiles.traceup.data.videos = [...]

// Après
db.videos.find({ companyId: c._id, profileType: 'traceup' })
```

Migration : script `extract-videos.js`. Effort : élevé (les helpers et requêtes changent partout).

### 16.5 Roles admin granulaires

`AdminUser.role` actuellement `super_admin | moderator`. Ajouter des permissions fines :

```js
// V1.1+
adminUser.permissions = {
  validateAccounts: true,
  validateProfiles: true,
  validateRse: false,
  manageDisputes: true,
  editPlatformSettings: false
};
```

Middleware Next.js check les permissions par route.

### 16.6 Migration rejectionMode strict → lenient (V1 → V2)

V1 utilise **Option B (strict)** : un rejet de modifs fait passer le compte/profil en `rejected`, invisible jusqu'à resoumission validée.

V2 prévoit la possibilité de basculer vers **Option A (lenient)** : un rejet ramène simplement à l'état précédent (`active`), les modifs sont juste discardées.

**Le schéma est strictement identique** entre les deux modes. Migration en 3 étapes :

**Étape 1** — Modifier la logique de l'API admin reject (1 ligne) :

```js
// V1 (strict)
update.$set.validationStatus = "rejected";
// V2 (lenient)
update.$set.validationStatus = "active";   // retour à l'état précédent
```

Ou via toggle config (recommandé) :
```js
const mode = platformSettings.validation.rejectionMode;
update.$set.validationStatus = (mode === "lenient") ? "active" : "rejected";
```

**Étape 2** — Script de migration des comptes "coincés" (one-shot) :

```js
// scripts/migrate-v1-to-v2-lenient-reject.js
db.companies.updateMany(
  {
    validationStatus: "rejected",
    validatedAt: { $exists: true, $ne: null }   // a déjà été approuvé une fois
  },
  { $set: { validationStatus: "active" } }
);
// Idem pour profiles.brandup.status, profiles.traceup.status, profiles.linkup.status
```

**Étape 3** — Toggle `platformSettings.validation.rejectionMode = "lenient"` en base.

Aucun changement de schema, aucun index modifié, aucun refactoring. Migration 5-10 minutes en prod.

---

## 17. Décisions Log

Liste numérotée des décisions structurantes prises pendant la conception. Toute évolution de schéma doit être tracée ici.

| # | Décision | Justification | Date |
|---|---|---|---|
| 1 | camelCase pour tous les champs | Compatibilité Mongoose, lisibilité JS | 2026-04-22 |
| 2 | IDs human-readable en seed (`c-001`) | Debug, audit | 2026-04-22 |
| 3 | Slugs lockés après création | SEO stability | 2026-04-22 |
| 4 | ISO 8601 UTC pour toutes les dates | MongoDB native, no tz issues | 2026-04-22 |
| 5 | Pattern `liveData` + `data` + `pendingData` | Workflow de validation par champ | 2026-04-22 |
| 6 | Embed des profils dans Company | Reads pattern, atomicité, taille raisonnable | 2026-04-22 |
| 7 | Embed transactions, rseReceipts, boost/sponsoring history | Idem | 2026-04-22 |
| 8 | Reference (collection séparée) pour disputes, notifications, adminUsers | Cross-entity reads | 2026-04-22 |
| 9 | Multilingue ready dès V1 (FR populé, AR/EN vides) | Évite migration future | 2026-04-22 |
| 10 | 5 statuts profil incluant `incomplete` | Flow d'onboarding sans Brouillon | 2026-04-22 |
| 11 | 3 profils auto-créés en `incomplete` à l'inscription | Sidebar cohérente, modèle prévisible | 2026-04-22 |
| 12 | Visibilité computed read-time, jamais stockée | Réversibilité suspension | 2026-04-22 |
| 13 | Cascade au read-time, pas au write-time | Audit, performance | 2026-04-22 |
| 14 | Dénormalisation `associationName` dans rseReceipts | Évite $lookup, performance read | 2026-04-22 |
| 15 | DiceBear + Picsum pour assets seed | Déterministe, gratuit, sans clé API | 2026-04-22 |
| 16 | Dossier `/shared/` pour PDFs partagés | 1 fichier par type, simplicité dev | 2026-04-22 |
| 17 | `passwordHash` masqué dans toJSON | Sécurité par défaut | 2026-04-22 |
| 18 | Single user per company V1 | Scope contrat, migration V1.1 simple | 2026-04-22 |
| 19 | Décimal128 pour money en MongoDB (Number en seed) | Précision financière | 2026-04-22 |
| 20 | TraceUP multi-source : YouTube + Dailymotion + Vimeo | Cahier des charges | 2026-04-20 |
| 21 | Galerie BrandUP : 4-8 images | UX, performance load | 2026-04-22 |
| 22 | Rejet de modifs : Option B (strict) en V1 — passe en `rejected`, invisible jusqu'à resoumission | Protection qualité plateforme V1 | 2026-04-22 |
| 23 | RSE jamais dans transactions[] | Le don ne transite pas par la plateforme | 2026-04-22 |
| 24 | rseBadgeStatus calculé auto au validate/reject | Cohérence single source | 2026-04-22 |
| 25 | minContent rules dans platformSettings | Éditable par admin V1.2 | 2026-04-22 |
| 26 | TraceUP videos : pas de pendingData en V1 (ajout libre) | Fluidité user, modération a posteriori via reports | 2026-04-22 |
| 27 | LinkUP : 9 champs obligatoires (incl. WhatsApp + GPS) | Liste métier explicite, modifiable V1.2 par admin | 2026-04-22 |
| 28 | gpsPosition en GeoJSON Point format | MongoDB-natif, support index 2dsphere V1.1+ | 2026-04-22 |
| 29 | Galerie BrandUP min 6 / max 8 images | Cohérence visuelle des cards moteur | 2026-04-22 |
| 30 | platformSettings.validation.rejectionMode toggle | Permet migration V1 (strict) → V2 (lenient) sans refactor | 2026-04-22 |
| 31 | ~~Ajout `tagline`~~ → **Concept abandonné** : pas de tagline sur aucun profil. L'en-tête commun aux 3 profils affiche `company.data.displayName` (titre principal) + meta (RNE/secteur/type) + contacts depuis `company.liveData` | Simplification UX, header identique BU/TU/LU | Initial 2026-04-23, abandon 2026-04-24 |
| 32 | Distinction `pitch` (50-500) vs `about` (≤1000) sur BrandUP — about = bloc "Expertise & Vision" | Hiérarchie pitch (court) / about (long Expertise) | 2026-04-23 |
| 33 | BrandUP : ajout `projects[]` (= images Catalogue de Production) + `certifications[]` (= bloc Certifications & Standards) | Aligner sur les sections existantes du profil public | 2026-04-23 |
| 34 | Ajout TraceUP `channelName` (optional, fallback displayName) | Permet branding distinct de la chaîne média | 2026-04-23 |
| 35 | Suppression "secondary language" V1 — `liveData.languages` array avec FR seul sélectionnable | Restriction V1, prêt pour multi V1.1+ | 2026-04-23 |
| 36 | Certifications : champ `image` optional (logo certif) avec fallback icône | Affichage flexible : logo officiel ou icône material | 2026-04-23 |
| 37 | BrandUP : abandon `foundedYear`, `employeesCount`, `clients` | Champs jugés non utiles V1 — reportés à V1.1+ si besoin | 2026-04-23 |
| 38 | Inscription : remplacement "Identifiant légal (RNE)" + "Matricule fiscal" texte par "Identifiant légal" + upload obligatoire `identityDocumentUrl` | Évite ressaisie risquée du RNE, obligation légale d'avoir le document de référence | 2026-04-23 |
| 39 | Ajout `liveData.whatsapp` au niveau company | En-tête commun aux 3 profils affiche téléphone + WhatsApp côte à côte (cf. capture validée) | 2026-04-24 |
| 40 | En-tête commun aux 3 profils : logo + nom + badge RSE si validé + meta (RNE/secteur/type) + contact (phone/whatsapp/email) + adresse complète, **toutes données issues de `company` (account-level)** | Seul le **contenu interne** des profils diffère — l'identité est partagée | 2026-04-24 |
| 41 | ~~TBD~~ → **Résolu** : suppression complète de `brand-tagline` sur les 3 admin_*-detail.html (hero ne montre plus que logo + nom) | Décision Ahmed : simplification radicale | 2026-04-24 |
| 42 | ~~TBD~~ → **Résolu** : suppression aussi des sections "Rôle sur la carte" et "Tagline publique" dans admin_linkup-detail.html | Décision Ahmed : ces sections devenues inutiles avec la suppression du tagline | 2026-04-24 |
| 43 | Vague 2 admin patches : RNE label simplifié, matricule supprimé, ajout WhatsApp + lien document légal sur `admin_validation-comptes.html` et `admin_entreprise-detail.html` | Cohérence avec auth_inscription-entreprise.html et dashboard_account.html | 2026-04-24 |

---

## 18. Glossaire

| Terme | Définition |
|---|---|
| **Brouillon** | (Supprimé du canon) — anciennement état "modifs non sauvées d'un profil existant" |
| **Cascade** | Règle où une modification ou un état au niveau parent (Company) impacte les enfants (Profiles) sans muter ces enfants |
| **Computed** | Valeur calculée à la volée à chaque lecture, jamais stockée en DB |
| **Embed** | Sub-document inclus directement dans le document parent (vs reference) |
| **Field-badge** | Indicateur visuel sur un champ d'édition : `locked`, `live`, `validation`, `verified` |
| **Incomplete** | État d'un profil créé mais avec contenu minimum non atteint, jamais soumis |
| **liveData** | Champs Company éditables instantanément, sans validation admin |
| **Modèle B (validation)** | Stratégie : profil INVISIBLE pendant la review admin (cohérence visuelle stricte) |
| **pendingData** | Sub-objet contenant les modifications de `validated fields` en attente de validation admin |
| **Reference** | Document dans une collection séparée référencé par `_id` (vs embed) |
| **Seed** | Données initiales réalistes injectées en DB pour le développement et tests |
| **SLA** | Service Level Agreement — délai d'engagement de l'admin pour traiter une queue |
| **Slug** | Chaîne URL-safe (lowercase, hyphenated) identifiant publiquement une entité |
| **TVA / VAT** | Taxe sur la Valeur Ajoutée — 19% en Tunisie, calculée à la volée |
| **Validation** | Action de l'admin qui approuve ou rejette des modifications utilisateur |

---

**FIN DU DOCUMENT**

Tout changement structurel doit être :
1. Discuté avec le DG / lead dev
2. Documenté dans le Décisions Log (§17)
3. Reflété dans le seed `marketup_seed_data.js`
4. Reflété dans les schemas Mongoose `models/`
5. Reflété dans les schemas Zod `schemas/`
6. Reflété dans la doc handoff `MARKETUP_DEV_HANDOFF.md`

Cohérence cross-fichier = critère #1 de l'audit qualité.

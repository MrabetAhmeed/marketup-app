# ARCHITECTURE REFERENCE — MARKET-UP

**Date :** 23 mai 2026
**Etat :** post-demo, pre-V1.1
**Ce document complete** `RESUME_CONVERSATION_22_MAI.md` et `PROJECT_TRANSFERT_v3.md`

---

## Table des matieres

- [Section 1 — Mongoose Profile model](#section-1--mongoose-profile-model)
- [Section 2 — Mongoose Company model](#section-2--mongoose-company-model)
- [Section 3 — Zod schemas hard / soft / submit](#section-3--zod-schemas-hard--soft--submit)
- [Section 4 — isProfileVisible()](#section-4--isprofilevisible)
- [Section 5 — Service validateProfileByAdmin()](#section-5--service-validateprofilebyadmin)
- [Section 6 — API route tree](#section-6--api-route-tree)

---

## Section 1 — Mongoose Profile model

### Fichiers concernes

- `src/models/profile.model.ts` — base schema + discriminator key
- `src/models/profile-brandup.model.ts` — BrandUP data sub-schema
- `src/models/profile-traceup.model.ts` — TraceUP data sub-schema
- `src/models/profile-linkup.model.ts` — LinkUP data sub-schema

### 1.1 Base schema (`profile.model.ts`)

```ts
import { Schema, model, models, Types } from "mongoose";

// --- Shared sub-schemas ---

const PendingDataFieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    currentValue: { type: Schema.Types.Mixed, required: true },
    newValue: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const AuditEntrySchema = new Schema(
  {
    at: { type: Date, required: true },
    by: { type: Types.ObjectId, required: true },
    byRole: { type: String, enum: ["OWNER", "SUPER_ADMIN"], required: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const ProfileSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    status: {
      type: String,
      enum: ["incomplete", "pending", "active", "rejected", "disabled"],
      default: "incomplete",
      index: true,
    },
    isPublic: { type: Boolean, default: true },

    // Workflow timestamps
    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    lastValidatedAt: { type: Date, default: null },
    lastValidatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    rejectionReason: { type: String, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    disabledAt: { type: Date, default: null },

    // Pending modifications
    pendingData: {
      type: new Schema(
        {
          submittedAt: { type: Date, required: true },
          fields: { type: [PendingDataFieldSchema], required: true },
          note: { type: String, default: null },
          previousStatus: { type: String, enum: ["active", "rejected", "incomplete"], default: null },
        },
        { _id: false },
      ),
      default: null,
    },

    stats: {
      viewsTotal: { type: Number, default: 0 },
      views30d: { type: Number, default: 0 },
      clicksTotal: { type: Number, default: 0 },
    },
    deletedAt: { type: Date, default: null, index: true },
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  { timestamps: true, versionKey: false, discriminatorKey: "kind" },
);
```

**Options cles :**
- `discriminatorKey: "kind"` — la valeur est injectee automatiquement par le discriminator model
- `versionKey: false` — pas de `__v`
- `timestamps: true` — `createdAt` + `updatedAt` auto

**pendingData sub-schema (post Sprint 7C+++) :**
- `fields[]` — tableau de `{ key, label, currentValue, newValue }` (Mixed = polymorphe)
- `previousStatus` — status avant submit, pour restaurer au cancel (ajoute Sprint 7C++ apres bug strict:true)
- `submittedAt` — date de soumission
- `note` — optionnel, jamais utilise en V1

### 1.2 Indexes

```ts
ProfileSchema.index({ companyId: 1, kind: 1 }, { unique: true });
ProfileSchema.index({ kind: 1, status: 1, submittedAt: 1 });
```

| Index | Champs | Options | Usage |
|-------|--------|---------|-------|
| Compound unique | `{ companyId: 1, kind: 1 }` | `unique: true` | Empeche 2 profils du meme kind par company |
| Listing admin | `{ kind: 1, status: 1, submittedAt: 1 }` | — | Queue de validation admin |
| Simple | `companyId: 1` | `index: true` sur le champ | Lookup rapide par company |
| Simple | `status: 1` | `index: true` sur le champ | Filtrage par status |
| Simple | `deletedAt: 1` | `index: true` sur le champ | Soft delete filter |

### 1.3 Hooks

```ts
// Soft-delete filter — applique automatiquement sur tout find/findOne
ProfileSchema.pre(/^find/, function (this) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});
```

Un seul hook : le soft-delete filter. Pour bypasser : `.setOptions({ withDeleted: true })`.

### 1.4 Discriminator BrandUP (`profile-brandup.model.ts`)

```ts
const BrandUpSchema = new Schema(
  {
    data: {
      pitch: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
      about: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
      color: { type: String, default: "#0078D4" },
      services: [{ name: { type: I18nStringSchema, required: true } }],
      gallery: [{
        id: { type: String, required: true },
        url: { type: String, required: true },
        caption: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
        order: { type: Number, default: 0 },
      }],
      projects: [{
        id: { type: String, required: true },
        name: { type: I18nStringSchema, required: true },
        image: { type: String, default: null },
        description: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
        order: { type: Number, default: 0 },
      }],
      certifications: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        label: { type: I18nStringSchema, required: true },
        icon: { type: String, default: null },
        image: { type: String, default: null },
        issuedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
      }],
      links: [{
        label: { type: I18nStringSchema, required: true },
        url: { type: String, required: true },
        icon: { type: String, default: null },
      }],
    },
  },
  { _id: false, versionKey: false },
);

export const BrandUp =
  Profile.discriminators?.brandup || Profile.discriminator("brandup", BrandUpSchema);
```

**Tous les champs BrandUP sont HARD** (passent par pendingData). Seul `isPublic` est soft.

### 1.5 Discriminator TraceUP (`profile-traceup.model.ts`)

```ts
const TraceUpSchema = new Schema({
  data: {
    channelName: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    channelDescription: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    videos: { type: [VideoSchema], default: [] },
  },
}, { _id: false, versionKey: false });
```

`VideoSchema` contient : `id, source (youtube|dailymotion|vimeo), videoId, videoUrl, thumbnailUrl, category (actualite|offres|astuces|emplois), title (I18n), description (I18n), status (pending|active|rejected), publishedAt, order`.

**Exception CLAUDE.md 6.10 :** les videos sont CRUD direct (soft), seuls channelName et channelDescription sont hard.

### 1.6 Discriminator LinkUP (`profile-linkup.model.ts`)

```ts
const LinkUpSchema = new Schema({
  data: {
    contactCard: {
      photo, fullName, title (I18n), company (I18n), bio (I18n),
      email, phone, whatsapp, website, address,
      gpsPosition: { type: "Point", coordinates: [Number] },
    },
    qrConfig: { style, colorForeground, colorBackground, logoOverlay },
    socials: [{ platform: String, url: String }],
  },
}, { _id: false, versionKey: false });

LinkUpSchema.index({ "data.contactCard.gpsPosition": "2dsphere" });
```

**LinkUP n'a pas de champs hard.** Socials sont soft. Le contactCard est seed-only en V1.

### 1.7 PROFILE_MODELS map

Defini dans `src/services/auth.service.ts` (et importe/recree dans chaque service qui cree des profils) :

```ts
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";

const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;

const PROFILE_MODELS = {
  brandup: BrandUpModel,
  traceup: TraceUpModel,
  linkup: LinkUpModel,
} as const;
```

**IMPORTANT :** Ne jamais utiliser `ProfileModel.create({ kind: "brandup" })` — le kind ne sera pas injecte et les defaults data.* ne seront pas appliques. Toujours utiliser `PROFILE_MODELS[kind].create()`.

Le pattern equivalent dans les services (admin-profile.service, profile-hard.service, profile-soft.service) est :

```ts
function getModelForKind(kind: ProfileKind): any {
  switch (kind) {
    case "brandup": return BrandUpModel;
    case "traceup": return TraceUpModel;
    case "linkup": return LinkUpModel;
  }
}
```

---

## Section 2 — Mongoose Company model

### Fichier : `src/models/company.model.ts`

```ts
const CompanySchema = new Schema(
  {
    // Locked fields (immutable after creation)
    slug: { type: String, unique: true, index: true, required: true },
    type: { type: String, enum: ["B2B", "B2C"], required: true, immutable: true },
    legalId: { type: String, required: true, immutable: true, index: true },
    vatNumber: { type: String, default: null, immutable: true },
    identityDocumentUrl: { type: String, default: null },  // PAS immutable (fix Sprint 6.2C)
    country: { type: String, default: "TN", immutable: true },
    accountEmail: { type: String, required: true, unique: true, immutable: true, lowercase: true, trim: true },

    // Validation-gated data
    data: {
      displayName: { type: I18nStringSchema, required: true },
      logoUrl: { type: String, default: null },
      bannerUrl: { type: String, default: null },
      color: { type: String, default: "#0078D4" },
    },

    // Pending change requests for validation-gated fields
    pendingUpdates: {
      type: new Schema({
        submittedAt: { type: Date, required: true },
        fields: { type: [PendingUpdateFieldSchema], required: true },
        note: { type: String, default: null },
      }, { _id: false }),
      default: null,
    },

    // Live data (instant edits, no admin review)
    liveData: {
      sectorId: { type: String, required: true },
      gouvernorat: { type: String, required: true },
      ville: { type: String, required: true },
      address: { type: String, default: null },
      contactEmail: { type: String, lowercase: true, trim: true },
      phone: { type: String, default: null },
      whatsapp: { type: String, default: null },
      languages: [{ type: String, enum: ["fr", "ar", "en"] }],
    },

    // Lifecycle
    status: { type: String, enum: ["pending", "active", "rejected", "suspended", "deleted"], default: "pending", index: true },
    registeredAt: { type: Date, default: Date.now },
    validatedAt: { type: Date, default: null },
    validatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, default: null },

    // RSE
    rseBadgeStatus: { type: String, enum: ["none", "validated"], default: "none" },
    rseBadgeValidatedAt: { type: Date, default: null },

    ownerUserId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    deletedAt: { type: Date, default: null, index: true },
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);
```

### Indexes

```ts
CompanySchema.index({ status: 1, registeredAt: 1 });
CompanySchema.index({ "liveData.sectorId": 1, status: 1 });
CompanySchema.index({ "liveData.gouvernorat": 1, status: 1 });
```

Plus les indexes implicites `unique: true` sur `slug`, `accountEmail`, `ownerUserId`, et `index: true` sur `legalId`, `status`, `deletedAt`.

### Hooks

```ts
// Soft-delete filter (identique au Profile)
CompanySchema.pre(/^find/, function (this) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});
```

**Note :** pas de hook pre-validate pour le slug — le slug est genere dans `auth.service.ts` via `generateSlug()` + `ensureUniqueSlug()` avant `Company.create()`.

### identityDocumentUrl — PAS immutable

`immutable: true` a ete retire de ce champ au Sprint 6.2C car il empechait le `$set` pour les re-uploads de document rejete. C'est un des bugs Mongoose subtils documentes.

---

## Section 3 — Zod schemas hard / soft / submit

### 3.1 BrandupHardSubmitSchema (`src/schemas/profile-hard.schema.ts`)

```ts
const GalleryItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  caption: z.string().max(80).default(""),
  order: z.number().int().min(0),
});

export const BrandupHardSubmitSchema = z.object({
  pitch: z.string().trim().min(1).max(280),
  about: z.string().trim().min(1).max(1000),
  gallery: z.array(GalleryItemSchema).max(9).optional(),
  currentGallery: z.array(GalleryItemSchema).optional(),  // Snapshot pre-edit (Sprint 7C+++)
}).strict();
```

**Regle metier non-evidente :** `currentGallery` est le snapshot de la galerie AVANT edits. Il est envoye par le client au submit pour calculer le diff correctement (car POST /gallery ecrit deja dans data.gallery avant le submit).

### 3.2 TraceupHardSubmitSchema

```ts
export const TraceupHardSubmitSchema = z.object({
  channelName: z.string().trim().min(1).max(60),
  channelDescription: z.string().trim().min(1).max(500),
}).strict();
```

### 3.3 LinkupHardSubmitSchema

```ts
export const LinkupHardSubmitSchema = z.object({}).strict();
// LinkUP n'a pas de champs hard — ce schema valide que le body est vide
```

### 3.4 Soft schemas (`src/schemas/profile-soft.schema.ts`)

```ts
export const BrandupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

export const TraceupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

export const LinkupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
  socials: z.array(z.object({
    platform: z.enum(["website", "linkedin", "facebook", "instagram", "youtube"]),
    url: z.union([z.string().url(), z.literal("")]),
  })).refine(
    (arr) => new Set(arr.map(s => s.platform)).size === arr.length,
    { message: "Chaque plateforme ne peut apparaitre qu'une seule fois." },
  ).optional(),
}).strict();
```

### 3.5 AccountLiveUpdateSchema (`src/schemas/account.schema.ts`)

```ts
export const AccountLiveUpdateSchema = z.object({
  contactEmail: z.string().trim().email().max(255).optional(),
  phone: z.string().trim()
    .refine((v) => /^[+\s\-()0-9]*$/.test(v))
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .pipe(z.string().regex(/^\+[0-9]{8,15}$/))
    .optional(),
  whatsapp: z.string().trim()
    .refine((v) => /^[+\s\-()0-9]*$/.test(v))
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .pipe(z.string().regex(/^\+[0-9]{8,15}$/))
    .optional(),
  ville: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().max(300).optional()
    .transform((v) => (v === "" ? null : v)),
});
```

**Regle non-evidente :** le `phone` et `whatsapp` passent par un double pipeline : 1) refine (accepte les espaces/tirets), 2) transform (retire les espaces/tirets), 3) pipe (valide le format `+216XXXXXXXX`).

---

## Section 4 — isProfileVisible()

### Fichier : `src/lib/visibility.ts`

```ts
import type { CompanyStatus, ProfileStatus } from "@/types";

export function isProfileVisible(
  profile: { status: ProfileStatus; isPublic: boolean; pendingData?: unknown | null },
  company: { status: CompanyStatus },
): boolean {
  return (
    company.status === "active" &&
    profile.status === "active" &&
    profile.isPublic === true &&
    profile.pendingData == null     // == null couvre undefined ET null
  );
}
```

### Les 4 conditions dans l'ordre :

1. `company.status === "active"` — company suspendue/rejetee/pending = profils invisibles
2. `profile.status === "active"` — profil pending/rejected/incomplete/disabled = invisible
3. `profile.isPublic === true` — toggle owner (soft change)
4. `profile.pendingData == null` — profil avec modifications en attente = invisible (Sprint 7C)

**Drift check :** oui, `profile.isPublic === true` EST dans la cascade. Pas de drift entre SEED_ARCHITECTURE et le code reel.

**Jamais persiste en DB.** Toujours recalcule a chaque lecture.

---

## Section 5 — Service validateProfileByAdmin()

### Fichier : `src/services/admin-profile.service.ts` (lignes 255-308)

```ts
export async function validateProfileByAdmin(
  profileId: string,
  adminId: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  await connectDb();

  // 1. Load profile
  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");

  // 2. Guard: only pending profiles can be validated
  if (profile.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce profil n'est pas en attente de validation.");
  }

  // 3. Select discriminator model for the kind
  const kind: ProfileKind = profile.kind;
  const Model = getModelForKind(kind);
  const now = new Date();

  // 4. Build $set map — merge pendingData.fields into data
  const setMap: Record<string, unknown> = {
    status: "active",
    publishedAt: now,
    lastValidatedAt: now,
    lastValidatedBy: adminId,
    pendingData: null,          // Clear pendingData
    rejectionReason: null,      // Clear rejection history
    rejectedAt: null,
    rejectedBy: null,
  };

  // 5. Merge each pendingData field into data.*
  if (profile.pendingData?.fields) {
    for (const field of profile.pendingData.fields) {
      setMap[`data.${field.key}`] = field.newValue;
    }
  }

  // 6. Atomic update via discriminator model
  await Model.findByIdAndUpdate(profileId, { $set: setMap });

  // 7. Send email to owner (non-blocking, try/catch)
  try {
    const company = await CompanyModel.findById(profile.companyId).lean();
    const user = await UserModel.findOne({ companyId: profile.companyId }).lean();
    if (user && company) {
      await sendProfileValidatedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        profileKind: kind,
        profileUrl: `${env.NEXTAUTH_URL}/${kind}/${company.slug}`,
      });
    }
  } catch (err) {
    console.warn("[validateProfile] Email failed (non-blocking):", err);
  }
}
```

### Points critiques :

- **Merge = `setMap[data.${field.key}] = field.newValue`** — chaque field de pendingData est ecrit directement dans `data.*`
- **Gallery :** le `newValue` du field `gallery` est le tableau complet (snapshot approach C), pas un diff
- **Pas d'audit log** dans cette fonction (V1.1 backlog)
- **Pas de notification en base** (V1.1 backlog — actuellement email seulement)
- **findByIdAndUpdate atomique** — une seule operation MongoDB, pas de read-modify-write
- **Model = discriminator model** — obligatoire pour que `data.*` soit accepte par Mongoose

### rejectProfileByAdmin (meme fichier, lignes 314-360)

Similaire mais :
- Status → `"rejected"` (pas `"active"`)
- `pendingData` → `null` (discard)
- `rejectionReason` → fourni par l'admin
- Email `sendProfileRejectedEmail` avec lien vers dashboard

---

## Section 6 — API route tree

### Arborescence complete

```
src/app/api/
  auth/[...nextauth]/route.ts                          — NextAuth catch-all
  v1/
    auth/
      login/route.ts                                   — POST
      logout/route.ts                                  — POST
      signup/
        company/route.ts                               — POST
        user/route.ts                                  — POST
        verify-otp/route.ts                            — POST
      email/resend-validation/route.ts                 — POST
      password/
        forgot/route.ts                                — POST
        reset/route.ts                                 — POST
    me/
      route.ts                                         — GET
      account/
        route.ts                                       — PATCH
        logo/route.ts                                  — POST
        banner/route.ts                                — POST
        resubmit/route.ts                              — POST
      rse/donations/route.ts                           — POST
    profiles/[profileId]/
      submit/route.ts                                  — POST (hard submit)
      pending/route.ts                                 — DELETE (cancel pending)
      soft/route.ts                                    — PATCH (soft update)
      gallery/
        route.ts                                       — POST (add image)
        [imageId]/route.ts                             — DELETE (remove image)
      videos/
        route.ts                                       — POST (add video)
        [videoId]/route.ts                             — DELETE (remove video)
    admin/
      companies/
        route.ts                                       — GET (list)
        [companyId]/
          validate/route.ts                            — POST
          reject/route.ts                              — POST
          suspend/route.ts                             — POST
          reactivate/route.ts                          — POST
      profiles/[profileId]/
        validate/route.ts                              — POST
        reject/route.ts                                — POST
      rse/[receiptId]/
        validate/route.ts                              — POST
        reject/route.ts                                — POST
    public/
      brandup/[slug]/route.ts                          — GET
      traceup/[slug]/route.ts                          — GET
      linkup/[slug]/route.ts                           — GET
      signup-document/route.ts                         — POST
    search/
      brandup/route.ts                                 — GET
      traceup/route.ts                                 — GET
      linkup/route.ts                                  — GET
    resources/
      sectors-b2b/route.ts                             — GET
      categories-b2c/route.ts                          — GET
      gouvernorats/route.ts                            — GET
    uploads/
      image/route.ts                                   — POST
```

### Routes critiques — detail

| Route | Method | Auth guard | Body schema | Status codes |
|-------|--------|------------|-------------|--------------|
| `/profiles/[id]/submit` | POST | `requireOwner()` | `BrandupHardSubmitSchema` / `TraceupHardSubmitSchema` / `LinkupHardSubmitSchema` (auto-detect par kind) | 200, 400, 403, 404, 422 |
| `/profiles/[id]/pending` | DELETE | `requireOwner()` | (none) | 200, 403, 404, 422 |
| `/profiles/[id]/soft` | PATCH | `requireOwner()` | `BrandupSoftSchema` / `TraceupSoftSchema` / `LinkupSoftSchema` | 200, 400, 403, 404 |
| `/profiles/[id]/gallery` | POST | `requireOwner()` | `{ url: string, title: string }` (GalleryAddSchema) | 201, 400, 403, 404 |
| `/admin/profiles/[id]/validate` | POST | `requireAdmin()` | (none) | 200, 404, 422 |
| `/admin/profiles/[id]/reject` | POST | `requireAdmin()` | `{ reason: string }` | 200, 404, 422 |
| `/me/account` | PATCH | `requireOwner()` | `AccountLiveUpdateSchema` | 200, 400, 403, 404 |
| `/search/brandup` | GET | (none) | query: `?type&q&gouvernorat&sectorId&page&limit&lang` | 200 |

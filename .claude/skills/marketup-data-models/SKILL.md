---
name: marketup-data-models
description: Mongoose schemas, relationships, indexes, and the 3-tier validation pattern for the MARKET-UP platform. Use when designing or modifying any model in src/models/, when writing migration/seed scripts, or when implementing service-layer code that touches Company / Profile / Transaction / RseReceipt / Notification documents. Required reading before creating new collections or before changing any schema in src/models/.
---

# MARKET-UP — Data Models Skill

This skill encodes the exact data model decisions for MARKET-UP. **Read `reference/SEED_ARCHITECTURE.md` first** for full rationale; this file is the operational summary.

## 1. The 3-tier validation pattern (the single most important pattern)

Every editable text/image field on a Company or Profile is classified into **one** of three zones:

| Zone | Storage | UX |
|---|---|---|
| **Live** | `company.liveData.*` | written immediately on `PUT`, no review |
| **Data** (validated) | `company.data.*` or `profile.data.*` | first fill writes directly; subsequent edits write to `pendingUpdates` / `pendingData` |
| **Locked** | `company.*` top-level | written once on signup, never editable |

**Field classification (Company):**

```ts
// LOCKED
type: "B2B" | "B2C";   // never editable
legalId: string;       // RNE — never editable
vatNumber?: string;    // optional, never editable after signup
country: "TN";         // V1: Tunisia only
accountEmail: string;  // never editable (login)
slug: string;          // derived from displayName, never editable after creation

// VALIDATION-GATED (changes go to pendingUpdates)
data.displayName: I18nString;
data.logoUrl: string;

// LIVE (instant edits)
liveData.sectorId: string;
liveData.gouvernorat: string;
liveData.ville: string;
liveData.address: string;
liveData.contactEmail: string;
liveData.phone: string;
liveData.whatsapp: string;
liveData.languages: ("fr" | "ar" | "en")[];
```

**Field classification (Profile):** depends on the profile type. See §5.

## 2. Mongoose conventions

### Connection singleton

```ts
// src/lib/db.ts
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDb() {
  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
    });
  }
  return global._mongoosePromise;
}
```

Call `await connectDb()` at the top of every service. The singleton survives Next.js hot reloads.

### Model file template

```ts
// src/models/<entity>.model.ts
import { Schema, model, models, Types } from "mongoose";
import type { Model } from "mongoose";

const EntitySchema = new Schema({
  // fields here
}, {
  timestamps: true,           // adds createdAt + updatedAt
  versionKey: false,          // no __v
});

// Indexes
EntitySchema.index({ slug: 1 }, { unique: true });

// Discriminator (if needed)
// EntitySchema.set("discriminatorKey", "kind");

// Soft-delete query helper (default filter)
EntitySchema.pre(/^find/, function (this: any) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Entity: Model<EntityDoc> =
  models.Entity || model<EntityDoc>("Entity", EntitySchema);
```

**Never** call `mongoose.model(name, schema)` directly — always check `models.X || model(...)` because Next.js hot-reload registers the model twice otherwise.

### Soft delete

Every business document has `deletedAt: Date | null` (default `null`). The `pre('find')` middleware excludes deleted by default. Hard delete is forbidden for `Company`, `Profile`, `Transaction`, `RseReceipt`.

### Audit trail

Documents that admins can act on (`Company`, `Profile`, `RseReceipt`) have:

```ts
auditTrail: [{
  at: Date,
  by: ObjectId,            // ref AdminUser or User
  byRole: "OWNER" | "SUPER_ADMIN",
  action: string,          // "approved", "rejected", "modifs_approved", "logo_uploaded", ...
  details?: Record<string, unknown>,
}]
```

## 3. I18n field shape

```ts
// src/types/i18n.ts
export interface I18nString {
  fr: string;     // required
  ar?: string;    // optional
  en?: string;    // optional
}
```

Stored as a sub-document. **Never read directly in a service / API response** — pass through `pickLocale(value, lang)` from `@/lib/i18n`.

## 4. Company model (skeleton)

```ts
const CompanySchema = new Schema({
  // Locked
  slug: { type: String, unique: true, index: true, required: true },
  type: { type: String, enum: ["B2B", "B2C"], required: true, immutable: true },
  legalId: { type: String, required: true, immutable: true, index: true },
  vatNumber: { type: String, default: null, immutable: true },
  country: { type: String, default: "TN", immutable: true },
  accountEmail: { type: String, required: true, unique: true, immutable: true, lowercase: true, trim: true },

  // Validation-gated
  data: {
    displayName: { fr: String, ar: String, en: String },
    logoUrl: { type: String, default: null },
    color: { type: String, default: "#0078D4" },          // primary brand colour
  },

  // Pending change requests for validation-gated fields
  pendingUpdates: {
    type: {
      submittedAt: Date,
      fields: [{
        key: String,
        label: String,
        currentValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      }],
      note: String,
    },
    default: null,
  },

  // Live (instant edits)
  liveData: {
    sectorId: { type: String, required: true },
    gouvernorat: { type: String, required: true },
    ville: { type: String, required: true },
    address: { type: String, required: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    phone: String,
    whatsapp: String,
    languages: [{ type: String, enum: ["fr", "ar", "en"] }],
  },

  // Lifecycle
  status: {
    type: String,
    enum: ["pending", "active", "rejected", "suspended", "deleted"],
    default: "pending",
    index: true,
  },
  registeredAt: { type: Date, default: Date.now },
  validatedAt: Date,
  validatedBy: { type: Types.ObjectId, ref: "AdminUser" },
  rejectedAt: Date,
  rejectedReason: String,
  suspendedAt: Date,
  suspendedReason: String,

  // RSE
  rseBadgeStatus: { type: String, enum: ["none", "validated"], default: "none" },
  rseBadgeValidatedAt: Date,

  // Owner (denormalized for fast access)
  ownerUserId: { type: Types.ObjectId, ref: "User", required: true, unique: true },

  // Soft delete + audit
  deletedAt: { type: Date, default: null, index: true },
  auditTrail: [{ at: Date, by: Types.ObjectId, byRole: String, action: String, details: Schema.Types.Mixed }],
}, { timestamps: true });

CompanySchema.index({ status: 1, registeredAt: 1 });  // admin queue FIFO
CompanySchema.index({ "liveData.sectorId": 1, status: 1 });
CompanySchema.index({ "liveData.gouvernorat": 1, status: 1 });
```

## 5. Profile model (Mongoose discriminator pattern)

One base `Profile` collection with three discriminators: `brandup`, `traceup`, `linkup`. This avoids three near-identical collections.

```ts
const ProfileBaseSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
  kind: { type: String, enum: ["brandup", "traceup", "linkup"], required: true },

  status: {
    type: String,
    enum: ["incomplete", "pending", "active", "rejected", "disabled"],
    default: "incomplete",
    index: true,
  },
  isPublic: { type: Boolean, default: true },

  // Workflow timestamps
  submittedAt: Date,            // first submission (incomplete → pending)
  publishedAt: Date,             // first approval (pending → active)
  lastValidatedAt: Date,         // last admin approval (modifs or new)
  lastValidatedBy: { type: Types.ObjectId, ref: "AdminUser" },
  rejectionReason: String,
  rejectedAt: Date,
  rejectedBy: { type: Types.ObjectId, ref: "AdminUser" },
  disabledAt: Date,

  // Pending modifications (only meaningful when status === "active")
  pendingData: {
    type: {
      submittedAt: Date,
      fields: [{
        key: String,
        label: String,
        currentValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      }],
      note: String,
    },
    default: null,
  },

  // Per-profile stats (snapshot, refreshed by an async job)
  stats: {
    viewsTotal: { type: Number, default: 0 },
    views30d: { type: Number, default: 0 },
    clicksTotal: { type: Number, default: 0 },
  },

  deletedAt: { type: Date, default: null },
  auditTrail: [{ at: Date, by: Types.ObjectId, byRole: String, action: String, details: Schema.Types.Mixed }],
}, { timestamps: true, discriminatorKey: "kind" });

ProfileBaseSchema.index({ companyId: 1, kind: 1 }, { unique: true });
ProfileBaseSchema.index({ kind: 1, status: 1, submittedAt: 1 });  // admin queues

export const Profile = models.Profile || model("Profile", ProfileBaseSchema);
```

### BrandUP discriminator

```ts
const BrandUpSchema = new Schema({
  data: {
    pitch: { fr: String, ar: String, en: String },
    about: { fr: String, ar: String, en: String },
    color: String,
    services: [{ name: { fr: String, ar: String, en: String } }],
    gallery: [{ id: String, url: String, order: Number }],
    projects: [{ id: String, name: { fr: String, ar: String, en: String }, image: String, description: { fr: String, ar: String, en: String }, order: Number }],
    certifications: [{ id: String, name: { fr: String, ar: String, en: String }, label: { fr: String, ar: String, en: String }, image: String, issuedAt: Date, expiresAt: Date }],
    links: [{ label: { fr: String, ar: String, en: String }, url: String, icon: String }],
  },
});

export const BrandUp = Profile.discriminators?.brandup || Profile.discriminator("brandup", BrandUpSchema);
```

### TraceUP discriminator

```ts
const TraceUpSchema = new Schema({
  data: {
    channelName: { fr: String, ar: String, en: String },
    channelDescription: { fr: String, ar: String, en: String },
    videos: [{
      id: { type: String, required: true },           // nanoid or uuid
      source: { type: String, enum: ["youtube", "dailymotion", "vimeo"], required: true },
      videoId: { type: String, required: true },
      videoUrl: String,
      thumbnailUrl: String,
      category: { type: String, enum: ["actualite", "offres", "astuces", "emplois"], required: true },
      title: { fr: String, ar: String, en: String },
      description: { fr: String, ar: String, en: String },
      status: { type: String, enum: ["pending", "active", "rejected"], default: "active" },
      publishedAt: Date,
      order: Number,
    }],
  },
});

export const TraceUp = Profile.discriminators?.traceup || Profile.discriminator("traceup", TraceUpSchema);
```

**Reminder:** TraceUP videos are **not** subject to `pendingData`. CRUD them directly on the array. Only `channelName` and `channelDescription` flow through `pendingData`.

### LinkUP discriminator

```ts
const LinkUpSchema = new Schema({
  data: {
    contactCard: {
      photo: String,
      fullName: String,                                    // person, not company — not i18n
      title: { fr: String, ar: String, en: String },
      company: { fr: String, ar: String, en: String },
      bio: { fr: String, ar: String, en: String },
      email: String,
      phone: String,
      whatsapp: String,
      website: String,
      address: String,
      gpsPosition: {
        type: { type: String, default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
      },
    },
    qrConfig: {
      style: { type: String, default: "rounded" },
      colorForeground: { type: String, default: "#000000" },
      colorBackground: { type: String, default: "#FFFFFF" },
      logoOverlay: { type: Boolean, default: true },
    },
    socials: [{ platform: String, url: String }],
  },
});

LinkUpSchema.index({ "data.contactCard.gpsPosition": "2dsphere" });

export const LinkUp = Profile.discriminators?.linkup || Profile.discriminator("linkup", LinkUpSchema);
```

## 6. Other models (shorter signatures)

### User (owner login)
```ts
{
  firstName: String,
  lastName: String,
  email: String,                  // unique, lowercase
  passwordHash: String,
  languages: [String],
  role: { type: String, enum: ["OWNER"], default: "OWNER" },
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  // password reset
  passwordResetTokenHash: String,
  passwordResetExpiresAt: Date,
  // OTP for signup
  otpHash: String,
  otpExpiresAt: Date,
  otpAttempts: Number,
}
```

### AdminUser
```ts
{
  firstName: String, lastName: String,
  email: String,                  // unique
  passwordHash: String,
  role: { type: String, enum: ["SUPER_ADMIN"], default: "SUPER_ADMIN" },
  avatar: { initials: String, backgroundColor: String },
  languages: [String],
  lastLoginAt: Date,
}
```

### Transaction (Boost + Sponsoring only — NOT RSE donations)
```ts
{
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  type: { type: String, enum: ["boost", "sponsoring"], required: true },
  refId: { type: Types.ObjectId },                      // ref Boost or Sponsoring
  profileKind: { type: String, enum: ["brandup", "traceup", "linkup"] },

  priceHT: { type: Number, required: true },
  vatRate: { type: Number, required: true, default: 0.19 },   // snapshot
  currency: { type: String, default: "DT" },

  status: { type: String, enum: ["pending", "paid", "refunded", "failed"], default: "pending" },
  paymentMethod: { type: String, enum: ["card", "wire", "other"] },
  paymentReference: String,
  paidAt: Date,

  invoiceNumber: String,                                // INV-YYYY-NNNN, set on first GET
  invoiceUrl: String,                                   // lazy generated

  idempotencyKey: { type: String, index: true },        // 24h dedup window

  deletedAt: { type: Date, default: null },
}
```

VAT/TTC are **not** stored. Compute at read: `vatAmount = round(priceHT * vatRate, 2)`, `priceTTC = priceHT + vatAmount`.

### Boost
```ts
{
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  profileKind: { type: String, enum: ["brandup", "traceup", "linkup"] },
  from: Date,
  to: Date,
  transactionId: { type: Types.ObjectId, ref: "Transaction" },
  status: { type: String, enum: ["active", "expired"], default: "active" },
  viewsAdded: { type: Number, default: 0 },
  clicksAdded: { type: Number, default: 0 },
}
```

Compute `status` from `to >= now` at read; persist a daily cron job that flips expired ones for query efficiency.

### Sponsoring (campaign)
```ts
{
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  profileKind: String,
  targetCategory: String,                               // sectorId or B2C category
  from: Date,
  to: Date,
  transactionId: { type: Types.ObjectId, ref: "Transaction" },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  // optional: daily breakdown
  daily: [{ date: Date, impressions: Number, clicks: Number }],
}
```

### RseReceipt
```ts
{
  companyId: { type: Types.ObjectId, ref: "Company", index: true },
  associationId: { type: Types.ObjectId, ref: "Association" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "DT" },
  donationDate: { type: Date, required: true },
  receiptDocumentUrl: String,
  status: { type: String, enum: ["pending", "validated", "rejected"], default: "pending", index: true },
  submittedAt: { type: Date, default: Date.now },
  validatedAt: Date,
  validatedBy: { type: Types.ObjectId, ref: "AdminUser" },
  rejectedAt: Date,
  rejectedReason: String,
  auditTrail: [...],
  deletedAt: { type: Date, default: null },
}
```

### Notification
```ts
{
  userId: { type: Types.ObjectId, ref: "User", index: true },
  kind: { type: String, required: true },               // see NotificationKind enum
  icon: String,
  color: String,
  title: { fr: String, ar: String, en: String },
  body: { fr: String, ar: String, en: String },
  actionUrl: String,
  actionLabel: { fr: String, ar: String, en: String },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}
```

### Association (RSE partner)
```ts
{
  slug: { type: String, unique: true },
  name: { fr: String, ar: String, en: String },
  logoUrl: String,
  description: { fr: String, ar: String, en: String },
  domain: { fr: String, ar: String, en: String },
  active: { type: Boolean, default: true, index: true },
}
```

### Sector (single collection, B2B + B2C)
```ts
{
  slug: { type: String, unique: true },
  kind: { type: String, enum: ["B2B", "B2C"], required: true, index: true },
  name: { fr: String, ar: String, en: String },
  icon: String,
  order: Number,
  active: { type: Boolean, default: true },
}
```

### Gouvernorat
```ts
{
  slug: { type: String, unique: true },
  name: { fr: String, ar: String, en: String },
  order: Number,
}
```

### File (uploaded asset metadata)
```ts
{
  ownerUserId: { type: Types.ObjectId, ref: "User" },
  purpose: { type: String, required: true },            // company_logo, rse_receipt, etc.
  url: String,
  mimeType: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}
```

## 7. Computed-not-stored rules (enforce in services, not in schema)

- `profile.visible` → compute from `(company.status, profile.status, profile.isPublic, profile.pendingData)`.
- `boost.isActive` → compute from `to >= now`. Persist `status` for query efficiency but recompute on read.
- `transaction.priceTTC` → compute from `priceHT * (1 + vatRate)`.
- `company.rseBadgeStatus` → derived: `validated` iff at least one RseReceipt has `status === "validated"`. Persist for fast reads, update via a service when a receipt is approved/rejected.

## 8. Indexing checklist

| Collection | Index | Purpose |
|---|---|---|
| Company | `{ slug: 1 }` unique | public URL lookup |
| Company | `{ accountEmail: 1 }` unique | auth lookup |
| Company | `{ status: 1, registeredAt: 1 }` | admin queue FIFO |
| Company | `{ "liveData.sectorId": 1, status: 1 }` | filtered search |
| Profile | `{ companyId: 1, kind: 1 }` unique | one profile-per-kind per company |
| Profile | `{ kind: 1, status: 1, submittedAt: 1 }` | admin queue per type |
| Profile | LinkUP `{ "data.contactCard.gpsPosition": "2dsphere" }` | geo search (V1.1) |
| Transaction | `{ companyId: 1, paidAt: -1 }` | billing list |
| Transaction | `{ idempotencyKey: 1 }` | dedup checkout |
| RseReceipt | `{ companyId: 1, status: 1 }` | dashboard list |
| RseReceipt | `{ status: 1, submittedAt: 1 }` | admin queue FIFO |
| Notification | `{ userId: 1, read: 1, createdAt: -1 }` | bell dropdown |

## 9. Seeding rules (V1 dev DB)

When porting `reference/marketup_seed_data.js` to a real `npm run db:seed`:

1. **Keep the TechnoFab canon exactly.** BrandUP rejected, TraceUP pending, LinkUP active + boost active + sponsoring active. Owner Ahmed Mrabet, B2B Mécanique Sousse.
2. **Keep all 20 demo companies** (or whatever the current seed provides — check the file).
3. **Boost / sponsoring `to` dates** in the seed are anchored to `_meta.now = 2026-04-22`. For a real dev DB, prefer storing relative offsets at seed-time, computed from `Date.now()`:
   ```ts
   const now = new Date();
   const boostFrom = new Date(now.getTime() - 15 * 24 * 3600 * 1000);   // 15 days ago
   const boostTo   = new Date(now.getTime() + 15 * 24 * 3600 * 1000);   // 15 days from now
   ```
   This keeps the "active boost" state correct regardless of when the seed is run.
4. **Rejection reasons are demo canon** — copy verbatim from the source seed, don't paraphrase.
5. Hash demo passwords with the same bcrypt rounds as production (e.g. 12). Default demo password: `Demo1234!`.
6. Demo admin: **Bassem Admin** (`manager@vivasky.media`, BA avatar, purple `#5C2D91`).

## 10. Migration / breaking-change protocol

When changing a schema in production:
1. Write a Mongo migration script in `migrations/<timestamp>_<name>.ts`.
2. The migration must be **idempotent** (safe to re-run).
3. Run on staging first, then production. Record success in a `Migration` collection.
4. **Never** remove a field directly — first deprecate (write a default), wait one release, then drop.

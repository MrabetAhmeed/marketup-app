import { Schema, model, models, Types } from "mongoose";

// --- Sub-schemas ---

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

const PendingUpdateFieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    // Mixed: pendingUpdates values are polymorphic (string | I18nString | null)
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
    // Mixed: audit details are action-specific metadata
    details: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

// --- Main schema ---

const CompanySchema = new Schema(
  {
    // Locked fields (immutable after creation)
    slug: { type: String, unique: true, index: true, required: true },
    type: { type: String, enum: ["B2B", "B2C"], required: true, immutable: true },
    legalId: { type: String, required: true, immutable: true, index: true },
    vatNumber: { type: String, default: null, immutable: true },
    identityDocumentUrl: { type: String, default: null },
    country: { type: String, default: "TN", immutable: true },
    accountEmail: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      lowercase: true,
      trim: true,
    },

    // Validation-gated data (changes go through pendingUpdates)
    data: {
      displayName: { type: I18nStringSchema, required: true },
      logoUrl: { type: String, default: null },
      bannerUrl: { type: String, default: null },
      color: { type: String, default: "#0078D4" },
    },

    // Pending change requests for validation-gated fields
    pendingUpdates: {
      type: new Schema(
        {
          submittedAt: { type: Date, required: true },
          fields: { type: [PendingUpdateFieldSchema], required: true },
          note: { type: String, default: null },
        },
        { _id: false },
      ),
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
      gpsPosition: {
        type: new Schema(
          {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true },
          },
          { _id: false },
        ),
        default: null,
      },
    },

    // Lifecycle
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended", "deleted"],
      default: "pending",
      index: true,
    },
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

    // Owner (denormalized for fast access)
    ownerUserId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    ownerFullName: { type: String, default: null },

    // Slug history for 301 redirects after displayName change
    slugHistory: { type: [String], default: [] },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },

    // Audit trail
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// Indexes (per skill data-models §8)
CompanySchema.index({ status: 1, registeredAt: 1 });
CompanySchema.index({ "liveData.sectorId": 1, status: 1 });
CompanySchema.index({ "liveData.gouvernorat": 1, status: 1 });
CompanySchema.index({ "liveData.gpsPosition": "2dsphere" });
CompanySchema.index({ slugHistory: 1 });

// Soft-delete filter
CompanySchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Company = models.Company || model("Company", CompanySchema);

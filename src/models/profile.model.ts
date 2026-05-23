import { Schema, model, models, Types } from "mongoose";

// --- Shared sub-schemas ---

const PendingDataFieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    // Mixed: pendingData values are polymorphic (string | I18nString | null)
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

// --- Base Profile schema ---

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

    // Pending modifications (only meaningful when status === "pending")
    pendingData: {
      type: new Schema(
        {
          submittedAt: { type: Date, required: true },
          fields: { type: [PendingDataFieldSchema], required: true },
          note: { type: String, default: null },
          // Status before submit (for cancel restore: "active" | "rejected" | "incomplete")
          previousStatus: { type: String, enum: ["active", "rejected", "incomplete"], default: null },
        },
        { _id: false },
      ),
      default: null,
    },

    // Per-profile stats (snapshot, refreshed by async job)
    stats: {
      viewsTotal: { type: Number, default: 0 },
      views30d: { type: Number, default: 0 },
      clicksTotal: { type: Number, default: 0 },
    },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },

    // Audit trail
    auditTrail: { type: [AuditEntrySchema], default: [] },
  },
  { timestamps: true, versionKey: false, discriminatorKey: "kind" },
);

// Indexes (per skill data-models §8)
ProfileSchema.index({ companyId: 1, kind: 1 }, { unique: true });
ProfileSchema.index({ kind: 1, status: 1, submittedAt: 1 });

// Soft-delete filter
ProfileSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Profile = models.Profile || model("Profile", ProfileSchema);

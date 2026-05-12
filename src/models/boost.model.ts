import { Schema, model, models, Types } from "mongoose";

const BoostSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    profileKind: { type: String, enum: ["brandup", "traceup", "linkup"], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    transactionId: { type: Types.ObjectId, ref: "Transaction", default: null },
    // Status persisted for query efficiency; compute from `to >= now` on read.
    // Cron to flip expired is Phase 9 work.
    status: { type: String, enum: ["active", "expired"], default: "active" },
    viewsAdded: { type: Number, default: 0 },
    clicksAdded: { type: Number, default: 0 },

    // Soft delete (no audit trail — immutable post-creation)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Index for "find active boost for this company+profile"
BoostSchema.index({ companyId: 1, profileKind: 1, to: -1 });

// Soft-delete filter
BoostSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Boost = models.Boost || model("Boost", BoostSchema);

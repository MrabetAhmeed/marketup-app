import { Schema, model, models, Types } from "mongoose";

const DailyBreakdownSchema = new Schema(
  {
    date: { type: Date, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { _id: false },
);

const SponsoringSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    profileKind: {
      type: String,
      enum: ["brandup", "traceup", "linkup"],
      required: true,
    },
    targetCategory: { type: String, default: null },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    transactionId: { type: Types.ObjectId, ref: "Transaction", default: null },
    // Status persisted for query efficiency; compute from `to >= now` on read.
    // Cron to flip completed is Phase 9 work.
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    daily: { type: [DailyBreakdownSchema], default: [] },

    // Soft delete (no audit trail — immutable post-creation)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Index for "find active sponsoring for this company+profile"
SponsoringSchema.index({ companyId: 1, profileKind: 1, to: -1 });

// Soft-delete filter
SponsoringSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Sponsoring = models.Sponsoring || model("Sponsoring", SponsoringSchema);

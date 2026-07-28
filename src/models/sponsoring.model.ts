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

    // Banner & link — provided at request time
    bannerUrl: { type: String, required: true },
    linkUrl: { type: String, required: true },

    // Date range — set at checkout (confirmed → active), null while pending/confirmed
    from: { type: Date, default: null },
    to: { type: Date, default: null },

    // Payment
    transactionId: { type: Types.ObjectId, ref: "Transaction", default: null },
    paidAt: { type: Date, default: null },

    // Workflow: pending → confirmed (admin) → active (paid) → expired (lazy)
    // Terminal: rejected (admin), cancelled (owner from pending/confirmed)
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "expired", "rejected", "cancelled"],
      default: "pending",
    },

    // Admin validation
    confirmedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },

    // Stats
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    daily: { type: [DailyBreakdownSchema], default: [] },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Index for "find active sponsoring for this company+profile"
SponsoringSchema.index({ companyId: 1, profileKind: 1, status: 1 });

// Soft-delete filter
SponsoringSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Sponsoring = models.Sponsoring || model("Sponsoring", SponsoringSchema);

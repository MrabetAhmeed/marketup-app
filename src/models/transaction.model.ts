import { Schema, model, models, Types } from "mongoose";

const TransactionSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    type: { type: String, enum: ["boost", "sponsoring"], required: true },
    refId: { type: Types.ObjectId, default: null },
    profileKind: { type: String, enum: ["brandup", "traceup", "linkup"], default: null },

    // Money: HT in storage, TTC computed at read-time. Currency is DT only.
    priceHT: { type: Number, required: true },
    vatRate: { type: Number, required: true, default: 0.19 },
    currency: { type: String, default: "DT" },

    status: {
      type: String,
      enum: ["pending", "paid", "paid_simulated", "refunded", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "manual", "simulated"],
      default: null,
    },
    paymentReference: { type: String, default: null },
    paidAt: { type: Date, default: null },

    invoiceNumber: { type: String, default: null },
    invoiceUrl: { type: String, default: null },

    idempotencyKey: { type: String, default: null },

    // Soft delete (no audit trail — transactions are immutable post-paid)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Indexes (per skill data-models §8)
TransactionSchema.index({ companyId: 1, paidAt: -1 });
TransactionSchema.index({ idempotencyKey: 1 }, { sparse: true });

// Soft-delete filter
TransactionSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Transaction = models.Transaction || model("Transaction", TransactionSchema);

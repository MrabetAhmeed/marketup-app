import { Schema, model, models, Types } from "mongoose";
import { TRANSACTION_INDEXES } from "./transaction.indexes";

/** Why a paid order is waiting for an admin decision instead of being activated (F3+). */
export const ACTIVATION_PENDING_REASONS = [
  "profile_ineligible",
  "amount_mismatch",
  "service_already_active",
  "company_suspended",
  "account_deleted",
] as const;

const TransactionSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    type: { type: String, enum: ["boost", "sponsoring"], required: true },
    refId: { type: Types.ObjectId, default: null },
    profileKind: { type: String, enum: ["brandup", "traceup", "linkup"], default: null },

    // Money: HT in storage, TTC computed at read-time. Currency is DT only.
    priceHT: { type: Number, required: true },
    vatRate: { type: Number, required: true, default: 0.19 },
    fiscalStampDT: { type: Number, default: 0 },
    currency: { type: String, default: "DT" },

    // `expired` is declared in F2 and produced from F3. `refunded` is never
    // produced by the application (refunds happen outside the platform).
    status: {
      type: String,
      enum: ["pending", "paid", "paid_simulated", "refunded", "failed", "expired"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "manual", "simulated"],
      default: null,
    },
    paymentReference: { type: String, default: null },
    paidAt: { type: Date, default: null },

    // Paid but not activated: an admin decides (declared in F2, produced from F3).
    activationPending: { type: Boolean, default: false },
    activationPendingReason: { type: String, enum: [...ACTIVATION_PENDING_REASONS], default: null },

    // Frozen at purchase. Absent on orders created before F2.
    durationDays: { type: Number },
    adapterEnvironment: { type: String, enum: ["test", "production"] },

    invoiceNumber: { type: String, default: null },
    invoiceUrl: { type: String, default: null },

    idempotencyKey: { type: String, default: null },

    // Soft delete (no audit trail — transactions are immutable post-paid)
    deletedAt: { type: Date, default: null },
  },
  // autoIndex off on this model only: its indexes are built by the migration
  // (npm run db:migrate-payment-indexes), never at application start.
  { timestamps: true, versionKey: false, autoIndex: false },
);

// Indexes — declared in transaction.indexes.ts
for (const { key, ...options } of TRANSACTION_INDEXES) {
  TransactionSchema.index(key, options);
}

// Soft-delete filter
TransactionSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const Transaction = models.Transaction || model("Transaction", TransactionSchema);

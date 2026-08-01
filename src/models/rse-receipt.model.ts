import { Schema, model, models, Types } from "mongoose";

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

const RseReceiptSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true, index: true },
    associationId: { type: Types.ObjectId, ref: "Association", required: true },
    // Amount in DT (donation, no VAT). Currency is DT only.
    amount: { type: Number, required: true },
    currency: { type: String, default: "DT" },
    donationDate: { type: Date, required: true },
    receiptDocumentUrl: { type: String, default: null },
    // Optional receipt number from the paper document (entered by owner)
    receiptNumber: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "validated", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    validatedAt: { type: Date, default: null },
    validatedBy: { type: Types.ObjectId, ref: "AdminUser", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: null },

    // Audit trail (admin-actionable document)
    auditTrail: { type: [AuditEntrySchema], default: [] },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Indexes (per skill data-models §8)
RseReceiptSchema.index({ companyId: 1, status: 1 });
RseReceiptSchema.index({ status: 1, submittedAt: 1 });
// Partial unique: same company cannot have duplicate receiptNumber (when provided)
// Uses $type "string" instead of $ne:null because MongoDB in-memory doesn't support $ne in partialFilterExpression
RseReceiptSchema.index(
  { companyId: 1, receiptNumber: 1 },
  { unique: true, partialFilterExpression: { receiptNumber: { $type: "string" } } },
);

// Soft-delete filter
RseReceiptSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const RseReceipt = models.RseReceipt || model("RseReceipt", RseReceiptSchema);

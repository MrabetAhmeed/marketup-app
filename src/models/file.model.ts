import { Schema, model, models, Types } from "mongoose";

const FileSchema = new Schema(
  {
    ownerUserId: { type: Types.ObjectId, ref: "User", index: true },
    purpose: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null },
    uploadedAt: { type: Date, default: Date.now },

    // Soft delete (uploaded files can be revoked)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Soft-delete filter
FileSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const File = models.File || model("File", FileSchema);

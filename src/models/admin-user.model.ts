import { Schema, model, models } from "mongoose";

const AdminUserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["SUPER_ADMIN"], default: "SUPER_ADMIN" },
    avatar: {
      initials: { type: String, required: true },
      backgroundColor: { type: String, required: true },
    },
    languages: [{ type: String, enum: ["fr", "ar", "en"] }],
    lastLoginAt: { type: Date, default: null },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Soft-delete filter
AdminUserSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

export const AdminUser = models.AdminUser || model("AdminUser", AdminUserSchema);

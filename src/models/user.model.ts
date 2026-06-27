import { Schema, model, models, Types } from "mongoose";

const UserSchema = new Schema(
  {
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    languages: [{ type: String, enum: ["fr", "ar", "en"] }],
    role: { type: String, enum: ["OWNER"], default: "OWNER" },
    companyId: { type: Types.ObjectId, ref: "Company", index: true },

    // CGU acceptance
    acceptedTermsAt: { type: Date, default: null },

    // Email verification
    emailVerifiedAt: { type: Date, default: null },

    // Login tracking
    lastLoginAt: { type: Date, default: null },

    // Password reset
    passwordResetTokenHash: { type: String, default: null },
    passwordResetTokenPrefix: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },

    // OTP for signup / email verification
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpLastSentAt: { type: Date, default: null },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

// Soft-delete filter
UserSchema.pre(/^find/, function (this: { getOptions(): { withDeleted?: boolean }; where(condition: Record<string, unknown>): void }) {
  if (this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
});

// TODO (Phase 10): Daily cron to delete orphan Users where
// emailVerifiedAt=null AND createdAt < now-7d, cascade-delete their Company.

export const User = models.User || model("User", UserSchema);

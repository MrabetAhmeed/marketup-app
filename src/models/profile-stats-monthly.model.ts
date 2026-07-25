import { Schema, model, models, Types } from "mongoose";

const ProfileStatsMonthlySchema = new Schema(
  {
    profileId: { type: Types.ObjectId, required: true, ref: "Profile" },
    month: { type: String, required: true }, // "YYYY-MM"
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: false },
);

// Unique compound index — one doc per profile per month
ProfileStatsMonthlySchema.index({ profileId: 1, month: 1 }, { unique: true });

export const ProfileStatsMonthlyModel =
  models.ProfileStatsMonthly ??
  model("ProfileStatsMonthly", ProfileStatsMonthlySchema);

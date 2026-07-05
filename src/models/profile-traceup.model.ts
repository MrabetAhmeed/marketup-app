import { Schema } from "mongoose";
import { Profile } from "./profile.model";

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

// TraceUP videos: additions are hard change (pendingData), deletions are soft instant.
// See CLAUDE.md §6.10 (updated PP-11, June 30 2026).
const VideoSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, enum: ["youtube", "dailymotion", "vimeo"], required: true },
    videoId: { type: String, required: true },
    videoUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    category: {
      type: String,
      enum: ["actualite", "offres", "astuces", "emplois"],
      required: true,
    },
    title: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    description: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    status: { type: String, enum: ["pending", "active", "rejected"], default: "active" },
    publishedAt: { type: Date, default: null },
  },
  { _id: false },
);

const TraceUpSchema = new Schema(
  {
    data: {
      videos: { type: [VideoSchema], default: [] },
    },
  },
  { _id: false, versionKey: false },
);

export const TraceUp =
  Profile.discriminators?.traceup || Profile.discriminator("traceup", TraceUpSchema);

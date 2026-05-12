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

// TraceUP videos are direct CRUD on the array — NOT subject to pendingData.
// Only channelName and channelDescription flow through the base Profile.pendingData.
// See CLAUDE.md §6.10 and SEED_ARCHITECTURE.md §4.4.1.
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
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const TraceUpSchema = new Schema(
  {
    data: {
      channelName: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
      channelDescription: {
        type: I18nStringSchema,
        default: () => ({ fr: "", ar: "", en: "" }),
      },
      videos: { type: [VideoSchema], default: [] },
    },
  },
  { _id: false, versionKey: false },
);

export const TraceUp =
  Profile.discriminators?.traceup || Profile.discriminator("traceup", TraceUpSchema);

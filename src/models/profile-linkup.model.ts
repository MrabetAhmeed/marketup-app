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

const LinkUpSchema = new Schema(
  {
    data: {
      contactCard: {
        photo: { type: String, default: null },
        fullName: { type: String, default: null },
        title: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
        company: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
        bio: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
        email: { type: String, default: null },
        phone: { type: String, default: null },
        whatsapp: { type: String, default: null },
        website: { type: String, default: null },
        address: { type: String, default: null },
        gpsPosition: {
          type: { type: String, enum: ["Point"], default: "Point" },
          coordinates: { type: [Number], default: [0, 0] },
        },
      },
      qrConfig: {
        style: { type: String, default: "rounded" },
        colorForeground: { type: String, default: "#000000" },
        colorBackground: { type: String, default: "#FFFFFF" },
        logoOverlay: { type: Boolean, default: true },
      },
      socials: [
        new Schema(
          {
            platform: { type: String, required: true },
            url: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
    },
  },
  { _id: false, versionKey: false },
);

// Geo index for LinkUP contact cards (per skill data-models §8)
LinkUpSchema.index({ "data.contactCard.gpsPosition": "2dsphere" });

export const LinkUp =
  Profile.discriminators?.linkup || Profile.discriminator("linkup", LinkUpSchema);

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

const BrandUpSchema = new Schema(
  {
    data: {
      pitch: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
      about: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
      color: { type: String, default: "#0078D4" },
      services: [
        new Schema(
          {
            name: { type: I18nStringSchema, required: true },
          },
          { _id: false },
        ),
      ],
      gallery: [
        new Schema(
          {
            id: { type: String, required: true },
            url: { type: String, required: true },
            caption: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
            order: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      projects: [
        new Schema(
          {
            id: { type: String, required: true },
            name: { type: I18nStringSchema, required: true },
            image: { type: String, default: null },
            description: {
              type: I18nStringSchema,
              default: () => ({ fr: "", ar: "", en: "" }),
            },
            order: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      certifications: [
        new Schema(
          {
            id: { type: String, required: true },
            name: { type: String, required: true },
            label: { type: I18nStringSchema, required: true },
            icon: { type: String, default: null },
            image: { type: String, default: null },
            issuedAt: { type: Date, default: null },
            expiresAt: { type: Date, default: null },
          },
          { _id: false },
        ),
      ],
      links: [
        new Schema(
          {
            label: { type: I18nStringSchema, required: true },
            url: { type: String, required: true },
            icon: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
    },
  },
  { _id: false, versionKey: false },
);

export const BrandUp =
  Profile.discriminators?.brandup || Profile.discriminator("brandup", BrandUpSchema);

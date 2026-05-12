import { Schema, model, models } from "mongoose";

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

const GouvernoratSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: I18nStringSchema, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export const Gouvernorat = models.Gouvernorat || model("Gouvernorat", GouvernoratSchema);

import { Schema, model, models } from "mongoose";

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

const SectorSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["B2B", "B2C"], required: true, index: true },
    name: { type: I18nStringSchema, required: true },
    description: { type: String, default: "" },
    group: { type: String, default: "" },
    groupOrder: { type: Number, default: 0 },
    icon: { type: String, default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const Sector = models.Sector || model("Sector", SectorSchema);

import { Schema, model, models } from "mongoose";

const I18nStringSchema = new Schema(
  {
    fr: { type: String, default: "" },
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false },
);

const AssociationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: I18nStringSchema, required: true },
    logoUrl: { type: String, default: null },
    description: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    domain: { type: I18nStringSchema, default: () => ({ fr: "", ar: "", en: "" }) },
    website: { type: String, default: null },
    causes: [{ type: String }],
    accreditationDocumentUrl: { type: String, default: null },
    accreditedSince: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const Association = models.Association || model("Association", AssociationSchema);

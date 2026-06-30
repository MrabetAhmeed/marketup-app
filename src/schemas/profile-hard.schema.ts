import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile HARD submit — fields that require admin revalidation.
// One schema per kind. All fields required (full submission).
// ---------------------------------------------------------------------------

const GalleryItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  caption: z.string().max(80).default(""),
  order: z.number().int().min(0),
});

export const BrandupHardSubmitSchema = z.object({
  pitch: z
    .string()
    .trim()
    .min(1, "La description courte est obligatoire.")
    .max(280, "280 caractères maximum."),
  about: z
    .string()
    .trim()
    .min(1, "Le texte « À propos » est obligatoire.")
    .max(1000, "1000 caractères maximum."),
  gallery: z
    .array(GalleryItemSchema)
    .max(9, "9 images maximum.")
    .optional(),
  // Original gallery snapshot (before edits) — used to compute diff for pendingData.currentValue
  currentGallery: z
    .array(GalleryItemSchema)
    .optional(),
}).strict();

export const TraceupHardSubmitSchema = z.object({}).strict();

import { SocialEntrySchema } from "@/schemas/profile-soft.schema";

export const LinkupHardSubmitSchema = z.object({
  socials: z
    .array(SocialEntrySchema)
    .refine(
      (arr) => {
        const platforms = arr.map((s) => s.platform);
        return new Set(platforms).size === platforms.length;
      },
      { message: "Chaque plateforme ne peut apparaître qu'une seule fois." },
    ),
}).strict();

export type BrandupHardSubmitInput = z.infer<typeof BrandupHardSubmitSchema>;
export type TraceupHardSubmitInput = z.infer<typeof TraceupHardSubmitSchema>;
export type LinkupHardSubmitInput = z.infer<typeof LinkupHardSubmitSchema>;

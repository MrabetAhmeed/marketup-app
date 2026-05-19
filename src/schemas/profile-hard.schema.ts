import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile HARD submit — fields that require admin revalidation.
// One schema per kind. All fields required (full submission).
// ---------------------------------------------------------------------------

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
}).strict();

export const TraceupHardSubmitSchema = z.object({
  channelName: z
    .string()
    .trim()
    .min(1, "Le nom de la chaîne est obligatoire.")
    .max(60, "60 caractères maximum."),
  channelDescription: z
    .string()
    .trim()
    .min(1, "La description de la chaîne est obligatoire.")
    .max(500, "500 caractères maximum."),
}).strict();

export const LinkupHardSubmitSchema = z.object({}).strict();

export type BrandupHardSubmitInput = z.infer<typeof BrandupHardSubmitSchema>;
export type TraceupHardSubmitInput = z.infer<typeof TraceupHardSubmitSchema>;
export type LinkupHardSubmitInput = z.infer<typeof LinkupHardSubmitSchema>;

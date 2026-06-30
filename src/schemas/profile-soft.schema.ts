import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile SOFT mutations — fields that don't require admin revalidation.
// One schema per kind. All fields optional (PATCH partial).
// ---------------------------------------------------------------------------

export const SOCIAL_PLATFORMS = ["website", "linkedin", "facebook", "instagram", "youtube"] as const;

export const SocialEntrySchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS, { errorMap: () => ({ message: "Plateforme non reconnue." }) }),
  url: z.union([
    z.string().url("URL invalide."),
    z.literal(""),
  ]),
});

export const BrandupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

export const TraceupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

// LinkUP soft: isPublic only (socials moved to hard submit in PP-9)
export const LinkupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

export type BrandupSoftInput = z.infer<typeof BrandupSoftSchema>;
export type TraceupSoftInput = z.infer<typeof TraceupSoftSchema>;
export type LinkupSoftInput = z.infer<typeof LinkupSoftSchema>;

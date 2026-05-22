import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile SOFT mutations — fields that don't require admin revalidation.
// One schema per kind. All fields optional (PATCH partial).
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = ["website", "linkedin", "facebook", "instagram", "youtube"] as const;

export const BrandupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

export const TraceupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
}).strict();

const SocialEntrySchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS, { errorMap: () => ({ message: "Plateforme non reconnue." }) }),
  url: z.union([
    z.string().url("URL invalide."),
    z.literal(""),
  ]),
});

export const LinkupSoftSchema = z.object({
  isPublic: z.boolean().optional(),
  socials: z
    .array(SocialEntrySchema)
    .refine(
      (arr) => {
        const platforms = arr.map((s) => s.platform);
        return new Set(platforms).size === platforms.length;
      },
      { message: "Chaque plateforme ne peut apparaître qu'une seule fois." },
    )
    .optional(),
}).strict();

export type BrandupSoftInput = z.infer<typeof BrandupSoftSchema>;
export type TraceupSoftInput = z.infer<typeof TraceupSoftSchema>;
export type LinkupSoftInput = z.infer<typeof LinkupSoftSchema>;

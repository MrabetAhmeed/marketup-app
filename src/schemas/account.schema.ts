import { z } from "zod";

// ---------------------------------------------------------------------------
// Account LIVE update — only the 5 instantly-editable fields
// Uses .strip() (Zod default) so extra keys like displayName are silently dropped.
// ---------------------------------------------------------------------------

export const AccountLiveUpdateSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .email("Email de contact invalide.")
    .max(255, "255 caractères maximum.")
    .optional(),

  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .pipe(
      z
        .string()
        .min(8, "Numéro de téléphone trop court (8 chiffres min).")
        .max(20, "Numéro de téléphone trop long."),
    )
    .optional(),

  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .pipe(
      z
        .string()
        .min(8, "Numéro WhatsApp trop court (8 chiffres min).")
        .max(20, "Numéro WhatsApp trop long."),
    )
    .optional(),

  ville: z
    .string()
    .trim()
    .min(1, "La ville est obligatoire.")
    .max(100, "100 caractères maximum.")
    .optional(),

  address: z
    .string()
    .trim()
    .max(300, "300 caractères maximum.")
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

export type AccountLiveUpdateInput = z.infer<typeof AccountLiveUpdateSchema>;

import { z } from "zod";

// ---------------------------------------------------------------------------
// Account update — live fields + hard fields (displayName → pendingUpdates)
// ---------------------------------------------------------------------------

export const AccountLiveUpdateSchema = z.object({
  // --- Hard field (validation-gated → pendingUpdates) ---
  displayName: z
    .string()
    .trim()
    .min(1, "Le nom de l'entreprise est obligatoire.")
    .max(100, "100 caractères maximum.")
    .optional(),

  // --- Identity fields (User table) ---
  firstName: z
    .string()
    .trim()
    .min(1, "Le prénom est obligatoire.")
    .max(60, "60 caractères maximum.")
    .optional(),

  lastName: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(60, "60 caractères maximum.")
    .optional(),

  // --- Company.liveData fields ---
  contactEmail: z
    .string()
    .trim()
    .email("Email de contact invalide.")
    .max(255, "255 caractères maximum.")
    .optional(),

  phone: z
    .string()
    .trim()
    .refine((v) => /^[+\s\-()0-9]*$/.test(v), "Numéro de téléphone invalide (format attendu : +216XXXXXXXX).")
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .pipe(
      z.string().regex(/^\+[0-9]{8,15}$/, "Numéro de téléphone invalide (format attendu : +216XXXXXXXX)."),
    )
    .optional(),

  whatsapp: z
    .string()
    .trim()
    .refine((v) => /^[+\s\-()0-9]*$/.test(v), "Numéro WhatsApp invalide (format attendu : +216XXXXXXXX).")
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .pipe(
      z.string().regex(/^\+[0-9]{8,15}$/, "Numéro WhatsApp invalide (format attendu : +216XXXXXXXX)."),
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

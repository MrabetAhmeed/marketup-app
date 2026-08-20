import { z } from "zod";
import { tunisianPhoneSchema } from "@/lib/phone";

// ---------------------------------------------------------------------------
// Account update — all editable fields go through pendingUpdates (validation
// admin) except gpsPosition which stays live. .strict() rejects unknown keys
// at the API boundary (C3 lockdown).
// ---------------------------------------------------------------------------

export const AccountLiveUpdateSchema = z.object({
  // --- Hard fields (validation-gated → pendingUpdates) ---
  displayName: z
    .string()
    .trim()
    .min(1, "Le nom de l'entreprise est obligatoire.")
    .max(100, "100 caractères maximum.")
    .optional(),

  gouvernorat: z
    .string()
    .trim()
    .min(1, "Le gouvernorat est obligatoire.")
    .max(50, "50 caractères maximum.")
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

  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Code postal invalide (4 chiffres).")
    .optional(),

  // --- Gerant identity (validation-gated → pendingUpdates) ---
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

  // --- Contact fields (validation-gated → pendingUpdates) ---
  contactEmail: z
    .string()
    .trim()
    .email("Email de contact invalide.")
    .max(255, "255 caractères maximum.")
    .optional(),

  phone: tunisianPhoneSchema.optional(),

  whatsapp: tunisianPhoneSchema.optional(),

  // --- Legal document (validation-gated → pendingUpdates) ---
  identityDocumentUrl: z
    .string()
    .trim()
    .url("URL du document invalide.")
    .optional(),

  // --- GPS position (live — instant, no admin review) ---
  gpsPosition: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
    })
    .optional(),

}).strict();

export type AccountLiveUpdateInput = z.infer<typeof AccountLiveUpdateSchema>;

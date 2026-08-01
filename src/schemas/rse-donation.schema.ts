import { z } from "zod";

// ---------------------------------------------------------------------------
// RSE donation receipt submission
// ---------------------------------------------------------------------------

// ObjectId-like regex (24 hex chars)
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const CreateRseDonationSchema = z.object({
  associationId: z
    .string()
    .regex(OBJECT_ID_REGEX, "Identifiant d'association invalide."),
  amount: z
    .number({ coerce: true })
    .int("Le montant doit être un nombre entier.")
    .min(50, "Le montant minimum est de 50 DT.")
    .max(1_000_000, "Le montant maximum est de 1 000 000 DT."),
  donationDate: z
    .string()
    .min(1, "La date du don est obligatoire.")
    .refine(
      (d) => {
        const date = new Date(d);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: "La date ne peut pas être dans le futur." },
    ),
  receiptNumber: z
    .string()
    .max(50, "50 caractères maximum.")
    .optional()
    .default(""),
  notes: z
    .string()
    .max(280, "280 caractères maximum.")
    .optional()
    .default(""),
});

export type CreateRseDonationInput = z.infer<typeof CreateRseDonationSchema>;

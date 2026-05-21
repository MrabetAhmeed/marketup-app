import { z } from "zod";

export const CompanyResubmitSchema = z.object({
  displayName: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "120 caractères maximum."),
  contactEmail: z.string().trim().email("Email de contact invalide.").max(255).optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  sectorId: z.string().min(1, "Le secteur est obligatoire."),
  gouvernorat: z.string().min(1, "Le gouvernorat est obligatoire."),
  ville: z.string().trim().min(1, "La ville est obligatoire.").max(100),
  address: z.string().trim().max(300).optional().nullable(),
  identityDocumentUrl: z.string().min(1).optional().nullable(),
});

export type CompanyResubmitInput = z.infer<typeof CompanyResubmitSchema>;

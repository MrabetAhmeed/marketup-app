import { z } from "zod";

export const RejectCompanySchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Le motif de refus est obligatoire.")
    .max(500, "500 caractères maximum."),
}).strict();

export type RejectCompanyInput = z.infer<typeof RejectCompanySchema>;

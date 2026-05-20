import { z } from "zod";

export const RejectProfileSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Le motif de refus est obligatoire.")
    .max(500, "500 caractères maximum."),
}).strict();

export type RejectProfileInput = z.infer<typeof RejectProfileSchema>;

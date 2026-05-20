import { z } from "zod";

export const RejectRseReceiptSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Le motif de refus est obligatoire.")
    .max(500, "500 caractères maximum."),
}).strict();

export type RejectRseReceiptInput = z.infer<typeof RejectRseReceiptSchema>;

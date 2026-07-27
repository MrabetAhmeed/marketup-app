import { z } from "zod";

export const BoostCheckoutSchema = z.object({
  profileKind: z.enum(["brandup", "traceup", "linkup"]),
  idempotencyKey: z.string().min(1).max(128),
});

export type BoostCheckoutInput = z.infer<typeof BoostCheckoutSchema>;

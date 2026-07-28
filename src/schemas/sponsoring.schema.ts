import { z } from "zod";

const OBJECTID_RE = /^[a-f\d]{24}$/i;

export const SponsoringRequestSchema = z.object({
  profileKind: z.enum(["brandup", "traceup", "linkup"]),
  bannerUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://"), { message: "L'URL de la bannière doit commencer par https://" }),
  linkUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://"), { message: "Le lien doit commencer par https://" }),
});

export type SponsoringRequestInput = z.infer<typeof SponsoringRequestSchema>;

export const SponsoringCheckoutSchema = z.object({
  sponsoringId: z.string().regex(OBJECTID_RE, "Invalid ObjectId"),
  idempotencyKey: z.string().min(1).max(128),
});

export type SponsoringCheckoutInput = z.infer<typeof SponsoringCheckoutSchema>;

export const SponsoringCancelSchema = z.object({
  sponsoringId: z.string().regex(OBJECTID_RE, "Invalid ObjectId"),
});

export type SponsoringCancelInput = z.infer<typeof SponsoringCancelSchema>;

export const SponsoringRejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export type SponsoringRejectInput = z.infer<typeof SponsoringRejectSchema>;

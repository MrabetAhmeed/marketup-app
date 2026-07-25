import { z } from "zod";

export const TrackEventSchema = z
  .object({
    profileId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
    event: z.enum(["view", "click"]),
  })
  .strict();

export type TrackEventInput = z.infer<typeof TrackEventSchema>;

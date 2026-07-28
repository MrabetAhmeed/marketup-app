import { z } from "zod";

const OBJECTID_RE = /^[a-f\d]{24}$/i;

const ProfileEventSchema = z.object({
  profileId: z.string().regex(OBJECTID_RE, "Invalid ObjectId"),
  event: z.enum(["view", "click"]),
});

const SponsorClickSchema = z.object({
  sponsoringId: z.string().regex(OBJECTID_RE, "Invalid ObjectId"),
  event: z.literal("sponsor_click"),
});

const SponsorImpressionSchema = z.object({
  sponsoringId: z.string().regex(OBJECTID_RE, "Invalid ObjectId"),
  event: z.literal("sponsor_impression"),
});

export const TrackEventSchema = z.union([ProfileEventSchema, SponsorClickSchema, SponsorImpressionSchema]);

export type TrackEventInput = z.infer<typeof TrackEventSchema>;

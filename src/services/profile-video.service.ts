/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { connectDb } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/api-error";
import { Profile } from "@/models/profile.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { User } from "@/models/user.model";
import { getProfileForEditor } from "@/services/profile-editor.service";
import { CreateVideoSchema } from "@/schemas/profile-video.schema";
import { extractVideoId, buildVideoUrl } from "@/lib/video/parsers";
import { fetchVideoMetadata } from "@/lib/video/oembed";
import type { VideoPlatform } from "@/lib/video/parsers";
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileEditorData } from "@/types/profile-editor";

const ProfileModel = Profile as any;
const TraceUpModel = TraceUp as any;
const UserModel = User as any;

// ---------------------------------------------------------------------------
// createVideo — direct CRUD (no admin review, per CLAUDE.md §6.10)
// ---------------------------------------------------------------------------

export async function createVideo(
  profileId: string,
  userId: string,
  rawPayload: unknown,
  lang: SupportedLang = "fr",
): Promise<ProfileEditorData> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  if (profile.companyId.toString() !== user.companyId?.toString()) {
    throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
  }

  if (profile.kind !== "traceup") {
    throw new AppError("VALIDATION_FAILED", "Les vidéos ne sont disponibles que pour les profils TraceUP.", 400);
  }

  const parsed = CreateVideoSchema.parse(rawPayload);
  const platform = parsed.platform as VideoPlatform;
  const videoId = extractVideoId(platform, parsed.url);
  if (!videoId) {
    throw new AppError("VALIDATION_FAILED", "Impossible d'extraire l'identifiant vidéo.", 400);
  }

  // Fetch thumbnail via oEmbed (non-blocking)
  const canonicalUrl = buildVideoUrl(platform, videoId);
  const metadata = await fetchVideoMetadata(platform, canonicalUrl, videoId);

  const video = {
    id: crypto.randomUUID(),
    source: platform,
    videoId,
    videoUrl: canonicalUrl,
    thumbnailUrl: metadata.thumbnailUrl,
    category: parsed.category,
    title: { fr: parsed.title, ar: "", en: "" },
    description: { fr: parsed.description, ar: "", en: "" },
    status: "active",
    publishedAt: new Date(),
  };

  await TraceUpModel.findByIdAndUpdate(profileId, {
    $push: { "data.videos": video },
  });

  const updated = await getProfileForEditor(profile.companyId.toString(), "traceup", lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// deleteVideo — direct CRUD
// ---------------------------------------------------------------------------

export async function deleteVideo(
  profileId: string,
  userId: string,
  videoId: string,
  lang: SupportedLang = "fr",
): Promise<ProfileEditorData> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  if (profile.companyId.toString() !== user.companyId?.toString()) {
    throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
  }

  if (profile.kind !== "traceup") {
    throw new AppError("VALIDATION_FAILED", "Les vidéos ne sont disponibles que pour les profils TraceUP.", 400);
  }

  const videos: any[] = profile.data?.videos ?? [];
  const video = videos.find((v: any) => v.id === videoId);
  if (!video) throw new NotFoundError("Video");

  await TraceUpModel.findByIdAndUpdate(profileId, {
    $pull: { "data.videos": { id: videoId } },
  });

  const updated = await getProfileForEditor(profile.companyId.toString(), "traceup", lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

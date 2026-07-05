/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { connectDb } from "@/lib/db";
import { AppError, NotFoundError, BusinessRuleError } from "@/lib/api-error";
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
// Helpers
// ---------------------------------------------------------------------------

function guardTraceup(profile: any, user: any): void {
  if (profile.companyId.toString() !== user.companyId?.toString()) {
    throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
  }
  if (profile.kind !== "traceup") {
    throw new AppError("VALIDATION_FAILED", "Les vidéos ne sont disponibles que pour les profils TraceUP.", 400);
  }
}

/** Get the current pending videos snapshot, or null if none */
function getPendingVideosSnapshot(profile: any): any[] | null {
  const field = (profile.pendingData?.fields ?? []).find((f: any) => f.key === "videos");
  return field ? (field.newValue as any[]) : null;
}

/** Check if pending snapshot matches data.videos by ID set */
function isSnapshotSameAsData(snapshot: any[], dataVideos: any[]): boolean {
  const pendingIds = new Set(snapshot.map((v: any) => v.id));
  const dataIds = new Set(dataVideos.map((v: any) => v.id));
  return pendingIds.size === dataIds.size && Array.from(pendingIds).every((id) => dataIds.has(id));
}

/** Write pending videos snapshot to profile, handling status transitions */
async function writePendingSnapshot(
  profileId: string,
  profile: any,
  snapshot: any[],
  dataVideos: any[],
): Promise<void> {
  // Auto-recovery: if snapshot == data → clear pending, restore status
  if (isSnapshotSameAsData(snapshot, dataVideos)) {
    const previousStatus = profile.pendingData?.previousStatus ?? "active";
    await TraceUpModel.findByIdAndUpdate(profileId, {
      $set: {
        pendingData: null,
        status: previousStatus,
        submittedAt: null,
      },
    });
    return;
  }

  const previousStatus = profile.pendingData?.previousStatus ?? profile.status;
  const newStatus = profile.status === "rejected" ? "rejected" : "pending";

  const pendingField = {
    key: "videos",
    label: "Vidéos",
    currentValue: dataVideos.map((v: any) => ({
      id: v.id, source: v.source, videoId: v.videoId, videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl, category: v.category,
      title: v.title, description: v.description, status: v.status,
      publishedAt: v.publishedAt,
    })),
    newValue: snapshot,
  };

  await TraceUpModel.findByIdAndUpdate(profileId, {
    $set: {
      status: newStatus,
      submittedAt: profile.submittedAt ?? new Date(),
      pendingData: {
        submittedAt: new Date(),
        fields: [pendingField],
        note: profile.pendingData?.note ?? null,
        previousStatus,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// createVideo — writes to pendingData (hard change PP-11)
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
  guardTraceup(profile, user);

  if (profile.status === "disabled") {
    throw new BusinessRuleError("PROFILE_DISABLED", "Un profil désactivé ne peut pas être modifié.");
  }

  const parsed = CreateVideoSchema.parse(rawPayload);
  const platform = parsed.platform as VideoPlatform;
  const videoId = extractVideoId(platform, parsed.url);
  if (!videoId) {
    throw new AppError("VALIDATION_FAILED", "Impossible d'extraire l'identifiant vidéo.", 400);
  }

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

  const dataVideos: any[] = profile.data?.videos ?? [];
  const existingSnapshot = getPendingVideosSnapshot(profile);
  const baseSnapshot = existingSnapshot ?? dataVideos.map((v: any) => ({
    id: v.id, source: v.source, videoId: v.videoId, videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl, category: v.category,
    title: v.title, description: v.description, status: v.status,
    publishedAt: v.publishedAt,
  }));

  const newSnapshot = [...baseSnapshot, video];
  await writePendingSnapshot(profileId, profile, newSnapshot, dataVideos);

  const updated = await getProfileForEditor(profile.companyId.toString(), "traceup", lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// deleteVideo — soft delete from data.videos (blocked during pending)
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
  guardTraceup(profile, user);

  if (profile.status === "pending") {
    throw new BusinessRuleError(
      "BLOCKED_PENDING",
      "Impossible de supprimer une vidéo publiée pendant une validation en cours. Annulez la soumission d'abord.",
    );
  }

  const videos: any[] = profile.data?.videos ?? [];
  const video = videos.find((v: any) => v.id === videoId);
  if (!video) throw new NotFoundError("Video");

  await TraceUpModel.findByIdAndUpdate(profileId, {
    $pull: { "data.videos": { id: videoId } },
  });

  // Cascade into pendingData snapshot if rejected (avoid resurrecting deleted video on approve)
  if (profile.status === "rejected" && profile.pendingData) {
    const snapshot = getPendingVideosSnapshot(profile);
    if (snapshot) {
      const filteredSnapshot = snapshot.filter((v: any) => v.id !== videoId);
      const remainingData = videos.filter((v: any) => v.id !== videoId);
      await writePendingSnapshot(profileId, { ...profile, status: "rejected" }, filteredSnapshot, remainingData);
    }
  }

  const updated = await getProfileForEditor(profile.companyId.toString(), "traceup", lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// removeVideoFromPending — remove a video from pending snapshot only
// ---------------------------------------------------------------------------

export async function removeVideoFromPending(
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
  guardTraceup(profile, user);

  const snapshot = getPendingVideosSnapshot(profile);
  if (!snapshot) throw new NotFoundError("PendingVideo");

  const video = snapshot.find((v: any) => v.id === videoId);
  if (!video) throw new NotFoundError("PendingVideo");

  const filteredSnapshot = snapshot.filter((v: any) => v.id !== videoId);
  const dataVideos: any[] = profile.data?.videos ?? [];

  await writePendingSnapshot(profileId, profile, filteredSnapshot, dataVideos);

  const updated = await getProfileForEditor(profile.companyId.toString(), "traceup", lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

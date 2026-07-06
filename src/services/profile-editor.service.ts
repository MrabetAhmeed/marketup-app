/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";

const CompanyModel = Company as any;
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileKind } from "@/types";
import type {
  BrandUpEditorData,
  TraceUpEditorData,
  LinkUpEditorData,
  ProfileEditorData,
  GalleryItem,
  VideoItem,
  SocialLink,
} from "@/types/profile-editor";

// Mongoose 9 strict types
const ProfileModel = Profile as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;

/**
 * Get full profile data for the editor page.
 * Returns null if no profile document exists for this company+kind.
 */
export async function getProfileForEditor(
  companyId: string,
  kind: ProfileKind,
  lang: SupportedLang = "fr",
): Promise<ProfileEditorData | null> {
  await connectDb();

  const now = new Date();
  const profile = await ProfileModel.findOne({ companyId, kind }).lean();

  if (!profile) return null;

  // Check boost/sponsoring status
  const [activeBoost, activeSponsoring] = await Promise.all([
    BoostModel.findOne({ companyId, profileKind: kind, status: "active", to: { $gte: now } }).lean(),
    SponsoringModel.findOne({ companyId, profileKind: kind, status: "active", to: { $gte: now } }).lean(),
  ]);

  const base = {
    id: profile._id.toString(),
    status: profile.status,
    isPublic: profile.isPublic ?? true,
    rejectionReason: profile.rejectionReason ?? null,
    submittedAt: profile.submittedAt ? new Date(profile.submittedAt).toISOString() : null,
    rejectedAt: profile.rejectedAt ? new Date(profile.rejectedAt).toISOString() : null,
    publishedAt: profile.publishedAt ? new Date(profile.publishedAt).toISOString() : null,
    hasPendingData: profile.pendingData != null,
    boosted: !!activeBoost,
    sponsoring: !!activeSponsoring,
  };

  switch (kind) {
    case "brandup":
      return buildBrandUp(profile, base, lang);
    case "traceup":
      return buildTraceUp(profile, base, lang);
    case "linkup": {
      const company = await CompanyModel.findById(companyId).lean();
      return buildLinkUp(profile, base, lang, company);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * When profile is pending, extract pendingData.fields into a key→newValue map.
 * Returns empty map if no pendingData.
 */
function getPendingFieldMap(profile: any): Record<string, unknown> {
  if (profile.status !== "pending" || !profile.pendingData?.fields) return {};
  const map: Record<string, unknown> = {};
  for (const field of profile.pendingData.fields as any[]) {
    map[field.key] = field.newValue;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Builders per kind
// ---------------------------------------------------------------------------

function buildBrandUp(
  profile: any,
  base: Omit<BrandUpEditorData, "kind" | "data" | "pendingGallery" | "currentGallery">,
  lang: SupportedLang,
): BrandUpEditorData {
  const data = profile.data ?? {};
  const gallery: GalleryItem[] = (data.gallery ?? []).map((item: any) => ({
    id: item.id,
    url: item.url,
    caption: pickLocale(item.caption, lang),
    order: item.order ?? 0,
  }));

  // Sort gallery by order
  gallery.sort((a, b) => a.order - b.order);

  // When pending, overlay HARD fields with pendingData values
  const pending = getPendingFieldMap(profile);
  const pitch = pending.pitch ? pickLocale(pending.pitch as any, lang) : pickLocale(data.pitch, lang);
  const about = pending.about ? pickLocale(pending.about as any, lang) : pickLocale(data.about, lang);

  // Gallery diff: expose both current (pre-edit snapshot) and pending gallery
  let pendingGallery: GalleryItem[] | null = null;
  let currentGallery: GalleryItem[] | null = null;
  // Read directly from pendingData.fields to get BOTH currentValue and newValue
  const galleryPendingField = (profile.pendingData?.fields ?? [])
    .find((f: any) => f.key === "gallery");
  if (galleryPendingField) {
    // currentValue = pre-edit snapshot (stored at submit time from client-sent originalGallery)
    currentGallery = ((galleryPendingField.currentValue ?? []) as any[]).map((item: any) => ({
      id: item.id,
      url: item.url,
      caption: pickLocale(item.caption, lang),
      order: item.order ?? 0,
    }));
    currentGallery.sort((a, b) => a.order - b.order);
    // newValue = proposed gallery state
    pendingGallery = ((galleryPendingField.newValue ?? []) as any[]).map((item: any) => ({
      id: item.id,
      url: item.url,
      caption: pickLocale(item.caption, lang),
      order: item.order ?? 0,
    }));
    pendingGallery.sort((a, b) => a.order - b.order);
  }

  return {
    kind: "brandup",
    ...base,
    data: {
      pitch,
      about,
      color: data.color ?? "#0078D4",
      gallery,
    },
    pendingGallery,
    currentGallery,
  };
}

function buildTraceUp(
  profile: any,
  base: Omit<TraceUpEditorData, "kind" | "data" | "pendingVideos">,
  lang: SupportedLang,
): TraceUpEditorData {
  const data = profile.data ?? {};
  const videos: VideoItem[] = (data.videos ?? []).map((v: any) => ({
    id: v.id,
    source: v.source,
    videoId: v.videoId,
    videoUrl: v.videoUrl ?? null,
    thumbnailUrl: v.thumbnailUrl ?? null,
    category: v.category,
    title: pickLocale(v.title, lang),
    description: pickLocale(v.description, lang),
    status: v.status ?? "active",
    publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
  }));

  // Sort videos by publishedAt DESC (most recent first)
  videos.sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  // Extract pending videos snapshot
  const videoField = (profile.pendingData?.fields ?? []).find((f: any) => f.key === "videos");
  const pendingVideos: VideoItem[] | null = videoField
    ? ((videoField.newValue ?? []) as any[]).map((v: any) => ({
        id: v.id,
        source: v.source,
        videoId: v.videoId,
        videoUrl: v.videoUrl ?? null,
        thumbnailUrl: v.thumbnailUrl ?? null,
        category: v.category,
        title: pickLocale(v.title, lang),
        description: pickLocale(v.description, lang),
        status: v.status ?? "active",
        publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
      }))
    : null;

  return {
    kind: "traceup",
    ...base,
    data: {
      videos,
    },
    pendingVideos,
  };
}

function buildLinkUp(
  profile: any,
  base: Omit<LinkUpEditorData, "kind" | "data">,
  _lang: SupportedLang,
  _company?: any,
): LinkUpEditorData {
  const data = profile.data ?? {};
  const socials: SocialLink[] = (data.socials ?? []).map((s: any) => ({
    platform: s.platform,
    url: s.url ?? null,
  }));

  return {
    kind: "linkup",
    ...base,
    data: {
      socials,
      qrConfig: {
        style: data.qrConfig?.style ?? "rounded",
        colorForeground: data.qrConfig?.colorForeground ?? "#000000",
        colorBackground: data.qrConfig?.colorBackground ?? "#FFFFFF",
        logoOverlay: data.qrConfig?.logoOverlay ?? true,
      },
    },
  };
}

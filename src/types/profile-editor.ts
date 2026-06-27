import type { ProfileStatus } from "@/types";

// ---------------------------------------------------------------------------
// Profile editor data — returned by getProfileForEditor()
// Contains full profile content for editing, not just the summary.
// ---------------------------------------------------------------------------

export interface GalleryItem {
  id: string;
  url: string;
  caption: string;  // resolved via pickLocale (fr only in V1)
  order: number;
}

export interface BrandUpEditorData {
  id: string;
  kind: "brandup";
  status: ProfileStatus;
  isPublic: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  publishedAt: string | null;
  hasPendingData: boolean;
  boosted: boolean;
  sponsoring: boolean;
  data: {
    pitch: string;
    about: string;
    color: string;
    gallery: GalleryItem[];
  };
  /** Gallery from pendingData (non-null only when status=pending and gallery was modified) */
  pendingGallery: GalleryItem[] | null;
  /** Original gallery before pending submission (non-null only when pendingGallery is set) */
  currentGallery: GalleryItem[] | null;
}

export interface VideoItem {
  id: string;
  source: "youtube" | "dailymotion" | "vimeo";
  videoId: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  category: "actualite" | "offres" | "astuces" | "emplois";
  title: string;
  description: string;
  status: "pending" | "active" | "rejected";
  publishedAt: string | null;
}

export interface TraceUpEditorData {
  id: string;
  kind: "traceup";
  status: ProfileStatus;
  isPublic: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  publishedAt: string | null;
  hasPendingData: boolean;
  boosted: boolean;
  sponsoring: boolean;
  data: {
    videos: VideoItem[];
  };
}

export interface SocialLink {
  platform: string;
  url: string | null;
}

export interface LinkUpEditorData {
  id: string;
  kind: "linkup";
  status: ProfileStatus;
  isPublic: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  publishedAt: string | null;
  hasPendingData: boolean;
  boosted: boolean;
  sponsoring: boolean;
  data: {
    contactCard: {
      whatsapp: string | null;
      gpsUrl: string | null;
      website: string | null;
    };
    socials: SocialLink[];
    qrConfig: {
      style: string;
      colorForeground: string;
      colorBackground: string;
      logoOverlay: boolean;
    };
  };
}

export type ProfileEditorData = BrandUpEditorData | TraceUpEditorData | LinkUpEditorData;

// Helper type guard
export function isBrandUp(data: ProfileEditorData): data is BrandUpEditorData {
  return data.kind === "brandup";
}
export function isTraceUp(data: ProfileEditorData): data is TraceUpEditorData {
  return data.kind === "traceup";
}
export function isLinkUp(data: ProfileEditorData): data is LinkUpEditorData {
  return data.kind === "linkup";
}

import type { CompanyStatus, ProfileStatus, ProfileKind, CompanyType } from "@/types";

// ---------------------------------------------------------------------------
// /api/v1/me response shape
// ---------------------------------------------------------------------------

export interface RseSummary {
  badgeStatus: "none" | "validated";
  badgeValidatedAt: string | null;
  lastDonation: {
    associationName: string;
    date: string;
    amount: number;
  } | null;
  totalDonationsYear: number;
}

export interface ProfileSummary {
  id: string;
  kind: ProfileKind;
  status: ProfileStatus;
  visible: boolean;
  isPublic: boolean;
  placeholderMode: "hidden" | "coming_soon";
  rejectionReason: string | null;
  rejectedAt: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  lastValidatedAt: string | null;
  disabledAt: string | null;
  hasPendingData: boolean;
  stats: { viewsTotal: number; clicksTotal: number; viewsThisMonth: number; trend: { value: number; label: string } | null };
  boosted: boolean;
  sponsoring: boolean;
}

export interface MeResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    languages: string[];
    avatarInitials: string;
    lastLoginAt: string | null;
  };
  company: {
    id: string;
    slug: string;
    type: CompanyType;
    status: CompanyStatus;
    displayName: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    color: string;
    legalId: string;
    vatNumber: string | null;
    identityDocumentUrl: string | null;
    accountEmail: string;
    country: string;
    sector: { slug: string; name: string };
    gouvernorat: { slug: string; name: string };
    ville: string;
    address: string | null;
    contactEmail: string;
    phone: string | null;
    whatsapp: string | null;
    gerantFirstName: string;
    gerantLastName: string;
    languages: string[];
    registeredAt: string;
    validatedAt: string | null;
    pendingUpdates: unknown | null;
    lastPendingRejection: { note: string; rejectedAt: string } | null;
    avatarInitials: string;
  };
  profiles: {
    brandup: ProfileSummary | null;
    traceup: ProfileSummary | null;
    linkup: ProfileSummary | null;
  };
  rse: RseSummary;
  stats: {
    viewsTotal: number;
    clicksTotal: number;
    viewsThisMonth: number;
    trend: { value: number; label: string } | null;
    activeBoosts: number;
    activeSponsorings: number;
    unreadNotifications: number;
  };
  features: {
    monetization: boolean;
  };
}

// ---------------------------------------------------------------------------
// Dashboard layout context (passed from RSC layout to client components)
// ---------------------------------------------------------------------------

export interface DashboardContext {
  me: MeResponse;
}

// ---------------------------------------------------------------------------
// Notification preview (bell dropdown)
// ---------------------------------------------------------------------------

export interface NotificationPreview {
  id: string;
  title: string;
  body: string;
  icon: string;
  iconVariant: "primary" | "success" | "warning" | "danger" | "rse";
  href: string;
  read: boolean;
  createdAt: string;
}

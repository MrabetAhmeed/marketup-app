/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import { isProfileVisible } from "@/lib/visibility";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Profile } from "@/models/profile.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { Notification } from "@/models/notification.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import type { SupportedLang } from "@/lib/i18n";
import type { MeResponse, ProfileSummary, NotificationPreview } from "@/types/dashboard";
import type { ProfileKind } from "@/types";

// Mongoose 9 strict types require casts for dynamic queries
const CompanyModel = Company as any;
const UserModel = User as any;
const ProfileModel = Profile as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const NotificationModel = Notification as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

function toISOOrNull(date: Date | null | undefined): string | null {
  return date ? new Date(date).toISOString() : null;
}

// ---------------------------------------------------------------------------
// getMe — core data provider for all dashboard pages
// ---------------------------------------------------------------------------

export async function getMe(
  userId: string,
  companyId: string,
  lang: SupportedLang = "fr",
): Promise<MeResponse> {
  await connectDb();

  const now = new Date();

  const [company, user, profiles, activeBoosts, activeSponsorings, unreadNotifications] =
    await Promise.all([
      CompanyModel.findById(companyId).lean(),
      UserModel.findById(userId).lean(),
      ProfileModel.find({ companyId }).lean(),
      BoostModel.find({ companyId, status: "active", to: { $gte: now } }).lean(),
      SponsoringModel.find({ companyId, status: "active", to: { $gte: now } }).lean(),
      NotificationModel.countDocuments({
        recipientType: "owner",
        recipientId: userId,
        read: false,
      }),
    ]);

  if (!company || !user) {
    throw new Error("Company or User not found");
  }

  // Resolve sector + gouvernorat names
  const [sector, gouvernorat] = await Promise.all([
    SectorModel.findOne({ slug: company.liveData.sectorId }).lean(),
    GouvernoratModel.findOne({ slug: company.liveData.gouvernorat }).lean(),
  ]);

  // Map profiles by kind
  const profilesByKind: Record<string, any> = {};
  for (const p of profiles as any[]) {
    profilesByKind[p.kind] = p;
  }

  // Build active boost/sponsoring lookup by profileKind
  const boostedKinds = new Set<string>();
  for (const b of activeBoosts as any[]) {
    boostedKinds.add(b.profileKind);
  }
  const sponsoringKinds = new Set<string>();
  for (const s of activeSponsorings as any[]) {
    sponsoringKinds.add(s.profileKind);
  }

  function buildProfileSummary(kind: ProfileKind): ProfileSummary | null {
    const p = profilesByKind[kind];
    if (!p) return null;

    return {
      id: p._id.toString(),
      kind,
      status: p.status,
      visible: isProfileVisible(
        { status: p.status, isPublic: p.isPublic, pendingData: p.pendingData },
        { status: company.status },
      ),
      isPublic: p.isPublic ?? true,
      rejectionReason: p.rejectionReason ?? null,
      rejectedAt: toISOOrNull(p.rejectedAt),
      submittedAt: toISOOrNull(p.submittedAt),
      publishedAt: toISOOrNull(p.publishedAt),
      lastValidatedAt: toISOOrNull(p.lastValidatedAt),
      disabledAt: toISOOrNull(p.disabledAt),
      hasPendingData: p.pendingData != null,
      stats: {
        viewsTotal: p.stats?.viewsTotal ?? 0,
        views30d: p.stats?.views30d ?? 0,
      },
      boosted: boostedKinds.has(kind),
      sponsoring: sponsoringKinds.has(kind),
    };
  }

  const profileSummaries = {
    brandup: buildProfileSummary("brandup"),
    traceup: buildProfileSummary("traceup"),
    linkup: buildProfileSummary("linkup"),
  };

  // Aggregate view stats
  const viewsTotal =
    (profileSummaries.brandup?.stats.viewsTotal ?? 0) +
    (profileSummaries.traceup?.stats.viewsTotal ?? 0) +
    (profileSummaries.linkup?.stats.viewsTotal ?? 0);

  const views30d =
    (profileSummaries.brandup?.stats.views30d ?? 0) +
    (profileSummaries.traceup?.stats.views30d ?? 0) +
    (profileSummaries.linkup?.stats.views30d ?? 0);

  const displayName = pickLocale(company.data?.displayName, lang);
  const ownerFullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? null,
      languages: user.languages ?? ["fr"],
      avatarInitials: getInitials(ownerFullName),
      lastLoginAt: toISOOrNull(user.lastLoginAt),
    },
    company: {
      id: company._id.toString(),
      slug: company.slug,
      type: company.type,
      status: company.status,
      displayName,
      logoUrl: company.data?.logoUrl ?? null,
      bannerUrl: company.data?.bannerUrl ?? null,
      color: company.data?.color ?? "#0078D4",
      legalId: company.legalId,
      vatNumber: company.vatNumber ?? null,
      accountEmail: company.accountEmail,
      country: company.country ?? "TN",
      sector: {
        slug: company.liveData.sectorId,
        name: sector ? pickLocale(sector.name, lang) : company.liveData.sectorId,
      },
      gouvernorat: {
        slug: company.liveData.gouvernorat,
        name: gouvernorat ? pickLocale(gouvernorat.name, lang) : company.liveData.gouvernorat,
      },
      ville: company.liveData.ville ?? "",
      address: company.liveData.address ?? null,
      contactEmail: company.liveData.contactEmail ?? "",
      phone: company.liveData.phone ?? null,
      whatsapp: company.liveData.whatsapp ?? null,
      languages: company.liveData.languages ?? ["fr"],
      registeredAt: new Date(company.registeredAt).toISOString(),
      validatedAt: toISOOrNull(company.validatedAt),
      pendingUpdates: company.pendingUpdates ?? null,
      rseBadgeStatus: company.rseBadgeStatus ?? "none",
      rseBadgeValidatedAt: toISOOrNull(company.rseBadgeValidatedAt),
      avatarInitials: getInitials(displayName),
    },
    profiles: profileSummaries,
    stats: {
      viewsTotal,
      views30d,
      activeBoosts: (activeBoosts as any[]).length,
      activeSponsorings: (activeSponsorings as any[]).length,
      unreadNotifications,
    },
  };
}

// ---------------------------------------------------------------------------
// getNotificationPreview — bell dropdown data
// ---------------------------------------------------------------------------

export async function getNotificationPreviews(
  userId: string,
  lang: SupportedLang = "fr",
  limit = 3,
): Promise<NotificationPreview[]> {
  await connectDb();

  const notifications = await NotificationModel.find({
    recipientType: "owner",
    recipientId: userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return (notifications as any[]).map((n) => ({
    id: n._id.toString(),
    title: pickLocale(n.title, lang),
    body: pickLocale(n.body, lang),
    icon: n.icon ?? "notifications",
    iconVariant: mapNotificationKindToVariant(n.kind),
    href: n.actionUrl ?? "/dashboard/notifications",
    read: n.read ?? false,
    createdAt: new Date(n.createdAt).toISOString(),
  }));
}

function mapNotificationKindToVariant(
  kind: string,
): "primary" | "success" | "warning" | "danger" | "rse" {
  switch (kind) {
    case "boost_expiring":
    case "boost_paid":
    case "sponsoring_started":
    case "sponsoring_paid":
    case "sponsoring_stats":
      return "primary";
    case "profile_validated":
    case "account_activated":
    case "video_validated":
    case "rse_validated":
      return "success";
    case "security_new_device":
      return "warning";
    case "profile_rejected":
    case "video_rejected":
      return "danger";
    case "rse_submitted":
      return "rse";
    default:
      return "primary";
  }
}

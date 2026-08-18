/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import { isProfileVisible } from "@/lib/visibility";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Profile } from "@/models/profile.model";
import { findActiveBoosts } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { Notification } from "@/models/notification.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import type { SupportedLang } from "@/lib/i18n";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Association } from "@/models/association.model";
import type { MeResponse, ProfileSummary, RseSummary, NotificationPreview } from "@/types/dashboard";
import type { ProfileKind } from "@/types";
import { getProfileMonthlyStats, getCurrentMonth, getPreviousMonth, computeTrend } from "@/services/track.service";
import { env } from "@/lib/env";

// Mongoose 9 strict types require casts for dynamic queries
const CompanyModel = Company as any;
const UserModel = User as any;
const ProfileModel = Profile as any;
const SponsoringModel = Sponsoring as any;
const NotificationModel = Notification as any;
const RseReceiptModel = RseReceipt as any;
const AssociationModel = Association as any;
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
): Promise<MeResponse | null> {
  await connectDb();

  // Lazy expiration: flip stale boosts + sponsorings to "expired" before querying
  const { expireStaleBoosts } = await import("@/services/boost.service");
  const { expireStaleSponsorings } = await import("@/services/sponsoring.service");
  await Promise.all([expireStaleBoosts(), expireStaleSponsorings()]);

  const now = new Date();

  // RSE year boundaries (current civil year)
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [
    company, user, profiles, activeBoosts, activeSponsorings,
    unreadNotifications, lastValidatedReceipt, yearlyDonationAgg,
  ] = await Promise.all([
    CompanyModel.findById(companyId).lean(),
    UserModel.findById(userId).lean(),
    ProfileModel.find({ companyId }).lean(),
    findActiveBoosts({ companyId }, now),
    SponsoringModel.find({ companyId, status: "active", to: { $gte: now } }).lean(),
    NotificationModel.countDocuments({
      recipientType: "owner",
      recipientId: userId,
      read: false,
      deletedAt: null,
    }),
    // Last validated RSE receipt (all-time, most recent by donationDate)
    RseReceiptModel.findOne({ companyId, status: "validated" })
      .sort({ donationDate: -1 })
      .lean(),
    // Sum of validated receipts for current year
    RseReceiptModel.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: "validated",
          donationDate: { $gte: yearStart, $lte: yearEnd },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  if (!company || !user) {
    console.warn("[getMe] User or Company not found", { userId, companyId });
    return null;
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
        { status: p.status, isPublic: p.isPublic, publishedAt: p.publishedAt },
        { status: company.status },
      ),
      isPublic: p.isPublic ?? true,
      placeholderMode: p.placeholderMode ?? "hidden",
      rejectionReason: p.rejectionReason ?? null,
      rejectedAt: toISOOrNull(p.rejectedAt),
      submittedAt: toISOOrNull(p.submittedAt),
      publishedAt: toISOOrNull(p.publishedAt),
      lastValidatedAt: toISOOrNull(p.lastValidatedAt),
      disabledAt: toISOOrNull(p.disabledAt),
      hasPendingData: p.pendingData != null,
      stats: {
        viewsTotal: p.stats?.viewsTotal ?? 0,
        clicksTotal: p.stats?.clicksTotal ?? 0,
        viewsThisMonth: 0, // populated below
        trend: null, // populated below
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

  // Aggregate stats — fetch monthly data from ProfileStatsMonthly
  const currentMonth = getCurrentMonth();
  const prevMonth = getPreviousMonth(currentMonth);

  let totalPrevViews = 0;
  let hasPrevData = false;

  for (const kind of ["brandup", "traceup", "linkup"] as const) {
    const summary = profileSummaries[kind];
    if (!summary) continue;
    const profileObj = profilesByKind[kind];
    if (!profileObj) continue;
    const pid = (profileObj as any)._id.toString();
    const [curStats, prevStats] = await Promise.all([
      getProfileMonthlyStats(pid, currentMonth),
      getProfileMonthlyStats(pid, prevMonth),
    ]);
    summary.stats.viewsThisMonth = curStats.views;
    const prevHasData = prevStats.views > 0 || prevStats.clicks > 0;
    summary.stats.trend = computeTrend(curStats.views, prevHasData ? prevStats.views : null);
    if (prevHasData) {
      hasPrevData = true;
      totalPrevViews += prevStats.views;
    }
  }

  const viewsTotal =
    (profileSummaries.brandup?.stats.viewsTotal ?? 0) +
    (profileSummaries.traceup?.stats.viewsTotal ?? 0) +
    (profileSummaries.linkup?.stats.viewsTotal ?? 0);

  const clicksTotal =
    (profileSummaries.brandup?.stats.clicksTotal ?? 0) +
    (profileSummaries.traceup?.stats.clicksTotal ?? 0) +
    (profileSummaries.linkup?.stats.clicksTotal ?? 0);

  const viewsThisMonth =
    (profileSummaries.brandup?.stats.viewsThisMonth ?? 0) +
    (profileSummaries.traceup?.stats.viewsThisMonth ?? 0) +
    (profileSummaries.linkup?.stats.viewsThisMonth ?? 0);

  const aggregateTrend = computeTrend(viewsThisMonth, hasPrevData ? totalPrevViews : null);

  // Build RSE summary
  const totalDonationsYear = (yearlyDonationAgg as any[])[0]?.total ?? 0;
  let lastDonation: RseSummary["lastDonation"] = null;
  if (lastValidatedReceipt) {
    const receipt = lastValidatedReceipt as any;
    const association = await AssociationModel.findById(receipt.associationId).lean();
    lastDonation = {
      associationName: association
        ? pickLocale((association as any).name, lang)
        : "Association inconnue",
      date: new Date(receipt.donationDate).toISOString(),
      amount: receipt.amount,
    };
  }

  const rseSummary: RseSummary = {
    badgeStatus: company.rseBadgeStatus ?? "none",
    badgeValidatedAt: toISOOrNull(company.rseBadgeValidatedAt),
    lastDonation,
    totalDonationsYear,
  };

  const displayName = pickLocale(company.data?.displayName, lang);
  const gerantFirst: string = company.liveData?.gerantFirstName ?? user.firstName ?? "";
  const gerantLast: string = company.liveData?.gerantLastName ?? user.lastName ?? "";
  const ownerFullName = [gerantFirst, gerantLast].filter(Boolean).join(" ");

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
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
      identityDocumentUrl: company.identityDocumentUrl ?? null,
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
      gerantFirstName: gerantFirst,
      gerantLastName: gerantLast,
      languages: company.liveData.languages ?? ["fr"],
      registeredAt: new Date(company.registeredAt).toISOString(),
      validatedAt: toISOOrNull(company.validatedAt),
      pendingUpdates: company.pendingUpdates ?? null,
      lastPendingRejection: company.lastPendingRejection
        ? { note: company.lastPendingRejection.note, rejectedAt: new Date(company.lastPendingRejection.rejectedAt).toISOString() }
        : null,
      avatarInitials: getInitials(displayName),
    },
    profiles: profileSummaries,
    rse: rseSummary,
    stats: {
      viewsTotal,
      clicksTotal,
      viewsThisMonth,
      trend: aggregateTrend,
      activeBoosts: (activeBoosts as any[]).length,
      activeSponsorings: (activeSponsorings as any[]).length,
      unreadNotifications,
    },
    features: {
      monetization: env.MONETIZATION_ENABLED,
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

  // Dropdown shows only unread notifications
  const notifications = await NotificationModel.find({
    recipientType: "owner",
    recipientId: userId,
    read: false,
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { env } from "@/lib/env";
import { pickLocale } from "@/lib/i18n";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { sendProfileValidatedEmail, sendProfileRejectedEmail } from "@/lib/email/sender";
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileKind } from "@/types";

const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;
const CompanyModel = Company as any;
const UserModel = User as any;

function getModelForKind(kind: ProfileKind): any {
  switch (kind) {
    case "brandup": return BrandUpModel;
    case "traceup": return TraceUpModel;
    case "linkup": return LinkUpModel;
  }
}

// ---------------------------------------------------------------------------
// List pending profiles for admin
// ---------------------------------------------------------------------------

export interface PendingProfileItem {
  id: string;
  kind: ProfileKind;
  companyName: string;
  companySlug: string;
  submittedAt: string;
  hasPendingData: boolean;
}

export async function listPendingProfiles(
  lang: SupportedLang = "fr",
): Promise<PendingProfileItem[]> {
  await connectDb();

  const profiles = await ProfileModel.find({ status: "pending", deletedAt: null })
    .sort({ submittedAt: 1 })
    .lean();

  if (profiles.length === 0) return [];

  // Collect company IDs
  const companyIds = Array.from(new Set((profiles as any[]).map((p) => p.companyId.toString())));
  const companies = await CompanyModel.find({ _id: { $in: companyIds } }).lean();
  const companyMap = new Map<string, any>();
  for (const c of companies as any[]) {
    companyMap.set(c._id.toString(), c);
  }

  return (profiles as any[]).map((p) => {
    const company = companyMap.get(p.companyId.toString());
    return {
      id: p._id.toString(),
      kind: p.kind,
      companyName: company ? pickLocale(company.data?.displayName, lang) : "Entreprise inconnue",
      companySlug: company?.slug ?? "",
      submittedAt: p.submittedAt ? new Date(p.submittedAt).toISOString() : new Date(p.createdAt).toISOString(),
      hasPendingData: p.pendingData != null,
    };
  });
}

// ---------------------------------------------------------------------------
// Get profile for admin review
// ---------------------------------------------------------------------------

export interface ProfileForAdminReview {
  id: string;
  kind: ProfileKind;
  status: string;
  companyName: string;
  companySlug: string;
  ownerEmail: string;
  submittedAt: string;
  pendingFields: Array<{ key: string; label: string; currentValue: string; newValue: string }>;
}

export async function getProfileForAdminReview(
  profileId: string,
  lang: SupportedLang = "fr",
): Promise<ProfileForAdminReview> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");
  if (profile.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce profil n'est pas en attente de validation.");
  }

  const company = await CompanyModel.findById(profile.companyId).lean();
  if (!company) throw new NotFoundError("Company");

  const user = await UserModel.findOne({ companyId: profile.companyId }).lean();

  const pendingFields = (profile.pendingData?.fields ?? []).map((f: any) => ({
    key: f.key,
    label: f.label,
    currentValue: pickLocale(f.currentValue, lang),
    newValue: pickLocale(f.newValue, lang),
  }));

  return {
    id: profile._id.toString(),
    kind: profile.kind,
    status: profile.status,
    companyName: pickLocale(company.data?.displayName, lang),
    companySlug: company.slug,
    ownerEmail: user?.email ?? company.accountEmail,
    submittedAt: profile.submittedAt ? new Date(profile.submittedAt).toISOString() : "",
    pendingFields,
  };
}

// ---------------------------------------------------------------------------
// Validate profile (admin action)
// ---------------------------------------------------------------------------

export async function validateProfileByAdmin(
  profileId: string,
  adminId: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");
  if (profile.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce profil n'est pas en attente de validation.");
  }

  const kind: ProfileKind = profile.kind;
  const Model = getModelForKind(kind);
  const now = new Date();

  // Merge pendingData.fields into data
  const setMap: Record<string, unknown> = {
    status: "active",
    publishedAt: now,
    lastValidatedAt: now,
    lastValidatedBy: adminId,
    pendingData: null,
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
  };

  if (profile.pendingData?.fields) {
    for (const field of profile.pendingData.fields as any[]) {
      setMap[`data.${field.key}`] = field.newValue;
    }
  }

  await Model.findByIdAndUpdate(profileId, { $set: setMap });

  // Send email to owner (non-blocking)
  try {
    const company = await CompanyModel.findById(profile.companyId).lean();
    const user = await UserModel.findOne({ companyId: profile.companyId }).lean();
    if (user && company) {
      const companyName = pickLocale(company.data?.displayName, lang);
      await sendProfileValidatedEmail({
        userEmail: user.email,
        companyName,
        profileKind: kind,
        profileUrl: `${env.NEXTAUTH_URL}/${kind}/${company.slug}`,
      });
    }
  } catch (err) {
    console.warn("[validateProfile] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reject profile (admin action)
// ---------------------------------------------------------------------------

export async function rejectProfileByAdmin(
  profileId: string,
  adminId: string,
  rejectionReason: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");
  if (profile.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce profil n'est pas en attente de validation.");
  }

  const kind: ProfileKind = profile.kind;
  const Model = getModelForKind(kind);
  const now = new Date();

  await Model.findByIdAndUpdate(profileId, {
    $set: {
      status: "rejected",
      rejectionReason,
      rejectedAt: now,
      rejectedBy: adminId,
      pendingData: null,
    },
  });

  // Send email to owner (non-blocking)
  try {
    const company = await CompanyModel.findById(profile.companyId).lean();
    const user = await UserModel.findOne({ companyId: profile.companyId }).lean();
    if (user && company) {
      const companyName = pickLocale(company.data?.displayName, lang);
      const kindRoute = kind === "brandup" ? "brandup" : kind === "traceup" ? "traceup" : "linkup";
      await sendProfileRejectedEmail({
        userEmail: user.email,
        companyName,
        profileKind: kind,
        rejectionReason,
        dashboardUrl: `${env.NEXTAUTH_URL}/dashboard/${kindRoute}`,
      });
    }
  } catch (err) {
    console.warn("[rejectProfile] Email failed (non-blocking):", err);
  }
}

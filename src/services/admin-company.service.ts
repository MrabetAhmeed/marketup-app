/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { pickLocale } from "@/lib/i18n";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { sendCompanyValidatedEmail, sendCompanyRejectedEmail } from "@/lib/email/sender";
import type { SupportedLang } from "@/lib/i18n";

const CompanyModel = Company as any;
const UserModel = User as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------------------------------------------------------------------------
// List pending companies
// ---------------------------------------------------------------------------

export interface PendingCompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  sector: string;
  gouvernorat: string;
  ville: string;
  accountEmail: string;
  registeredAt: string;
  hasLegalDoc: boolean;
}

export async function listPendingCompanies(
  lang: SupportedLang = "fr",
): Promise<PendingCompanyItem[]> {
  await connectDb();

  const companies = await CompanyModel.find({ status: "pending", deletedAt: null })
    .sort({ registeredAt: 1 })
    .lean();

  if (companies.length === 0) return [];

  const sectorSlugs = Array.from(new Set((companies as any[]).map((c) => c.liveData?.sectorId).filter(Boolean)));
  const govSlugs = Array.from(new Set((companies as any[]).map((c) => c.liveData?.gouvernorat).filter(Boolean)));

  const [sectors, gouvernorats] = await Promise.all([
    SectorModel.find({ slug: { $in: sectorSlugs } }).lean(),
    GouvernoratModel.find({ slug: { $in: govSlugs } }).lean(),
  ]);

  const sectorMap = new Map((sectors as any[]).map((s) => [s.slug, pickLocale(s.name, lang)]));
  const govMap = new Map((gouvernorats as any[]).map((g) => [g.slug, pickLocale(g.name, lang)]));

  return (companies as any[]).map((c) => ({
    id: c._id.toString(),
    displayName: pickLocale(c.data?.displayName, lang),
    slug: c.slug,
    type: c.type,
    sector: sectorMap.get(c.liveData?.sectorId) ?? c.liveData?.sectorId ?? "",
    gouvernorat: govMap.get(c.liveData?.gouvernorat) ?? c.liveData?.gouvernorat ?? "",
    ville: c.liveData?.ville ?? "",
    accountEmail: c.accountEmail,
    registeredAt: new Date(c.registeredAt).toISOString(),
    hasLegalDoc: !!c.identityDocumentUrl,
  }));
}

// ---------------------------------------------------------------------------
// Get company for admin review
// ---------------------------------------------------------------------------

export interface CompanyForAdminReview {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  legalId: string;
  vatNumber: string | null;
  accountEmail: string;
  contactEmail: string;
  phone: string | null;
  sector: string;
  gouvernorat: string;
  ville: string;
  address: string | null;
  identityDocumentUrl: string | null;
  registeredAt: string;
  ownerName: string;
  ownerEmail: string;
}

export async function getCompanyForAdminReview(
  companyId: string,
  lang: SupportedLang = "fr",
): Promise<CompanyForAdminReview> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce compte n'est pas en attente de validation.");
  }

  const user = await UserModel.findOne({ companyId: company._id }).lean();
  const sector = await SectorModel.findOne({ slug: company.liveData?.sectorId }).lean();
  const gouvernorat = await GouvernoratModel.findOne({ slug: company.liveData?.gouvernorat }).lean();

  return {
    id: company._id.toString(),
    displayName: pickLocale(company.data?.displayName, lang),
    slug: company.slug,
    type: company.type,
    legalId: company.legalId,
    vatNumber: company.vatNumber ?? null,
    accountEmail: company.accountEmail,
    contactEmail: company.liveData?.contactEmail ?? "",
    phone: company.liveData?.phone ?? null,
    sector: sector ? pickLocale(sector.name, lang) : company.liveData?.sectorId ?? "",
    gouvernorat: gouvernorat ? pickLocale(gouvernorat.name, lang) : company.liveData?.gouvernorat ?? "",
    ville: company.liveData?.ville ?? "",
    address: company.liveData?.address ?? null,
    identityDocumentUrl: company.identityDocumentUrl ?? null,
    registeredAt: new Date(company.registeredAt).toISOString(),
    ownerName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "",
    ownerEmail: user?.email ?? company.accountEmail,
  };
}

// ---------------------------------------------------------------------------
// Validate company
// ---------------------------------------------------------------------------

export async function validateCompanyByAdmin(
  companyId: string,
  adminId: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce compte n'est pas en attente de validation.");
  }

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      status: "active",
      validatedAt: new Date(),
      validatedBy: adminId,
      rejectedReason: null,
      rejectedAt: null,
    },
  });

  try {
    const user = await UserModel.findOne({ companyId: company._id }).lean();
    if (user) {
      await sendCompanyValidatedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        dashboardUrl: `${env.NEXTAUTH_URL}/dashboard`,
      });
    }
  } catch (err) {
    console.warn("[validateCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reject company
// ---------------------------------------------------------------------------

export async function rejectCompanyByAdmin(
  companyId: string,
  adminId: string,
  rejectedReason: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce compte n'est pas en attente de validation.");
  }

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      status: "rejected",
      rejectedReason,
      rejectedAt: new Date(),
    },
  });

  try {
    const user = await UserModel.findOne({ companyId: company._id }).lean();
    if (user) {
      await sendCompanyRejectedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        rejectedReason,
      });
    }
  } catch (err) {
    console.warn("[rejectCompany] Email failed (non-blocking):", err);
  }
}

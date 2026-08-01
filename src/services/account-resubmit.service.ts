/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { pickLocale } from "@/lib/i18n";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { sendCompanyResubmittedEmail } from "@/lib/email/sender";
import type { CompanyResubmitInput } from "@/schemas/account-resubmit.schema";

const CompanyModel = Company as any;
const UserModel = User as any;

export async function resubmitCompany(
  userId: string,
  payload: CompanyResubmitInput,
): Promise<void> {
  await connectDb();

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  const companyId = user.companyId?.toString();
  if (!companyId) throw new NotFoundError("Company");

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");

  if (company.status !== "rejected") {
    throw new BusinessRuleError(
      "INVALID_STATUS",
      "Seul un compte refusé peut être re-soumis.",
    );
  }

  const now = new Date();

  // Always write identityDocumentUrl — either the new Cloudinary URL or the existing one
  const newDocUrl = payload.identityDocumentUrl ?? company.identityDocumentUrl ?? null;

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      "data.displayName": { fr: payload.displayName, ar: "", en: "" },
      "liveData.contactEmail": payload.contactEmail ?? company.liveData?.contactEmail,
      "liveData.phone": payload.phone ?? company.liveData?.phone,
      "liveData.whatsapp": payload.whatsapp ?? company.liveData?.whatsapp,
      "liveData.sectorId": payload.sectorId,
      "liveData.gouvernorat": payload.gouvernorat,
      "liveData.ville": payload.ville,
      "liveData.address": payload.address ?? null,
      identityDocumentUrl: newDocUrl,
      status: "pending",
      registeredAt: now,
      rejectedReason: null,
      rejectedAt: null,
    },
  });

  // Send admin email (non-blocking)
  try {
    const adminEmail = env.ADMIN_NOTIFICATION_EMAIL;
    const companyName = payload.displayName;
    await sendCompanyResubmittedEmail({
      adminEmail,
      companyName,
      adminUrl: `${env.NEXTAUTH_URL}/admin/validation/comptes/${companyId}`,
    });
  } catch (err) {
    console.warn("[resubmitCompany] Email failed (non-blocking):", err);
  }
}

export async function getCompanyForEdit(
  userId: string,
): Promise<{
  id: string;
  status: string;
  displayName: string;
  type: string;
  legalId: string;
  vatNumber: string | null;
  accountEmail: string;
  contactEmail: string;
  phone: string | null;
  whatsapp: string | null;
  sectorId: string;
  gouvernorat: string;
  ville: string;
  address: string | null;
  identityDocumentUrl: string | null;
  rejectedReason: string | null;
  rejectedAt: string | null;
}> {
  await connectDb();

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  const companyId = user.companyId?.toString();
  if (!companyId) throw new NotFoundError("Company");

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");

  return {
    id: company._id.toString(),
    status: company.status,
    displayName: pickLocale(company.data?.displayName, "fr"),
    type: company.type,
    legalId: company.legalId,
    vatNumber: company.vatNumber ?? null,
    accountEmail: company.accountEmail,
    contactEmail: company.liveData?.contactEmail ?? "",
    phone: company.liveData?.phone ?? null,
    whatsapp: company.liveData?.whatsapp ?? null,
    sectorId: company.liveData?.sectorId ?? "",
    gouvernorat: company.liveData?.gouvernorat ?? "",
    ville: company.liveData?.ville ?? "",
    address: company.liveData?.address ?? null,
    identityDocumentUrl: company.identityDocumentUrl ?? null,
    rejectedReason: company.rejectedReason ?? null,
    rejectedAt: company.rejectedAt ? new Date(company.rejectedAt).toISOString() : null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import { Company } from "@/models/company.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Association } from "@/models/association.model";
import type { SupportedLang } from "@/lib/i18n";
import type { RsePageData, RseReceiptForUser } from "@/types/rse";

const CompanyModel = Company as any;
const RseReceiptModel = RseReceipt as any;
const AssociationModel = Association as any;

/**
 * Get full RSE data for the /dashboard/rse page.
 */
export async function getRseDataForUser(
  companyId: string,
  lang: SupportedLang = "fr",
): Promise<RsePageData> {
  await connectDb();

  const [company, receipts, associations] = await Promise.all([
    CompanyModel.findById(companyId).select("rseBadgeStatus rseBadgeValidatedAt").lean(),
    RseReceiptModel.find({ companyId }).sort({ donationDate: -1 }).lean(),
    AssociationModel.find({ active: true }).select("name logoUrl").lean(),
  ]);

  // Build association lookup
  const assocMap = new Map<string, { name: string; logoUrl: string | null }>();
  for (const a of associations as any[]) {
    assocMap.set(a._id.toString(), {
      name: pickLocale(a.name, lang),
      logoUrl: a.logoUrl ?? null,
    });
  }

  // Map receipts
  const mappedReceipts: RseReceiptForUser[] = (receipts as any[]).map((r) => {
    const assoc = assocMap.get(r.associationId?.toString() ?? "");
    return {
      id: r._id.toString(),
      associationName: assoc?.name ?? "Association inconnue",
      associationLogoUrl: assoc?.logoUrl ?? null,
      amount: r.amount,
      donationDate: new Date(r.donationDate).toISOString(),
      submissionDate: new Date(r.submittedAt ?? r.createdAt).toISOString(),
      receiptNumber: r.receiptNumber ?? null,
      status: r.status,
      rejectionReason: r.rejectedReason ?? null,
      attestationUrl: r.receiptDocumentUrl ?? null,
    };
  });

  // Compute stats
  const validated = mappedReceipts.filter((r) => r.status === "validated");
  const pending = mappedReceipts.filter((r) => r.status === "pending");

  const totalValidatedAmount = validated.reduce((sum, r) => sum + r.amount, 0);
  const totalPendingAmount = pending.reduce((sum, r) => sum + r.amount, 0);

  const lastValidated = validated.length > 0 ? validated[0]! : null;

  return {
    badgeStatus: company?.rseBadgeStatus ?? "none",
    badgeValidatedAt: company?.rseBadgeValidatedAt
      ? new Date(company.rseBadgeValidatedAt).toISOString()
      : null,
    receipts: mappedReceipts,
    stats: {
      totalValidatedAmount,
      totalPendingAmount,
      validatedCount: validated.length,
      pendingCount: pending.length,
      totalCount: mappedReceipts.length,
      lastValidatedDate: lastValidated?.donationDate ?? null,
      lastValidatedAssociation: lastValidated?.associationName ?? null,
    },
    associations: (associations as any[]).map((a) => ({
      id: a._id.toString(),
      name: pickLocale(a.name, lang),
      logoUrl: a.logoUrl ?? null,
    })),
  };
}

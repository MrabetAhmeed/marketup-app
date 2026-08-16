/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { pickLocale } from "@/lib/i18n";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Association } from "@/models/association.model";
import { sendRseReceiptValidatedEmail, sendRseReceiptRejectedEmail } from "@/lib/email/sender";
import { createNotification } from "@/services/notifications.service";
import type { SupportedLang } from "@/lib/i18n";

const RseReceiptModel = RseReceipt as any;
const CompanyModel = Company as any;
const UserModel = User as any;
const AssociationModel = Association as any;

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------------------------------------------------------------------------
// List pending RSE receipts
// ---------------------------------------------------------------------------

export interface PendingRseReceiptItem {
  id: string;
  companyName: string;
  associationName: string;
  amount: number;
  donationDate: string;
  submittedAt: string;
}

export async function listPendingRseReceipts(
  lang: SupportedLang = "fr",
): Promise<PendingRseReceiptItem[]> {
  await connectDb();

  const receipts = await RseReceiptModel.find({ status: "pending", deletedAt: null })
    .sort({ submittedAt: 1 })
    .lean();

  if (receipts.length === 0) return [];

  const companyIds = Array.from(new Set((receipts as any[]).map((r) => r.companyId.toString())));
  const assocIds = Array.from(new Set((receipts as any[]).map((r) => r.associationId.toString())));

  const [companies, associations] = await Promise.all([
    CompanyModel.find({ _id: { $in: companyIds } }).lean(),
    AssociationModel.find({ _id: { $in: assocIds } }).lean(),
  ]);

  const companyMap = new Map((companies as any[]).map((c) => [c._id.toString(), c]));
  const assocMap = new Map((associations as any[]).map((a) => [a._id.toString(), a]));

  return (receipts as any[]).map((r) => {
    const company = companyMap.get(r.companyId.toString());
    const assoc = assocMap.get(r.associationId.toString());
    return {
      id: r._id.toString(),
      companyName: company ? pickLocale(company.data?.displayName, lang) : "Inconnue",
      associationName: assoc ? pickLocale(assoc.name, lang) : "Inconnue",
      amount: r.amount,
      donationDate: new Date(r.donationDate).toISOString(),
      submittedAt: new Date(r.submittedAt ?? r.createdAt).toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Get receipt for admin review
// ---------------------------------------------------------------------------

export interface RseReceiptForAdminReview {
  id: string;
  companyName: string;
  companyId: string;
  associationName: string;
  amount: number;
  donationDate: string;
  submittedAt: string;
  receiptNumber: string | null;
  receiptDocumentUrl: string | null;
  ownerEmail: string;
}

export async function getRseReceiptForAdminReview(
  receiptId: string,
  lang: SupportedLang = "fr",
): Promise<RseReceiptForAdminReview> {
  if (!isValidObjectId(receiptId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const receipt = await RseReceiptModel.findById(receiptId).lean();
  if (!receipt) throw new NotFoundError("RseReceipt");
  if (receipt.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce reçu n'est pas en attente de validation.");
  }

  const [company, association, user] = await Promise.all([
    CompanyModel.findById(receipt.companyId).lean(),
    AssociationModel.findById(receipt.associationId).lean(),
    UserModel.findOne({ companyId: receipt.companyId }).lean(),
  ]);

  return {
    id: receipt._id.toString(),
    companyName: company ? pickLocale(company.data?.displayName, lang) : "Inconnue",
    companyId: receipt.companyId.toString(),
    associationName: association ? pickLocale(association.name, lang) : "Inconnue",
    amount: receipt.amount,
    donationDate: new Date(receipt.donationDate).toISOString(),
    submittedAt: new Date(receipt.submittedAt ?? receipt.createdAt).toISOString(),
    receiptNumber: receipt.receiptNumber ?? null,
    receiptDocumentUrl: receipt.receiptDocumentUrl ?? null,
    ownerEmail: user?.email ?? company?.accountEmail ?? "",
  };
}

// ---------------------------------------------------------------------------
// Validate RSE receipt + badge flip
// ---------------------------------------------------------------------------

export async function validateRseReceipt(
  receiptId: string,
  adminId: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(receiptId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const receipt = await RseReceiptModel.findById(receiptId).lean();
  if (!receipt) throw new NotFoundError("RseReceipt");
  if (receipt.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce reçu n'est pas en attente de validation.");
  }

  const now = new Date();

  await RseReceiptModel.findByIdAndUpdate(receiptId, {
    $set: {
      status: "validated",
      validatedAt: now,
      validatedBy: adminId,
      rejectedReason: null,
      rejectedAt: null,
    },
  });

  // Badge RSE flip: if this is the 1st validated receipt for the company
  const validatedCount = await RseReceiptModel.countDocuments({
    companyId: receipt.companyId,
    status: "validated",
    deletedAt: null,
  });

  if (validatedCount >= 1) {
    const company = await CompanyModel.findById(receipt.companyId).lean();
    if (company && company.rseBadgeStatus !== "validated") {
      await CompanyModel.findByIdAndUpdate(receipt.companyId, {
        $set: { rseBadgeStatus: "validated", rseBadgeValidatedAt: now },
      });
    }
  }

  // Email user (non-blocking)
  try {
    const [company, association, user] = await Promise.all([
      CompanyModel.findById(receipt.companyId).lean(),
      AssociationModel.findById(receipt.associationId).lean(),
      UserModel.findOne({ companyId: receipt.companyId }).lean(),
    ]);
    if (user && company) {
      await sendRseReceiptValidatedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        associationName: association ? pickLocale(association.name, lang) : "Association",
        amount: receipt.amount,
      });
    }
  } catch (err) {
    console.warn("[validateRseReceipt] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reject RSE receipt
// ---------------------------------------------------------------------------

export async function rejectRseReceipt(
  receiptId: string,
  adminId: string,
  rejectedReason: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(receiptId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const receipt = await RseReceiptModel.findById(receiptId).lean();
  if (!receipt) throw new NotFoundError("RseReceipt");
  if (receipt.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce reçu n'est pas en attente de validation.");
  }

  await RseReceiptModel.findByIdAndUpdate(receiptId, {
    $set: {
      status: "rejected",
      rejectedReason,
      rejectedAt: new Date(),
    },
  });

  try {
    const [company, association, user] = await Promise.all([
      CompanyModel.findById(receipt.companyId).lean(),
      AssociationModel.findById(receipt.associationId).lean(),
      UserModel.findOne({ companyId: receipt.companyId }).lean(),
    ]);
    if (user && company) {
      const companyName = pickLocale(company.data?.displayName, lang);
      const assocName = association ? pickLocale(association.name, lang) : "Association";
      await sendRseReceiptRejectedEmail({
        userEmail: user.email,
        companyName,
        associationName: assocName,
        amount: receipt.amount,
        rejectedReason,
      });
      // In-app notification for the owner
      createNotification({
        recipientType: "owner",
        recipientId: String(user._id),
        kind: "rse_receipt_rejected",
        icon: "cancel",
        color: "danger",
        title: { fr: `Reçu RSE refusé — ${assocName}` },
        body: { fr: rejectedReason },
        actionUrl: "/dashboard/rse",
        actionLabel: { fr: "Voir mes reçus" },
      }).catch((e) => console.warn("[rejectRseReceipt] notification failed:", e));
    }
  } catch (err) {
    console.warn("[rejectRseReceipt] Email failed (non-blocking):", err);
  }
}

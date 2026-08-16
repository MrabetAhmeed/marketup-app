/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, BusinessRuleError, NotFoundError } from "@/lib/api-error";
import { BOOST_PRICE_HT, BOOST_DURATION_DAYS, DEFAULT_VAT_RATE, FISCAL_STAMP_DT, computeTTC, formatMoney } from "@/lib/pricing";
import { generateInvoiceNumber } from "@/lib/invoice";
import { payment } from "@/lib/payment";
import { Transaction } from "@/models/transaction.model";
import { Boost, findActiveBoosts } from "@/models/boost.model";
import { Profile } from "@/models/profile.model";
import { Company } from "@/models/company.model";
import { AdminUser } from "@/models/admin-user.model";
import { createNotification } from "@/services/notifications.service";
import { sendTransactionAdminEmail } from "@/lib/email/sender";

const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const ProfileModel = Profile as any;
const CompanyModel = Company as any;
const AdminUserModel = AdminUser as any;

// ---------------------------------------------------------------------------
// checkoutBoost
// ---------------------------------------------------------------------------

export interface CheckoutBoostResult {
  boost: {
    id: string;
    profileKind: string;
    from: string;
    to: string;
    status: string;
  };
  transaction: {
    id: string;
    type: string;
    priceHT: number;
    vatAmount: number;
    fiscalStampDT: number;
    priceTTC: number;
    currency: string;
    status: string;
    invoiceNumber: string;
    paidAt: string | null;
  };
}

export async function checkoutBoost(
  companyId: string,
  profileKind: "brandup" | "traceup" | "linkup",
  idempotencyKey: string,
): Promise<CheckoutBoostResult> {
  await connectDb();

  // --- Idempotency check ---
  const existing = await TransactionModel.findOne({
    companyId,
    idempotencyKey,
    type: "boost",
  }).lean();
  if (existing) {
    const existingBoost = await BoostModel.findOne({ transactionId: existing._id }).lean();
    const { vatAmount, priceTTC } = computeTTC(existing.priceHT, existing.vatRate, existing.fiscalStampDT ?? 0);
    return {
      boost: {
        id: existingBoost ? String(existingBoost._id) : "",
        profileKind: existing.profileKind,
        from: existingBoost?.from ? new Date(existingBoost.from).toISOString() : "",
        to: existingBoost?.to ? new Date(existingBoost.to).toISOString() : "",
        status: existingBoost?.status ?? "active",
      },
      transaction: {
        id: String(existing._id),
        type: "boost",
        priceHT: existing.priceHT,
        vatAmount,
        fiscalStampDT: existing.fiscalStampDT ?? 0,
        priceTTC,
        currency: existing.currency || "DT",
        status: existing.status === "paid_simulated" ? "paid" : existing.status,
        invoiceNumber: existing.invoiceNumber,
        paidAt: existing.paidAt ? new Date(existing.paidAt).toISOString() : null,
      },
    };
  }

  // --- Guards ---
  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Entreprise");
  if (company.status !== "active") {
    throw new BusinessRuleError("COMPANY_NOT_ACTIVE", "L'entreprise doit être active pour acheter un boost.");
  }

  const profile = await ProfileModel.findOne({ companyId, kind: profileKind }).lean();
  if (!profile) {
    throw new NotFoundError(`Profil ${profileKind}`);
  }
  if (profile.deletedAt) {
    throw new BusinessRuleError("PROFILE_DELETED", "Ce profil a été supprimé.");
  }
  if (profile.status !== "active" || !profile.isPublic) {
    throw new BusinessRuleError(
      "BOOST_PROFILE_NOT_PUBLIC",
      "Le profil doit être actif et visible publiquement pour être boosté.",
    );
  }

  // Guard anti-doublon: no active boost on same (companyId, profileKind)
  const activeBoosts = await findActiveBoosts({ companyId, profileKind });
  if (activeBoosts.length > 0) {
    throw new AppError("BOOST_ALREADY_ACTIVE", "Un boost est déjà actif sur ce profil.", 409);
  }

  // --- Generate invoice number before session ---
  const invoiceNumber = await generateInvoiceNumber();

  // --- Atomic: Transaction + Boost in Mongoose session ---
  const session = await mongoose.startSession();
  let result: CheckoutBoostResult;

  try {
    session.startTransaction();

    const now = new Date();
    const to = new Date(now.getTime() + BOOST_DURATION_DAYS * 86_400_000);

    // Create Transaction (pending)
    const [txDoc] = await TransactionModel.create(
      [{
        companyId,
        type: "boost",
        profileKind,
        priceHT: BOOST_PRICE_HT,
        vatRate: DEFAULT_VAT_RATE,
        fiscalStampDT: FISCAL_STAMP_DT,
        currency: "DT",
        status: "pending",
        paymentMethod: null,
        paymentReference: null,
        paidAt: null,
        invoiceNumber,
        idempotencyKey,
      }],
      { session },
    );

    // Process payment (simulated = instant)
    const checkout = await payment.createCheckout({
      companyId,
      type: "boost",
      profileKind,
      priceHT: BOOST_PRICE_HT,
      vatRate: DEFAULT_VAT_RATE,
      idempotencyKey,
    });

    // Update transaction with payment result
    txDoc.status = checkout.status;
    txDoc.paymentMethod = checkout.paymentMethod;
    txDoc.paymentReference = checkout.reference;
    txDoc.paidAt = checkout.paidAt ? new Date(checkout.paidAt) : null;
    await txDoc.save({ session });

    // Create Boost
    const [boostDoc] = await BoostModel.create(
      [{
        companyId,
        profileKind,
        from: now,
        to,
        transactionId: txDoc._id,
        status: "active",
      }],
      { session },
    );

    await session.commitTransaction();

    const { vatAmount, priceTTC } = computeTTC(BOOST_PRICE_HT, DEFAULT_VAT_RATE, FISCAL_STAMP_DT);
    result = {
      boost: {
        id: String(boostDoc._id),
        profileKind,
        from: now.toISOString(),
        to: to.toISOString(),
        status: "active",
      },
      transaction: {
        id: String(txDoc._id),
        type: "boost",
        priceHT: BOOST_PRICE_HT,
        vatAmount,
        fiscalStampDT: FISCAL_STAMP_DT,
        priceTTC,
        currency: "DT",
        status: checkout.status === "paid_simulated" ? "paid" : checkout.status,
        invoiceNumber,
        paidAt: checkout.paidAt,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // --- Post-commit: notifications (non-blocking) ---
  const { priceTTC: ttc } = computeTTC(BOOST_PRICE_HT, DEFAULT_VAT_RATE, FISCAL_STAMP_DT);
  const companyName = company.data?.displayName?.fr || "Entreprise";
  const kindLabel = profileKind === "brandup" ? "BrandUP" : profileKind === "traceup" ? "TraceUP" : "LinkUP";

  // Owner notification
  const ownerUserId = String(company.ownerUserId);
  createNotification({
    recipientType: "owner",
    recipientId: ownerUserId,
    kind: "boost_paid",
    icon: "trending_up",
    color: "success",
    title: { fr: `Boost ${kindLabel} activé` },
    body: { fr: `Votre boost ${kindLabel} est actif pour 30 jours. Montant : ${formatMoney(ttc)} DT TTC.` },
    actionUrl: "/dashboard/boost",
    actionLabel: { fr: "Voir mes boosts" },
  }).catch((err) => console.error("[boost] owner notification failed:", err));

  // Admin notification (in-app)
  const adminUser = await AdminUserModel.findOne({}).lean();
  if (adminUser) {
    createNotification({
      recipientType: "admin",
      recipientId: String(adminUser._id),
      kind: "boost_paid",
      icon: "trending_up",
      color: "success",
      title: { fr: `Nouveau boost — ${companyName}` },
      body: { fr: `${companyName} a acheté un boost ${kindLabel}. Montant : ${formatMoney(ttc)} DT TTC.` },
      actionUrl: "/admin/transactions",
      actionLabel: { fr: "Voir les transactions" },
    }).catch((err) => console.error("[boost] admin notification failed:", err));
  }

  // Admin email (non-blocking)
  sendTransactionAdminEmail({
    adminEmail: env.ADMIN_NOTIFICATION_EMAIL,
    companyName,
    type: "boost",
    amountTTC: formatMoney(ttc),
    invoiceNumber: result.transaction.invoiceNumber,
  }).catch((err) => console.error("[boost] admin email failed:", err));

  return result;
}

// ---------------------------------------------------------------------------
// expireStaleBoosts — lazy cleanup (called from getMe)
// ---------------------------------------------------------------------------

export async function expireStaleBoosts(): Promise<number> {
  const result = await BoostModel.updateMany(
    { status: "active", to: { $lt: new Date() } },
    { $set: { status: "expired" } },
  );
  return result.modifiedCount ?? 0;
}

// ---------------------------------------------------------------------------
// getBoostHistory — owner boost history (all statuses, from desc)
// ---------------------------------------------------------------------------

export interface BoostHistoryItem {
  id: string;
  profileKind: "brandup" | "traceup" | "linkup";
  from: string;
  to: string;
  status: "active" | "expired";
  priceTTC: number;
  currency: string;
  viewsAdded: number;
  clicksAdded: number;
}

export async function getBoostHistory(companyId: string): Promise<BoostHistoryItem[]> {
  await connectDb();

  const docs = await BoostModel.aggregate([
    { $match: { companyId: new (await import("mongoose")).default.Types.ObjectId(companyId), deletedAt: null } },
    { $sort: { from: -1 } },
    {
      $lookup: {
        from: "transactions",
        localField: "transactionId",
        foreignField: "_id",
        as: "_tx",
      },
    },
    { $unwind: { path: "$_tx", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        profileKind: 1,
        from: 1,
        to: 1,
        status: 1,
        viewsAdded: 1,
        clicksAdded: 1,
        "priceHT": "$_tx.priceHT",
        "vatRate": "$_tx.vatRate",
        "currency": "$_tx.currency",
      },
    },
  ]);

  return docs.map((d: Record<string, unknown>) => {
    const { priceTTC } = computeTTC(
      (d.priceHT as number) ?? BOOST_PRICE_HT,
      (d.vatRate as number) ?? DEFAULT_VAT_RATE,
      (d.fiscalStampDT as number) ?? 0,
    );
    return {
      id: String(d._id),
      profileKind: d.profileKind as BoostHistoryItem["profileKind"],
      from: new Date(d.from as string).toISOString(),
      to: new Date(d.to as string).toISOString(),
      status: d.status as BoostHistoryItem["status"],
      priceTTC,
      currency: (d.currency as string) || "DT",
      viewsAdded: (d.viewsAdded as number) ?? 0,
      clicksAdded: (d.clicksAdded as number) ?? 0,
    };
  });
}

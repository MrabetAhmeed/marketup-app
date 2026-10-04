/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { AppError, BusinessRuleError, NotFoundError } from "@/lib/api-error";
import { BOOST_PRICE_HT, BOOST_DURATION_DAYS, DEFAULT_VAT_RATE, FISCAL_STAMP_DT, computeTTC } from "@/lib/pricing";
import { generateInvoiceNumber } from "@/lib/invoice";
import { Boost, findActiveBoosts } from "@/models/boost.model";
import { Profile } from "@/models/profile.model";
import { Company } from "@/models/company.model";
import {
  createOrderAndStartPayment,
  findOrderByIdempotencyKey,
  resumeOrReleasePendingOrder,
} from "@/services/order.service";
import type { CheckoutOrderResult } from "@/services/order.service";

const BoostModel = Boost as any;
const ProfileModel = Profile as any;
const CompanyModel = Company as any;

// ---------------------------------------------------------------------------
// checkoutBoost — first step of the two-step purchase (V1.2 F3)
//
// Creates the order `pending` and returns where the buyer must go to pay.
// The boost itself is only created by confirmOrder (order.service.ts), after
// the payment has been verified with the operator.
// ---------------------------------------------------------------------------

const CHECKOUT_IN_PROGRESS = {
  code: "BOOST_CHECKOUT_IN_PROGRESS",
  message: "Un paiement est déjà en cours pour ce boost.",
};

export async function checkoutBoost(
  companyId: string,
  profileKind: "brandup" | "traceup" | "linkup",
  idempotencyKey: string,
): Promise<CheckoutOrderResult> {
  await connectDb();

  // --- Idempotency: the same key hands back the same order ---
  const sameKey = await findOrderByIdempotencyKey(companyId, "boost", idempotencyKey);
  if (sameKey) return sameKey;

  // --- A pending order for this boost: resume it, or release it ---
  const resumed = await resumeOrReleasePendingOrder({ companyId, type: "boost", profileKind }, CHECKOUT_IN_PROGRESS);
  if (resumed) return resumed;

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

  const invoiceNumber = await generateInvoiceNumber();

  return createOrderAndStartPayment(
    {
      companyId,
      type: "boost",
      profileKind,
      priceHT: BOOST_PRICE_HT,
      vatRate: DEFAULT_VAT_RATE,
      fiscalStampDT: FISCAL_STAMP_DT,
      durationDays: BOOST_DURATION_DAYS,
      invoiceNumber,
      idempotencyKey,
    },
    CHECKOUT_IN_PROGRESS,
  );
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

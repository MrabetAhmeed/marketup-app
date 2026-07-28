/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, BusinessRuleError, NotFoundError } from "@/lib/api-error";
import { SPONSORING_PRICE_HT, SPONSORING_DURATION_DAYS, DEFAULT_VAT_RATE, computeTTC, formatMoney } from "@/lib/pricing";
import { generateInvoiceNumber } from "@/lib/invoice";
import { payment } from "@/lib/payment";
import { Transaction } from "@/models/transaction.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { Profile } from "@/models/profile.model";
import { Company } from "@/models/company.model";
import { AdminUser } from "@/models/admin-user.model";
import { User } from "@/models/user.model";
import { createNotification } from "@/services/notifications.service";
import {
  sendTransactionAdminEmail,
  sendSponsoringSubmittedEmail,
  sendSponsoringValidatedEmail,
  sendSponsoringRejectedEmail,
} from "@/lib/email/sender";

const TransactionModel = Transaction as any;
const SponsoringModel = Sponsoring as any;
const ProfileModel = Profile as any;
const CompanyModel = Company as any;
const AdminUserModel = AdminUser as any;
const UserModel = User as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find sponsorings occupying the slot (pending | confirmed | active). */
async function findOccupyingSponsoring(
  companyId: string,
  profileKind: string,
): Promise<unknown[]> {
  return SponsoringModel.find({
    companyId,
    profileKind,
    status: { $in: ["pending", "confirmed", "active"] },
  }).lean();
}

function kindLabel(profileKind: string): string {
  return profileKind === "brandup" ? "BrandUP" : profileKind === "traceup" ? "TraceUP" : "LinkUP";
}

// ---------------------------------------------------------------------------
// requestSponsoring — owner creates a demand (status: pending)
// ---------------------------------------------------------------------------

export interface RequestSponsoringResult {
  id: string;
  profileKind: string;
  status: string;
  bannerUrl: string;
  linkUrl: string;
  createdAt: string;
}

export async function requestSponsoring(
  companyId: string,
  profileKind: "brandup" | "traceup" | "linkup",
  bannerUrl: string,
  linkUrl: string,
): Promise<RequestSponsoringResult> {
  await connectDb();

  // Guards
  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Entreprise");
  if (company.status !== "active") {
    throw new BusinessRuleError("COMPANY_NOT_ACTIVE", "L'entreprise doit être active.");
  }

  const profile = await ProfileModel.findOne({ companyId, kind: profileKind }).lean();
  if (!profile) throw new NotFoundError(`Profil ${profileKind}`);
  if (profile.status !== "active" || !profile.isPublic) {
    throw new BusinessRuleError(
      "SPONSORING_PROFILE_NOT_PUBLIC",
      "Le profil doit être actif et visible publiquement pour une campagne sponsorisée.",
    );
  }

  // Guard anti-doublon
  const occupying = await findOccupyingSponsoring(companyId, profileKind);
  if (occupying.length > 0) {
    throw new AppError(
      "SPONSORING_SLOT_OCCUPIED",
      "Une demande ou campagne sponsoring est déjà en cours sur ce moteur.",
      409,
    );
  }

  const doc = await SponsoringModel.create({
    companyId,
    profileKind,
    bannerUrl,
    linkUrl,
    status: "pending",
  });

  // Notifications (non-blocking)
  const companyName = (company as any).data?.displayName?.fr || "Entreprise";

  const adminUser = await AdminUserModel.findOne({}).lean();
  if (adminUser) {
    createNotification({
      recipientType: "admin",
      recipientId: String((adminUser as any)._id),
      kind: "sponsoring_request_submitted",
      icon: "campaign",
      color: "gold",
      title: { fr: `Demande sponsoring — ${companyName}` },
      body: { fr: `${companyName} demande une campagne ${kindLabel(profileKind)}. Bannière à vérifier.` },
      actionUrl: "/admin/validation?tab=sponsorings",
      actionLabel: { fr: "Examiner" },
    }).catch((err) => console.error("[sponsoring] admin notification failed:", err));

    sendSponsoringSubmittedEmail({
      adminEmail: env.ADMIN_NOTIFICATION_EMAIL,
      companyName,
      profileKind,
    }).catch((err) => console.error("[sponsoring] admin email failed:", err));
  }

  return {
    id: String(doc._id),
    profileKind,
    status: "pending",
    bannerUrl,
    linkUrl,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// cancelSponsoring — owner cancels (pending | confirmed only)
// ---------------------------------------------------------------------------

export async function cancelSponsoring(
  companyId: string,
  sponsoringId: string,
): Promise<void> {
  await connectDb();

  const doc = await SponsoringModel.findOne({ _id: sponsoringId, companyId }).lean();
  if (!doc) throw new NotFoundError("Sponsoring");

  if (!["pending", "confirmed"].includes((doc as any).status)) {
    throw new BusinessRuleError(
      "SPONSORING_CANCEL_FORBIDDEN",
      "Seules les demandes en attente ou validées (non payées) peuvent être annulées.",
    );
  }

  await SponsoringModel.updateOne(
    { _id: sponsoringId },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
  );
}

// ---------------------------------------------------------------------------
// validateSponsoring — admin validates (pending → confirmed)
// ---------------------------------------------------------------------------

export async function validateSponsoring(
  sponsoringId: string,
): Promise<void> {
  await connectDb();

  const doc = await SponsoringModel.findById(sponsoringId).lean();
  if (!doc) throw new NotFoundError("Sponsoring");
  if ((doc as any).status !== "pending") {
    throw new BusinessRuleError("SPONSORING_NOT_PENDING", "Seules les demandes en attente peuvent être validées.");
  }

  await SponsoringModel.updateOne(
    { _id: sponsoringId },
    { $set: { status: "confirmed", confirmedAt: new Date() } },
  );

  // Notify owner
  const company = await CompanyModel.findById((doc as any).companyId).lean();
  if (company) {
    const companyName = (company as any).data?.displayName?.fr || "Entreprise";
    const ownerUserId = String((company as any).ownerUserId);
    const user = await UserModel.findById(ownerUserId).lean();
    const profileKind = (doc as any).profileKind;

    createNotification({
      recipientType: "owner",
      recipientId: ownerUserId,
      kind: "sponsoring_validated",
      icon: "check_circle",
      color: "success",
      title: { fr: `Sponsoring ${kindLabel(profileKind)} validé` },
      body: { fr: `Votre demande de campagne ${kindLabel(profileKind)} a été validée. Procédez au paiement pour la lancer.` },
      actionUrl: "/dashboard/sponsoring",
      actionLabel: { fr: "Payer" },
    }).catch((err) => console.error("[sponsoring] owner validated notification failed:", err));

    if (user && (user as any).email) {
      sendSponsoringValidatedEmail({
        userEmail: (user as any).email,
        companyName,
        profileKind,
      }).catch((err) => console.error("[sponsoring] owner validated email failed:", err));
    }
  }
}

// ---------------------------------------------------------------------------
// rejectSponsoring — admin rejects (pending → rejected)
// ---------------------------------------------------------------------------

export async function rejectSponsoring(
  sponsoringId: string,
  reason: string,
): Promise<void> {
  await connectDb();

  const doc = await SponsoringModel.findById(sponsoringId).lean();
  if (!doc) throw new NotFoundError("Sponsoring");
  if ((doc as any).status !== "pending") {
    throw new BusinessRuleError("SPONSORING_NOT_PENDING", "Seules les demandes en attente peuvent être refusées.");
  }

  await SponsoringModel.updateOne(
    { _id: sponsoringId },
    { $set: { status: "rejected", rejectionReason: reason } },
  );

  // Notify owner
  const company = await CompanyModel.findById((doc as any).companyId).lean();
  if (company) {
    const companyName = (company as any).data?.displayName?.fr || "Entreprise";
    const ownerUserId = String((company as any).ownerUserId);
    const user = await UserModel.findById(ownerUserId).lean();
    const profileKind = (doc as any).profileKind;

    createNotification({
      recipientType: "owner",
      recipientId: ownerUserId,
      kind: "sponsoring_rejected",
      icon: "cancel",
      color: "danger",
      title: { fr: `Sponsoring ${kindLabel(profileKind)} refusé` },
      body: { fr: `Votre demande de campagne ${kindLabel(profileKind)} a été refusée. Motif : ${reason}` },
      actionUrl: "/dashboard/sponsoring",
      actionLabel: { fr: "Voir" },
    }).catch((err) => console.error("[sponsoring] owner rejected notification failed:", err));

    if (user && (user as any).email) {
      sendSponsoringRejectedEmail({
        userEmail: (user as any).email,
        companyName,
        profileKind,
        rejectionReason: reason,
      }).catch((err) => console.error("[sponsoring] owner rejected email failed:", err));
    }
  }
}

// ---------------------------------------------------------------------------
// checkoutSponsoring — owner pays (confirmed → active)
// ---------------------------------------------------------------------------

export interface CheckoutSponsoringResult {
  sponsoring: {
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
    priceTTC: number;
    currency: string;
    status: string;
    invoiceNumber: string;
    paidAt: string | null;
  };
}

export async function checkoutSponsoring(
  companyId: string,
  sponsoringId: string,
  idempotencyKey: string,
): Promise<CheckoutSponsoringResult> {
  await connectDb();

  // Idempotency check
  const existingTx = await TransactionModel.findOne({
    companyId,
    idempotencyKey,
    type: "sponsoring",
  }).lean();
  if (existingTx) {
    const existingSponsoring = await SponsoringModel.findOne({ transactionId: existingTx._id }).lean();
    const { vatAmount, priceTTC } = computeTTC(existingTx.priceHT, existingTx.vatRate);
    return {
      sponsoring: {
        id: existingSponsoring ? String(existingSponsoring._id) : "",
        profileKind: existingTx.profileKind,
        from: existingSponsoring?.from ? new Date(existingSponsoring.from).toISOString() : "",
        to: existingSponsoring?.to ? new Date(existingSponsoring.to).toISOString() : "",
        status: existingSponsoring?.status ?? "active",
      },
      transaction: {
        id: String(existingTx._id),
        type: "sponsoring",
        priceHT: existingTx.priceHT,
        vatAmount,
        priceTTC,
        currency: existingTx.currency || "DT",
        status: existingTx.status === "paid_simulated" ? "paid" : existingTx.status,
        invoiceNumber: existingTx.invoiceNumber,
        paidAt: existingTx.paidAt ? new Date(existingTx.paidAt).toISOString() : null,
      },
    };
  }

  // Guards
  const sponsoring = await SponsoringModel.findOne({ _id: sponsoringId, companyId }).lean();
  if (!sponsoring) throw new NotFoundError("Sponsoring");
  if ((sponsoring as any).status !== "confirmed") {
    throw new BusinessRuleError(
      "SPONSORING_NOT_CONFIRMED",
      "Seules les demandes validées par l'admin peuvent être payées.",
    );
  }

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Entreprise");

  const profileKind = (sponsoring as any).profileKind;

  // Generate invoice number before session
  const invoiceNumber = await generateInvoiceNumber();

  // Atomic: Transaction + Sponsoring update
  const session = await mongoose.startSession();
  let result: CheckoutSponsoringResult;

  try {
    session.startTransaction();

    const now = new Date();
    const to = new Date(now.getTime() + SPONSORING_DURATION_DAYS * 86_400_000);

    // Create Transaction
    const [txDoc] = await TransactionModel.create(
      [{
        companyId,
        type: "sponsoring",
        profileKind,
        priceHT: SPONSORING_PRICE_HT,
        vatRate: DEFAULT_VAT_RATE,
        currency: "DT",
        status: "pending",
        paymentMethod: null,
        paymentReference: null,
        paidAt: null,
        invoiceNumber,
        idempotencyKey,
        refId: sponsoringId,
      }],
      { session },
    );

    // Process payment
    const checkout = await payment.createCheckout({
      companyId,
      type: "sponsoring",
      profileKind,
      priceHT: SPONSORING_PRICE_HT,
      vatRate: DEFAULT_VAT_RATE,
      idempotencyKey,
    });

    // Update transaction
    txDoc.status = checkout.status;
    txDoc.paymentMethod = checkout.paymentMethod;
    txDoc.paymentReference = checkout.reference;
    txDoc.paidAt = checkout.paidAt ? new Date(checkout.paidAt) : null;
    await txDoc.save({ session });

    // Activate sponsoring
    await SponsoringModel.updateOne(
      { _id: sponsoringId },
      {
        $set: {
          status: "active",
          from: now,
          to,
          transactionId: txDoc._id,
          paidAt: checkout.paidAt ? new Date(checkout.paidAt) : now,
        },
      },
      { session },
    );

    await session.commitTransaction();

    const { vatAmount, priceTTC } = computeTTC(SPONSORING_PRICE_HT, DEFAULT_VAT_RATE);
    result = {
      sponsoring: {
        id: String(sponsoringId),
        profileKind,
        from: now.toISOString(),
        to: to.toISOString(),
        status: "active",
      },
      transaction: {
        id: String(txDoc._id),
        type: "sponsoring",
        priceHT: SPONSORING_PRICE_HT,
        vatAmount,
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

  // Post-commit notifications (non-blocking)
  const { priceTTC: ttc } = computeTTC(SPONSORING_PRICE_HT, DEFAULT_VAT_RATE);
  const companyName = (company as any).data?.displayName?.fr || "Entreprise";

  // Owner notification
  const ownerUserId = String((company as any).ownerUserId);
  createNotification({
    recipientType: "owner",
    recipientId: ownerUserId,
    kind: "sponsoring_paid",
    icon: "campaign",
    color: "success",
    title: { fr: `Campagne ${kindLabel(profileKind)} lancée` },
    body: { fr: `Votre campagne sponsorisée ${kindLabel(profileKind)} est active pour ${SPONSORING_DURATION_DAYS} jours. Montant : ${formatMoney(ttc)} DT TTC.` },
    actionUrl: "/dashboard/sponsoring",
    actionLabel: { fr: "Voir ma campagne" },
  }).catch((err) => console.error("[sponsoring] owner paid notification failed:", err));

  // Admin notification + email
  const adminUser = await AdminUserModel.findOne({}).lean();
  if (adminUser) {
    createNotification({
      recipientType: "admin",
      recipientId: String((adminUser as any)._id),
      kind: "sponsoring_paid",
      icon: "campaign",
      color: "success",
      title: { fr: `Paiement sponsoring — ${companyName}` },
      body: { fr: `${companyName} a payé une campagne ${kindLabel(profileKind)}. Montant : ${formatMoney(ttc)} DT TTC.` },
      actionUrl: "/admin/transactions",
      actionLabel: { fr: "Voir" },
    }).catch((err) => console.error("[sponsoring] admin paid notification failed:", err));
  }

  sendTransactionAdminEmail({
    adminEmail: env.ADMIN_NOTIFICATION_EMAIL,
    companyName,
    type: "sponsoring",
    amountTTC: formatMoney(ttc),
    invoiceNumber: result.transaction.invoiceNumber,
  }).catch((err) => console.error("[sponsoring] admin paid email failed:", err));

  return result;
}

// ---------------------------------------------------------------------------
// expireStaleSponsorings — lazy cleanup (called from getMe)
// ---------------------------------------------------------------------------

export async function expireStaleSponsorings(): Promise<number> {
  const result = await SponsoringModel.updateMany(
    { status: "active", to: { $lt: new Date() } },
    { $set: { status: "expired" } },
  );
  return result.modifiedCount ?? 0;
}

// ---------------------------------------------------------------------------
// getActiveSponsoringForKind — random selection for public banner
// ---------------------------------------------------------------------------

export interface SponsorBannerData {
  id: string;
  bannerUrl: string;
  linkUrl: string;
  companyName: string;
}

export async function getActiveSponsoringForKind(
  profileKind: "brandup" | "traceup" | "linkup",
): Promise<SponsorBannerData | null> {
  const all = await getActiveSponsoringsForKind(profileKind);
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)]!;
}

/**
 * Return ALL active sponsorings for a given engine (shuffled server-side).
 * Used by the carousel banner component.
 */
export async function getActiveSponsoringsForKind(
  profileKind: "brandup" | "traceup" | "linkup",
): Promise<SponsorBannerData[]> {
  await connectDb();

  const now = new Date();
  const actives = await SponsoringModel.find({
    profileKind,
    status: "active",
    to: { $gte: now },
  })
    .select("_id bannerUrl linkUrl companyId")
    .lean();

  if (actives.length === 0) return [];

  // Batch-resolve company names (avoid N+1)
  const companyIds = Array.from(new Set((actives as any[]).map((a) => String(a.companyId))));
  const companies = await CompanyModel.find({ _id: { $in: companyIds } })
    .select("_id data.displayName")
    .lean();
  const nameMap = new Map(
    (companies as any[]).map((c) => [String(c._id), c.data?.displayName?.fr || "Entreprise"]),
  );

  // Fisher-Yates shuffle
  const result: SponsorBannerData[] = (actives as any[]).map((a) => ({
    id: String(a._id),
    bannerUrl: a.bannerUrl,
    linkUrl: a.linkUrl,
    companyName: nameMap.get(String(a.companyId)) || "Entreprise",
  }));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

// ---------------------------------------------------------------------------
// incSponsoringImpressions — $inc fail-silent (called from search pages SSR)
// ---------------------------------------------------------------------------

export async function incSponsoringImpressions(sponsoringId: string): Promise<void> {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await SponsoringModel.updateOne(
      { _id: sponsoringId },
      {
        $inc: { impressions: 1 },
        $push: {
          daily: {
            $each: [],
          },
        },
      },
    );

    // Upsert daily entry
    const hasTodayEntry = await SponsoringModel.findOne({
      _id: sponsoringId,
      "daily.date": today,
    }).lean();

    if (hasTodayEntry) {
      await SponsoringModel.updateOne(
        { _id: sponsoringId, "daily.date": today },
        { $inc: { "daily.$.impressions": 1 } },
      );
    } else {
      await SponsoringModel.updateOne(
        { _id: sponsoringId },
        { $push: { daily: { date: today, impressions: 1, clicks: 0 } } },
      );
    }
  } catch {
    // fail-silent
  }
}

// ---------------------------------------------------------------------------
// incSponsoringClicks — $inc fail-silent (called from track endpoint)
// ---------------------------------------------------------------------------

export async function incSponsoringClicks(sponsoringId: string): Promise<void> {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await SponsoringModel.updateOne(
      { _id: sponsoringId },
      { $inc: { clicks: 1 } },
    );

    const hasTodayEntry = await SponsoringModel.findOne({
      _id: sponsoringId,
      "daily.date": today,
    }).lean();

    if (hasTodayEntry) {
      await SponsoringModel.updateOne(
        { _id: sponsoringId, "daily.date": today },
        { $inc: { "daily.$.clicks": 1 } },
      );
    } else {
      await SponsoringModel.updateOne(
        { _id: sponsoringId },
        { $push: { daily: { date: today, impressions: 0, clicks: 1 } } },
      );
    }
  } catch {
    // fail-silent
  }
}

// ---------------------------------------------------------------------------
// getSponsoringDashboard — owner dashboard state + history
// ---------------------------------------------------------------------------

export interface SponsoringCardData {
  profileKind: "brandup" | "traceup" | "linkup";
  profileExists: boolean;
  profileStatus: string | null;
  isPublic: boolean;
  current: {
    id: string;
    status: string;
    bannerUrl: string;
    linkUrl: string;
    from: string | null;
    to: string | null;
    paidAt: string | null;
    confirmedAt: string | null;
    rejectionReason: string | null;
    impressions: number;
    clicks: number;
    createdAt: string;
  } | null;
}

export interface SponsoringHistoryItem {
  id: string;
  profileKind: "brandup" | "traceup" | "linkup";
  status: string;
  bannerUrl: string;
  from: string | null;
  to: string | null;
  priceTTC: number | null;
  currency: string;
  impressions: number;
  clicks: number;
  createdAt: string;
}

export interface SponsoringDashboardData {
  cards: SponsoringCardData[];
  history: SponsoringHistoryItem[];
}

export async function getSponsoringDashboard(
  companyId: string,
): Promise<SponsoringDashboardData> {
  await connectDb();

  const profiles = await ProfileModel.find({ companyId }).lean();
  const allSponsorings = await SponsoringModel.find({ companyId }).sort({ createdAt: -1 }).lean();

  const kinds = ["brandup", "traceup", "linkup"] as const;

  const cards: SponsoringCardData[] = kinds.map((kind) => {
    const profile = (profiles as any[]).find((p) => p.kind === kind);
    const current = (allSponsorings as any[]).find(
      (s) => s.profileKind === kind && ["pending", "confirmed", "active"].includes(s.status),
    );

    return {
      profileKind: kind,
      profileExists: !!profile,
      profileStatus: profile?.status ?? null,
      isPublic: profile?.isPublic ?? false,
      current: current
        ? {
            id: String(current._id),
            status: current.status,
            bannerUrl: current.bannerUrl,
            linkUrl: current.linkUrl,
            from: current.from ? new Date(current.from).toISOString() : null,
            to: current.to ? new Date(current.to).toISOString() : null,
            paidAt: current.paidAt ? new Date(current.paidAt).toISOString() : null,
            confirmedAt: current.confirmedAt ? new Date(current.confirmedAt).toISOString() : null,
            rejectionReason: current.rejectionReason ?? null,
            impressions: current.impressions ?? 0,
            clicks: current.clicks ?? 0,
            createdAt: new Date(current.createdAt).toISOString(),
          }
        : null,
    };
  });

  // History: all non-current (expired, rejected, cancelled)
  const history: SponsoringHistoryItem[] = (allSponsorings as any[])
    .filter((s) => ["expired", "rejected", "cancelled"].includes(s.status))
    .map((s) => {
      let priceTTC: number | null = null;
      if (s.paidAt) {
        const { priceTTC: ttc } = computeTTC(SPONSORING_PRICE_HT, DEFAULT_VAT_RATE);
        priceTTC = ttc;
      }
      return {
        id: String(s._id),
        profileKind: s.profileKind,
        status: s.status,
        bannerUrl: s.bannerUrl,
        from: s.from ? new Date(s.from).toISOString() : null,
        to: s.to ? new Date(s.to).toISOString() : null,
        priceTTC,
        currency: "DT",
        impressions: s.impressions ?? 0,
        clicks: s.clicks ?? 0,
        createdAt: new Date(s.createdAt).toISOString(),
      };
    });

  return { cards, history };
}

// ---------------------------------------------------------------------------
// listPendingSponsorings — admin: list pending for validation hub
// ---------------------------------------------------------------------------

export interface PendingSponsoringItem {
  id: string;
  companyId: string;
  companyName: string;
  profileKind: string;
  bannerUrl: string;
  linkUrl: string;
  createdAt: string;
}

export async function listPendingSponsorings(): Promise<PendingSponsoringItem[]> {
  await connectDb();

  const docs = await SponsoringModel.find({ status: "pending" }).sort({ createdAt: 1 }).lean();

  if (docs.length === 0) return [];

  const companyIds = Array.from(new Set((docs as any[]).map((d) => String(d.companyId))));
  const companies = await CompanyModel.find({ _id: { $in: companyIds } })
    .select("_id data.displayName")
    .lean();
  const companyMap = new Map(
    (companies as any[]).map((c) => [String(c._id), c.data?.displayName?.fr || "Entreprise"]),
  );

  return (docs as any[]).map((d) => ({
    id: String(d._id),
    companyId: String(d.companyId),
    companyName: companyMap.get(String(d.companyId)) || "Entreprise",
    profileKind: d.profileKind,
    bannerUrl: d.bannerUrl,
    linkUrl: d.linkUrl,
    createdAt: new Date(d.createdAt).toISOString(),
  }));
}

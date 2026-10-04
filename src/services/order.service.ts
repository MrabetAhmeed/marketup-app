/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { AppError, BusinessRuleError } from "@/lib/api-error";
import { connectDb } from "@/lib/db";
import { sendTransactionAdminEmail } from "@/lib/email/sender";
import { env } from "@/lib/env";
import { getPaymentAdapter } from "@/lib/payment";
import { ACTIVATION_PENDING_REASON_LABELS } from "@/lib/payment/order-labels";
import { computeTTC, dtToMillimes, formatMoney } from "@/lib/pricing";
import { AdminUser } from "@/models/admin-user.model";
import { Boost } from "@/models/boost.model";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { Transaction } from "@/models/transaction.model";
import { createNotification } from "@/services/notifications.service";
import type { VerifyPaymentResult } from "@/lib/payment";
import type { ActivationPendingReason } from "@/lib/payment/order-labels";

// ---------------------------------------------------------------------------
// Orders — two-step payment (V1.2 F3)
//
//   checkout  → order created `pending`, committed, THEN the operator is called
//   return / webhook / next checkout → confirmOrder(), the single confirmation
//
// Only the server-side verification with the operator decides (P1). A cashed
// payment is never lost (P2): any anomaly ends as `paid` + activation pending.
// Return and webhook are concurrent (P3): the transition to `paid` is
// conditional, the loser does nothing.
// ---------------------------------------------------------------------------

const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const ProfileModel = Profile as any;
const CompanyModel = Company as any;
const AdminUserModel = AdminUser as any;

/**
 * Minimum delay between two verifications of the same order triggered by a
 * browser (return page refresh, repeated click). The operator warns that
 * successive calls lead to rate limiting and IP bans; 10 s is longer than any
 * refresh burst and short enough to stay invisible to a buyer who waits.
 * The webhook is never throttled: it is the operator telling us to look.
 */
export const VERIFY_MIN_INTERVAL_MS = 10_000;

const DUPLICATE_KEY_CODE = 11000;

/** A pending order with no payment id older than this was never sent to the operator. */
const ORPHAN_ORDER_AFTER_MS = 2 * 60_000;

export type OrderOutcome = "paid" | "activation_pending" | "pending" | "failed" | "expired" | "not_found";

export type ConfirmTrigger = "return" | "webhook" | "checkout" | "account_delete";

export interface ConfirmOrderResult {
  outcome: OrderOutcome;
  /** True when this call moved the order to another state. */
  changed: boolean;
}

const KIND_LABELS: Record<string, string> = { brandup: "BrandUP", traceup: "TraceUP", linkup: "LinkUP" };

function appBaseUrl(): string {
  return env.NEXTAUTH_URL.replace(/\/+$/, "");
}

/** Dashboard page that shows the outcome of an order (relative: the client navigates to it). */
export function orderResultPath(orderId: string): string {
  return `/dashboard/commandes?commande=${orderId}`;
}

export function orderResultUrl(orderId: string): string {
  return `${appBaseUrl()}${orderResultPath(orderId)}`;
}

function outcomeOf(order: { status: string; activationPending?: boolean }): OrderOutcome {
  if (order.status === "paid" || order.status === "paid_simulated" || order.status === "refunded") {
    return order.activationPending ? "activation_pending" : "paid";
  }
  if (order.status === "failed") return "failed";
  if (order.status === "expired") return "expired";
  return "pending";
}

/**
 * The payment method is informative: whatever the operator reports, it must
 * never prevent a paid order from being recorded. Anything the model does not
 * know is stored as null.
 */
const STORABLE_PAYMENT_METHODS = new Set(["card", "wallet", "simulated"]);

function storablePaymentMethod(method: unknown): string | null {
  return typeof method === "string" && STORABLE_PAYMENT_METHODS.has(method) ? method : null;
}

function expectedAmountMillimes(order: { priceHT: number; vatRate: number; fiscalStampDT?: number }): number {
  return dtToMillimes(computeTTC(order.priceHT, order.vatRate, order.fiscalStampDT ?? 0).priceTTC);
}

/** An order with no creation date is treated as recent: never released by guesswork. */
function isRecentOrder(order: { createdAt?: Date | string }): boolean {
  if (!order.createdAt) return true;
  return Date.now() - new Date(order.createdAt).getTime() < ORPHAN_ORDER_AFTER_MS;
}

/** Orders are looked up by our own id, soft-deleted ones included (account deleted after payment). */
async function loadOrder(orderId: string): Promise<any | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  return TransactionModel.findOne({ _id: orderId }).setOptions({ withDeleted: true }).lean();
}

// ---------------------------------------------------------------------------
// Checkout side — create the order, then call the operator
// ---------------------------------------------------------------------------

export interface NewOrderSpec {
  companyId: string;
  type: "boost" | "sponsoring";
  profileKind: "brandup" | "traceup" | "linkup";
  refId?: string;
  priceHT: number;
  vatRate: number;
  fiscalStampDT: number;
  durationDays: number;
  invoiceNumber: string;
  idempotencyKey: string;
}

export interface CheckoutOrderResult {
  orderId: string;
  /** Where the buyer must go next: the operator's payment page, or our result page. */
  redirectUrl: string;
}

/** Same idempotency key from the same company: hand back the same order, never a second one. */
export async function findOrderByIdempotencyKey(
  companyId: string,
  type: "boost" | "sponsoring",
  idempotencyKey: string,
): Promise<CheckoutOrderResult | null> {
  const existing = await TransactionModel.findOne({ companyId, type, idempotencyKey }).lean();
  if (!existing) return null;
  const orderId = String(existing._id);
  const resumable = existing.status === "pending" && typeof existing.redirectUrl === "string";
  return { orderId, redirectUrl: resumable ? existing.redirectUrl : orderResultPath(orderId) };
}

/**
 * A pending order already exists for this service (F3 arbitration, point 4):
 * verify it once with the operator, then resume it or release the slot.
 *
 * Returns where to send the buyer, or null when the old order was released
 * (expired, failed) and a new one can be created.
 */
export async function resumeOrReleasePendingOrder(
  filter: Record<string, unknown>,
  conflict: { code: string; message: string },
): Promise<CheckoutOrderResult | null> {
  const pending = await TransactionModel.findOne({ ...filter, status: "pending" }).lean();
  if (!pending) return null;
  const orderId = String(pending._id);

  if (!pending.externalPaymentId) {
    // The operator was never reached for this order. Recent: another request is
    // still creating the payment. Old: the request died in between — release it.
    if (isRecentOrder(pending)) {
      throw new AppError(conflict.code, conflict.message, 409);
    }
    await TransactionModel.updateOne(
      { _id: pending._id, status: "pending" },
      { $set: { status: "failed", failureReason: "payment_never_created" } },
    );
    return null;
  }

  let result: ConfirmOrderResult;
  try {
    result = await confirmOrder(orderId, { trigger: "checkout" });
  } catch (err) {
    console.error("[order] verification of the pending order failed:", err instanceof Error ? err.message : err);
    throw new AppError(
      "PAYMENT_VERIFICATION_UNAVAILABLE",
      "Un paiement est en cours pour ce service et sa vérification est momentanément impossible. Réessayez dans quelques instants.",
      409,
    );
  }

  if (result.outcome === "failed" || result.outcome === "expired") return null;
  if (result.outcome === "pending") {
    return { orderId, redirectUrl: pending.redirectUrl ?? orderResultPath(orderId) };
  }
  return { orderId, redirectUrl: orderResultPath(orderId) };
}

/**
 * Creates the order `pending` and commits it, then calls the operator outside
 * any database transaction (A1, A2). On operator failure the order becomes
 * `failed` with its cause, which frees the uniqueness slot (A4).
 */
export async function createOrderAndStartPayment(
  spec: NewOrderSpec,
  conflict: { code: string; message: string },
): Promise<CheckoutOrderResult> {
  const adapter = getPaymentAdapter();

  let order: any;
  try {
    order = await TransactionModel.create({
      companyId: spec.companyId,
      type: spec.type,
      profileKind: spec.profileKind,
      refId: spec.refId ?? null,
      priceHT: spec.priceHT,
      vatRate: spec.vatRate,
      fiscalStampDT: spec.fiscalStampDT,
      currency: "DT",
      status: "pending",
      invoiceNumber: spec.invoiceNumber,
      idempotencyKey: spec.idempotencyKey,
      durationDays: spec.durationDays,
      adapterEnvironment: adapter.describe().environment,
    });
  } catch (err) {
    // Simultaneous clicks: the unique partial index on pending orders refuses the second one.
    if ((err as { code?: number }).code === DUPLICATE_KEY_CODE) {
      throw new AppError(conflict.code, conflict.message, 409);
    }
    throw err;
  }

  const orderId = String(order._id);
  const base = appBaseUrl();
  // Our order id travels in the three links: the routes never depend on what the operator adds.
  const webhookSecret = env.PAYMENT_WEBHOOK_SECRET ?? "unset";

  try {
    const { externalId, redirectUrl } = await adapter.createPayment({
      orderId,
      amountMillimes: expectedAmountMillimes(spec),
      successUrl: `${base}/api/v1/payments/return?order=${orderId}&result=success`,
      failUrl: `${base}/api/v1/payments/return?order=${orderId}&result=fail`,
      // Order id in the path, no query string: the operator appends its own
      // "?payment_id=…" and would corrupt a parameter of ours (F3.1).
      webhookUrl: `${base}/api/v1/webhooks/payment/${webhookSecret}/${orderId}`,
      acceptedMethods: env.PAYMENT_ACCEPTED_METHODS,
      sessionTimeoutSeconds: env.PAYMENT_SESSION_TIMEOUT_SECONDS,
    });

    await TransactionModel.updateOne(
      { _id: order._id },
      { $set: { externalPaymentId: externalId, redirectUrl } },
    );
    return { orderId, redirectUrl };
  } catch (err) {
    const cause = err instanceof Error ? err.message : "unknown error";
    console.error(`[order] payment creation failed for order ${orderId}: ${cause}`);
    await TransactionModel.updateOne(
      { _id: order._id, status: "pending" },
      { $set: { status: "failed", failureReason: `payment_creation_failed: ${cause}`.slice(0, 500) } },
    );
    throw new AppError(
      "PAYMENT_PROVIDER_UNAVAILABLE",
      "Le service de paiement est momentanément indisponible. Aucun montant n'a été débité. Réessayez dans quelques instants.",
      502,
    );
  }
}

// ---------------------------------------------------------------------------
// confirmOrder — the single confirmation service (B1)
// ---------------------------------------------------------------------------

/**
 * Called by the return route, the webhook, the next checkout and the account
 * deletion. Idempotent. Throws only when the operator cannot be reached — the
 * order is then left untouched.
 */
export async function confirmOrder(
  orderId: string,
  { trigger }: { trigger: ConfirmTrigger },
): Promise<ConfirmOrderResult> {
  await connectDb();

  const order = await loadOrder(orderId);
  if (!order) return { outcome: "not_found", changed: false };

  // B3 — already settled: nothing to do
  if (order.status === "paid" || order.status === "paid_simulated" || order.status === "refunded") {
    console.info(`[order] ${orderId} already paid — nothing to do (trigger=${trigger})`);
    return { outcome: outcomeOf(order), changed: false };
  }
  if (order.status === "failed") return { outcome: "failed", changed: false };

  // pending or expired from here. No payment id: the operator was never reached.
  if (!order.externalPaymentId) return { outcome: outcomeOf(order), changed: false };

  // Throttle browser-triggered verifications; the claim is atomic.
  const now = new Date();
  const throttled = trigger === "return" || trigger === "checkout";
  const claim = await TransactionModel.updateOne(
    throttled
      ? {
          _id: order._id,
          $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lte: new Date(now.getTime() - VERIFY_MIN_INTERVAL_MS) } }],
        }
      : { _id: order._id },
    { $set: { lastVerifiedAt: now } },
  );
  if (throttled && claim.modifiedCount === 0) {
    console.info(`[order] ${orderId} verified less than ${VERIFY_MIN_INTERVAL_MS / 1000}s ago — skipped (trigger=${trigger})`);
    // Another trigger may be settling it right now: report the current state, not the one read above.
    const current = await loadOrder(orderId);
    return { outcome: current ? outcomeOf(current) : "not_found", changed: false };
  }

  // B4 — the operator always decides
  const verification = await getPaymentAdapter().verifyPayment(order.externalPaymentId);

  switch (verification.status) {
    case "success":
      return settlePaidOrder(order, verification, trigger);

    case "expired": {
      const res = await TransactionModel.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "expired" } },
      );
      return { outcome: "expired", changed: res.modifiedCount === 1 };
    }

    case "failure":
    case "system_failure": {
      const res = await TransactionModel.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "failed", failureReason: `payment_${verification.status}` } },
      );
      if (res.modifiedCount === 1) return { outcome: "failed", changed: true };
      // An expired order stays expired when the operator reports a failure
      return { outcome: outcomeOf(order), changed: false };
    }

    case "preauth_success":
      // Funds are only reserved, nothing is captured (Flouci docs): not a payment.
      // We never ask for a pre-authorization, so this is logged as an anomaly.
      console.warn(`[order] ${orderId} reported as pre-authorized — no funds captured, order left unchanged`);
      return { outcome: outcomeOf(order), changed: false };

    case "pending":
    default:
      return { outcome: outcomeOf(order), changed: false };
  }
}

/** Why a paid order cannot be activated, read inside the settlement transaction. Null = activable. */
async function findActivationBlocker(
  order: any,
  verification: VerifyPaymentResult,
  session: mongoose.ClientSession,
  now: Date,
): Promise<ActivationPendingReason | null> {
  if (verification.amountMillimes !== expectedAmountMillimes(order)) return "amount_mismatch";

  const company = await CompanyModel.findOne({ _id: order.companyId })
    .setOptions({ withDeleted: true })
    .session(session)
    .lean();
  if (order.deletedAt || !company || company.deletedAt || company.status === "deleted") return "account_deleted";
  if (company.status !== "active") return "company_suspended";

  const profile = await ProfileModel.findOne({ companyId: order.companyId, kind: order.profileKind })
    .session(session)
    .lean();
  if (!profile || profile.deletedAt || profile.status !== "active" || !profile.isPublic) return "profile_ineligible";

  if (order.type === "boost") {
    const activeBoost = await BoostModel.findOne({
      companyId: order.companyId,
      profileKind: order.profileKind,
      status: "active",
      to: { $gte: now },
    })
      .session(session)
      .lean();
    return activeBoost ? "service_already_active" : null;
  }

  const campaign = await SponsoringModel.findOne({ _id: order.refId }).session(session).lean();
  return !campaign || campaign.status !== "confirmed" ? "service_already_active" : null;
}

interface Settlement {
  won: boolean;
  reason: ActivationPendingReason | null;
}

/**
 * B6–B8: the transition to `paid` and the activation happen in one database
 * transaction, replayed by the session on a transient error. On this path a
 * write conflict is NOT a double purchase — it is the concurrent return/webhook,
 * and the replay finds the order already paid.
 */
async function settlePaidOrder(
  order: any,
  verification: VerifyPaymentResult,
  trigger: ConfirmTrigger,
): Promise<ConfirmOrderResult> {
  const orderId = String(order._id);
  const paidStatus = getPaymentAdapter().describe().name === "simulated" ? "paid_simulated" : "paid";
  let settlement: Settlement = { won: false, reason: null };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();

      // Conditional transition: only from pending or expired. The loser stops here.
      const transition = await TransactionModel.updateOne(
        { _id: order._id, status: { $in: ["pending", "expired"] } },
        {
          $set: {
            status: paidStatus,
            paidAt: now,
            paymentMethod: storablePaymentMethod(verification.method),
            paymentReference: order.externalPaymentId,
          },
        },
        { session },
      );
      if (transition.modifiedCount !== 1) {
        settlement = { won: false, reason: null };
        return;
      }

      const reason = await findActivationBlocker(order, verification, session, now);
      if (reason) {
        await TransactionModel.updateOne(
          { _id: order._id },
          { $set: { activationPending: true, activationPendingReason: reason } },
          { session },
        );
      } else {
        const durationDays = order.durationDays ?? (order.type === "boost" ? 30 : 7);
        const to = new Date(now.getTime() + durationDays * 86_400_000);
        if (order.type === "boost") {
          await BoostModel.create(
            [{ companyId: order.companyId, profileKind: order.profileKind, from: now, to, transactionId: order._id, status: "active" }],
            { session },
          );
        } else {
          await SponsoringModel.updateOne(
            { _id: order.refId },
            { $set: { status: "active", from: now, to, transactionId: order._id, paidAt: now } },
            { session },
          );
        }
      }
      settlement = { won: true, reason };
    });
  } finally {
    await session.endSession();
  }

  const fresh = await loadOrder(orderId);
  const outcome = fresh ? outcomeOf(fresh) : "not_found";

  if (!settlement.won) {
    console.info(`[order] ${orderId} already settled by a concurrent confirmation — nothing to do (trigger=${trigger})`);
    return { outcome, changed: false };
  }

  console.info(
    `[order] ${orderId} paid (trigger=${trigger}, activation=${settlement.reason ? `pending:${settlement.reason}` : "done"})`,
  );
  await notifySettlement(order, settlement.reason, order.status === "expired").catch((err) =>
    console.error("[order] settlement notifications failed:", err),
  );
  return { outcome, changed: true };
}

// ---------------------------------------------------------------------------
// Notifications (after commit, never blocking)
// ---------------------------------------------------------------------------

async function notifySettlement(
  order: any,
  reason: ActivationPendingReason | null,
  paidAfterExpiry: boolean,
): Promise<void> {
  const company = await CompanyModel.findOne({ _id: order.companyId }).setOptions({ withDeleted: true }).lean();
  const companyName = company?.data?.displayName?.fr || "Entreprise";
  const ownerUserId = company?.ownerUserId ? String(company.ownerUserId) : null;
  const adminUser = await AdminUserModel.findOne({}).lean();
  const adminId = adminUser ? String(adminUser._id) : null;

  const kind = KIND_LABELS[order.profileKind] ?? "";
  const service = order.type === "boost" ? `boost ${kind}` : `campagne sponsorisée ${kind}`;
  const ttc = formatMoney(computeTTC(order.priceHT, order.vatRate, order.fiscalStampDT ?? 0).priceTTC);
  const days = order.durationDays ?? (order.type === "boost" ? 30 : 7);
  const fail = (who: string) => (err: unknown) => console.error(`[order] ${who} notification failed:`, err);

  if (reason) {
    const cause = ACTIVATION_PENDING_REASON_LABELS[reason];
    if (ownerUserId) {
      await createNotification({
        recipientType: "owner",
        recipientId: ownerUserId,
        kind: "order_activation_pending",
        icon: "hourglass_top",
        color: "warning",
        title: { fr: "Paiement reçu — activation en attente" },
        body: { fr: `Votre paiement de ${ttc} DT TTC pour votre ${service} est bien reçu, mais le service n'a pas pu être activé : ${cause}. Notre équipe vous contactera.` },
        actionUrl: "/dashboard/commandes",
        actionLabel: { fr: "Voir mes commandes" },
      }).catch(fail("owner"));
    }
    if (adminId) {
      await createNotification({
        recipientType: "admin",
        recipientId: adminId,
        kind: "order_activation_pending",
        icon: "hourglass_top",
        color: "warning",
        title: { fr: `Commande payée, activation en attente — ${companyName}` },
        body: { fr: `${companyName} a payé ${ttc} DT TTC pour un ${service} (commande ${order.invoiceNumber ?? "—"}), non activé : ${cause}.` },
        actionUrl: "/admin/transactions",
        actionLabel: { fr: "Voir les commandes" },
      }).catch(fail("admin"));
    }
  } else {
    const paidKind = order.type === "boost" ? "boost_paid" : "sponsoring_paid";
    if (ownerUserId) {
      await createNotification({
        recipientType: "owner",
        recipientId: ownerUserId,
        kind: paidKind,
        icon: order.type === "boost" ? "trending_up" : "campaign",
        color: "success",
        title: { fr: order.type === "boost" ? `Boost ${kind} activé` : `Campagne ${kind} lancée` },
        body: { fr: `Votre ${service} est actif pour ${days} jours. Montant : ${ttc} DT TTC.` },
        actionUrl: order.type === "boost" ? "/dashboard/boost" : "/dashboard/sponsoring",
        actionLabel: { fr: order.type === "boost" ? "Voir mes boosts" : "Voir ma campagne" },
      }).catch(fail("owner"));
    }
    if (adminId) {
      await createNotification({
        recipientType: "admin",
        recipientId: adminId,
        kind: paidKind,
        icon: order.type === "boost" ? "trending_up" : "campaign",
        color: "success",
        title: { fr: order.type === "boost" ? `Nouveau boost — ${companyName}` : `Paiement sponsoring — ${companyName}` },
        body: { fr: `${companyName} a payé un ${service}. Montant : ${ttc} DT TTC.` },
        actionUrl: "/admin/transactions",
        actionLabel: { fr: "Voir les commandes" },
      }).catch(fail("admin"));
    }
    sendTransactionAdminEmail({
      adminEmail: env.ADMIN_NOTIFICATION_EMAIL,
      companyName,
      type: order.type,
      amountTTC: ttc,
      invoiceNumber: order.invoiceNumber,
    }).catch((err) => console.error("[order] admin email failed:", err));
  }

  if (paidAfterExpiry && adminId) {
    await createNotification({
      recipientType: "admin",
      recipientId: adminId,
      kind: "order_paid_after_expiry",
      icon: "warning",
      color: "warning",
      title: { fr: `Anomalie — paiement confirmé après expiration (${companyName})` },
      body: { fr: `La commande ${order.invoiceNumber ?? "—"} de ${companyName} était expirée quand son paiement de ${ttc} DT TTC a été confirmé.` },
      actionUrl: "/admin/transactions",
      actionLabel: { fr: "Voir les commandes" },
    }).catch(fail("admin anomaly"));
  }
}

// ---------------------------------------------------------------------------
// Preventive locks (D1, D2)
// ---------------------------------------------------------------------------

/** D1 — a campaign with a pending order cannot be cancelled by its owner. */
export async function assertNoPendingOrderForCampaign(companyId: string, sponsoringId: string): Promise<void> {
  const pending = await TransactionModel.exists({ companyId, type: "sponsoring", refId: sponsoringId, status: "pending" });
  if (pending) {
    throw new BusinessRuleError(
      "SPONSORING_PAYMENT_IN_PROGRESS",
      "Un paiement est en cours pour cette campagne : elle ne peut pas être annulée pour le moment.",
    );
  }
}

/**
 * D2 — account deletion. Pending orders are verified first: expired or failed
 * ones no longer block. A still-pending order, or a paid order waiting for its
 * activation, refuses the deletion.
 */
export async function assertAccountCanBeDeleted(companyId: string): Promise<void> {
  const stillPending = new BusinessRuleError(
    "ACCOUNT_DELETE_PAYMENT_PENDING",
    "Un paiement est en cours sur votre compte. Terminez-le ou réessayez dans quelques minutes avant de supprimer votre compte.",
  );

  const pendingOrders = await TransactionModel.find({ companyId, status: "pending" }).lean();
  for (const order of pendingOrders) {
    if (!order.externalPaymentId) {
      if (isRecentOrder(order)) throw stillPending;
      await TransactionModel.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "failed", failureReason: "payment_never_created" } },
      );
      continue;
    }
    let result: ConfirmOrderResult;
    try {
      result = await confirmOrder(String(order._id), { trigger: "account_delete" });
    } catch (err) {
      console.error("[order] verification before account deletion failed:", err instanceof Error ? err.message : err);
      throw stillPending;
    }
    if (result.outcome === "pending") throw stillPending;
  }

  const waiting = await TransactionModel.exists({ companyId, activationPending: true });
  if (waiting) {
    throw new BusinessRuleError(
      "ACCOUNT_DELETE_ACTIVATION_PENDING",
      "Une commande payée est en attente d'activation. Contactez le support avant de supprimer votre compte.",
    );
  }
}

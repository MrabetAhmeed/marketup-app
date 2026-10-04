/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { GET as paymentReturn } from "@/app/api/v1/payments/return/route";
import { GET as paymentWebhook } from "@/app/api/v1/webhooks/payment/[secret]/[orderId]/route";
import { FlouciPaymentAdapter } from "@/lib/payment/flouci";
import { orderOutcomeBanner } from "@/lib/payment/order-labels";
import { SimulatedPaymentAdapter } from "@/lib/payment/simulated";
import { AdminUser } from "@/models/admin-user.model";
import { Boost } from "@/models/boost.model";
import { Company } from "@/models/company.model";
import { Notification } from "@/models/notification.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { Transaction } from "@/models/transaction.model";
import { checkoutBoost } from "@/services/boost.service";
import {
  VERIFY_MIN_INTERVAL_MS,
  assertAccountCanBeDeleted,
  confirmOrder,
} from "@/services/order.service";
import { cancelSponsoring, checkoutSponsoring } from "@/services/sponsoring.service";

// ---------------------------------------------------------------------------
// V1.2 F3 — two-step purchase. The payment operator is a controllable fake:
// no network call is ever made.
// ---------------------------------------------------------------------------

const { adapter, envMock } = vi.hoisted(() => ({
  adapter: {
    createPayment: vi.fn(),
    verifyPayment: vi.fn(),
    describe: () => ({ name: "flouci", environment: "test" }),
  },
  envMock: {
    NEXTAUTH_URL: "https://app.test",
    MONETIZATION_ENABLED: true,
    ADMIN_NOTIFICATION_EMAIL: "admin@test.dev",
    PAYMENT_ADAPTER: "flouci",
    PAYMENT_ACCEPTED_METHODS: ["card"],
    PAYMENT_SESSION_TIMEOUT_SECONDS: 1200,
    PAYMENT_WEBHOOK_SECRET: "w".repeat(32),
  },
}));

vi.mock("@/lib/db", () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/lib/payment", () => ({ getPaymentAdapter: () => adapter }));
vi.mock("@/lib/email/sender", () => ({
  sendTransactionAdminEmail: vi.fn().mockResolvedValue(undefined),
  sendSponsoringSubmittedEmail: vi.fn().mockResolvedValue(undefined),
  sendSponsoringValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendSponsoringRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/storage", () => ({ storage: {} }));
vi.mock("@/lib/storage/helpers", () => ({ safeDeleteByUrl: vi.fn().mockResolvedValue(undefined) }));

const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const NotificationModel = Notification as any;
const AdminUserModel = AdminUser as any;

const BOOST_TTC_MILLIMES = 1_072_000;
const SPONSORING_TTC_MILLIMES = 834_000;

let replSet: MongoMemoryReplSet;
let counter = 0;
let paymentSeq = 0;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 20_000 }] });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(() => {
  adapter.createPayment.mockReset();
  adapter.verifyPayment.mockReset();
  adapter.createPayment.mockImplementation(async () => {
    paymentSeq++;
    return { externalId: `PAY-${paymentSeq}`, redirectUrl: `https://checkout.flouci.test/pay/PAY-${paymentSeq}` };
  });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
});

// --- Helpers ---------------------------------------------------------------

async function createCompany(overrides: Record<string, unknown> = {}): Promise<any> {
  counter++;
  return CompanyModel.create({
    slug: `order-co-${counter}`,
    type: "B2B",
    legalId: `O${counter}`,
    accountEmail: `order${counter}@co.tn`,
    country: "TN",
    data: { displayName: { fr: "OrderCo", ar: "", en: "" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", address: "Addr", languages: ["fr"] },
    ownerUserId: new mongoose.Types.ObjectId(),
    status: "active",
    registeredAt: new Date(),
    validatedAt: new Date(),
    ...overrides,
  });
}

async function createProfile(companyId: mongoose.Types.ObjectId, kind = "brandup", overrides: Record<string, unknown> = {}): Promise<any> {
  return ProfileModel.create({
    companyId,
    kind,
    status: "active",
    isPublic: true,
    data: { pitch: { fr: "test", ar: "", en: "" }, about: { fr: "", ar: "", en: "" }, color: "#0078D4", links: [], gallery: [], projects: [], certifications: [], services: [] },
    publishedAt: new Date(),
    lastValidatedAt: new Date(),
    ...overrides,
  });
}

async function createAdmin(): Promise<any> {
  return AdminUserModel.create({
    email: "admin@test.dev",
    passwordHash: "x",
    firstName: "Admin",
    lastName: "Test",
    avatar: { initials: "AT", backgroundColor: "#5C2D91" },
  });
}

function verifies(status: string, amountMillimes: number | null = BOOST_TTC_MILLIMES, method: string | null = "card"): void {
  adapter.verifyPayment.mockResolvedValue({ status, amountMillimes, method, raw: {} });
}

/** A company with a public brandup profile and a pending boost order sent to the operator. */
async function pendingBoostOrder(): Promise<{ company: any; orderId: string; redirectUrl: string }> {
  const company = await createCompany();
  await createProfile(company._id);
  const { orderId, redirectUrl } = await checkoutBoost(String(company._id), "brandup", `key-${counter}-${Date.now()}`);
  return { company, orderId, redirectUrl };
}

async function order(orderId: string): Promise<any> {
  return TransactionModel.findOne({ _id: orderId }).setOptions({ withDeleted: true }).lean();
}

async function notificationsOf(kind: string): Promise<any[]> {
  await new Promise((r) => setTimeout(r, 100));
  return NotificationModel.find({ kind }).lean();
}

// ---------------------------------------------------------------------------
// Checkout — order created pending, operator called after the commit
// ---------------------------------------------------------------------------

describe("checkout — two-step", () => {
  it("creates a pending order, calls the operator with the TTC in millimes and our order id in the three links", async () => {
    const { orderId, redirectUrl } = await pendingBoostOrder();

    expect(redirectUrl).toMatch(/^https:\/\/checkout\.flouci\.test\/pay\/PAY-/);
    const params = adapter.createPayment.mock.calls[0]![0];
    expect(params.orderId).toBe(orderId);
    expect(params.amountMillimes).toBe(BOOST_TTC_MILLIMES);
    expect(params.successUrl).toBe(`https://app.test/api/v1/payments/return?order=${orderId}&result=success`);
    expect(params.failUrl).toBe(`https://app.test/api/v1/payments/return?order=${orderId}&result=fail`);
    // Order id in the path, no query string: the operator appends its own "?payment_id=…"
    expect(params.webhookUrl).toBe(`https://app.test/api/v1/webhooks/payment/${"w".repeat(32)}/${orderId}`);
    expect(params.webhookUrl).not.toContain("?");
    expect(params.acceptedMethods).toEqual(["card"]);
    expect(params.sessionTimeoutSeconds).toBe(1200);

    const doc = await order(orderId);
    expect(doc.status).toBe("pending");
    expect(doc.externalPaymentId).toMatch(/^PAY-/);
    expect(doc.redirectUrl).toBe(redirectUrl);
    expect(doc.durationDays).toBe(30);
    expect(doc.adapterEnvironment).toBe("test");
    expect(await BoostModel.countDocuments({})).toBe(0);
  });

  it("operator call fails: order failed with its cause, no service, uniqueness released", async () => {
    const company = await createCompany();
    await createProfile(company._id);
    adapter.createPayment.mockRejectedValueOnce(new Error("Flouci generate_payment: HTTP 503"));

    await expect(checkoutBoost(String(company._id), "brandup", "key-fail")).rejects.toMatchObject({
      code: "PAYMENT_PROVIDER_UNAVAILABLE",
      status: 502,
    });

    const failed = await TransactionModel.findOne({ companyId: company._id }).lean();
    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toContain("Flouci generate_payment: HTTP 503");
    expect(failed.externalPaymentId).toBeNull();
    expect(await BoostModel.countDocuments({})).toBe(0);

    // The owner can try again: the failed order no longer holds the slot
    const retry = await checkoutBoost(String(company._id), "brandup", "key-retry");
    expect(retry.redirectUrl).toMatch(/^https:\/\/checkout\.flouci\.test/);
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(2);
  });

  it("same idempotency key: same order, the operator is not called twice", async () => {
    const company = await createCompany();
    await createProfile(company._id);
    const first = await checkoutBoost(String(company._id), "brandup", "same-key");
    const second = await checkoutBoost(String(company._id), "brandup", "same-key");

    expect(second).toEqual(first);
    expect(adapter.createPayment).toHaveBeenCalledTimes(1);
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// confirmOrder — the single confirmation
// ---------------------------------------------------------------------------

describe("confirmOrder", () => {
  it("success: order paid, boost activated, owner and admin notified", async () => {
    await createAdmin();
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const result = await confirmOrder(orderId, { trigger: "return" });

    expect(result).toEqual({ outcome: "paid", changed: true });
    expect(adapter.verifyPayment).toHaveBeenCalledWith(expect.stringMatching(/^PAY-/));
    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.paidAt).toBeInstanceOf(Date);
    expect(doc.paymentMethod).toBe("card");
    expect(doc.paymentReference).toBe(doc.externalPaymentId);
    expect(doc.activationPending).toBe(false);

    const boost = await BoostModel.findOne({ companyId: company._id }).lean();
    expect(boost.status).toBe("active");
    expect(String(boost.transactionId)).toBe(orderId);
    expect(Math.round((boost.to.getTime() - boost.from.getTime()) / 86_400_000)).toBe(30);

    const notifs = await notificationsOf("boost_paid");
    expect(notifs.map((n) => n.recipientType).sort()).toEqual(["admin", "owner"]);
  });

  it("return and webhook at the same time: one single activation", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const results = await Promise.all([
      confirmOrder(orderId, { trigger: "return" }),
      confirmOrder(orderId, { trigger: "webhook" }),
    ]);

    // Exactly one of the two settles the order; the other one does nothing
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(results.find((r) => r.changed)!.outcome).toBe("paid");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
    expect((await order(orderId)).status).toBe("paid");
  });

  it("two webhooks at the same time: both verify, one single activation", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const results = await Promise.all([
      confirmOrder(orderId, { trigger: "webhook" }),
      confirmOrder(orderId, { trigger: "webhook" }),
    ]);

    expect(adapter.verifyPayment).toHaveBeenCalledTimes(2);
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(results.every((r) => r.outcome === "paid")).toBe(true);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("replayed return: no effect, the operator is not asked again", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");
    await confirmOrder(orderId, { trigger: "return" });
    adapter.verifyPayment.mockClear();

    const replay = await confirmOrder(orderId, { trigger: "return" });
    const webhookReplay = await confirmOrder(orderId, { trigger: "webhook" });

    expect(replay).toEqual({ outcome: "paid", changed: false });
    expect(webhookReplay).toEqual({ outcome: "paid", changed: false });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("amount mismatch: paid, activation pending amount_mismatch, nothing broadcast", async () => {
    await createAdmin();
    const { company, orderId } = await pendingBoostOrder();
    verifies("success", 1_000);

    const result = await confirmOrder(orderId, { trigger: "webhook" });

    expect(result).toEqual({ outcome: "activation_pending", changed: true });
    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.activationPending).toBe(true);
    expect(doc.activationPendingReason).toBe("amount_mismatch");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
  });

  it("unreported amount is a mismatch, never an activation", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("success", null);
    await confirmOrder(orderId, { trigger: "webhook" });
    expect((await order(orderId)).activationPendingReason).toBe("amount_mismatch");
  });

  it("profile no longer eligible: paid, activation pending, owner and admin notified with the cause", async () => {
    await createAdmin();
    const { company, orderId } = await pendingBoostOrder();
    await ProfileModel.updateOne({ companyId: company._id }, { $set: { isPublic: false } });
    verifies("success");

    const result = await confirmOrder(orderId, { trigger: "return" });

    expect(result.outcome).toBe("activation_pending");
    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.activationPendingReason).toBe("profile_ineligible");
    expect(await BoostModel.countDocuments({})).toBe(0);

    const notifs = await notificationsOf("order_activation_pending");
    expect(notifs.map((n) => n.recipientType).sort()).toEqual(["admin", "owner"]);
    expect(notifs.every((n) => n.body.fr.includes("le profil n'est plus actif ou plus public"))).toBe(true);
    expect(await notificationsOf("boost_paid")).toHaveLength(0);
  });

  it("boost already active at confirmation: paid, activation pending service_already_active", async () => {
    const { company, orderId } = await pendingBoostOrder();
    await BoostModel.create({
      companyId: company._id, profileKind: "brandup",
      from: new Date(), to: new Date(Date.now() + 86_400_000), status: "active",
    });
    verifies("success");

    const result = await confirmOrder(orderId, { trigger: "webhook" });

    expect(result.outcome).toBe("activation_pending");
    expect((await order(orderId)).activationPendingReason).toBe("service_already_active");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("company suspended at confirmation: paid, activation pending company_suspended", async () => {
    const { company, orderId } = await pendingBoostOrder();
    await CompanyModel.updateOne({ _id: company._id }, { $set: { status: "suspended" } });
    verifies("success");

    await confirmOrder(orderId, { trigger: "webhook" });

    expect((await order(orderId)).activationPendingReason).toBe("company_suspended");
    expect(await BoostModel.countDocuments({})).toBe(0);
  });

  it("deleted account: the order is still found, paid, activation pending account_deleted", async () => {
    await createAdmin();
    const { company, orderId } = await pendingBoostOrder();
    const now = new Date();
    await CompanyModel.updateOne({ _id: company._id }, { $set: { status: "deleted", deletedAt: now } });
    await TransactionModel.updateOne({ _id: orderId }, { $set: { deletedAt: now } });
    await ProfileModel.updateMany({ companyId: company._id }, { $set: { deletedAt: now } });
    verifies("success");

    const result = await confirmOrder(orderId, { trigger: "webhook" });

    expect(result).toEqual({ outcome: "activation_pending", changed: true });
    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.activationPendingReason).toBe("account_deleted");
    expect(await BoostModel.countDocuments({})).toBe(0);
    const admins = (await notificationsOf("order_activation_pending")).filter((n) => n.recipientType === "admin");
    expect(admins).toHaveLength(1);
  });

  it("transient error during activation: replayed, activation succeeds, no 409", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const realCreate = BoostModel.create.bind(BoostModel);
    let calls = 0;
    const spy = vi.spyOn(BoostModel, "create").mockImplementation(async (...args: any[]) => {
      calls++;
      if (calls === 1) {
        const transient = new mongoose.mongo.MongoServerError({ message: "WriteConflict (simulated)", code: 112 });
        transient.addErrorLabel("TransientTransactionError");
        throw transient;
      }
      return realCreate(...args);
    });

    const result = await confirmOrder(orderId, { trigger: "webhook" });
    spy.mockRestore();

    expect(calls).toBe(2);
    expect(result).toEqual({ outcome: "paid", changed: true });
    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.activationPending).toBe(false);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("operator reports a failure: order failed", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("failure", null, null);

    const result = await confirmOrder(orderId, { trigger: "return" });

    expect(result).toEqual({ outcome: "failed", changed: true });
    const doc = await order(orderId);
    expect(doc.status).toBe("failed");
    expect(doc.failureReason).toBe("payment_failure");
    expect(await BoostModel.countDocuments({})).toBe(0);
  });

  it("system failure: order failed", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("system_failure", null, null);
    expect((await confirmOrder(orderId, { trigger: "webhook" })).outcome).toBe("failed");
    expect((await order(orderId)).failureReason).toBe("payment_system_failure");
  });

  it("expired session: order expired", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("expired", null, null);
    expect(await confirmOrder(orderId, { trigger: "webhook" })).toEqual({ outcome: "expired", changed: true });
    expect((await order(orderId)).status).toBe("expired");
  });

  it("paid after expiry: still paid and activated, reported to the admin as an anomaly", async () => {
    await createAdmin();
    const { company, orderId } = await pendingBoostOrder();
    verifies("expired", null, null);
    await confirmOrder(orderId, { trigger: "webhook" });
    verifies("success");

    const result = await confirmOrder(orderId, { trigger: "webhook" });

    expect(result).toEqual({ outcome: "paid", changed: true });
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
    const anomalies = await notificationsOf("order_paid_after_expiry");
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].recipientType).toBe("admin");
  });

  it("still pending or pre-authorized at the operator: nothing changes", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("pending", null, null);
    expect(await confirmOrder(orderId, { trigger: "webhook" })).toEqual({ outcome: "pending", changed: false });
    verifies("preauth_success", BOOST_TTC_MILLIMES);
    expect(await confirmOrder(orderId, { trigger: "webhook" })).toEqual({ outcome: "pending", changed: false });
    expect((await order(orderId)).status).toBe("pending");
    expect(await BoostModel.countDocuments({})).toBe(0);
  });

  it("operator unreachable: throws and leaves the order untouched", async () => {
    const { orderId } = await pendingBoostOrder();
    adapter.verifyPayment.mockRejectedValue(new Error("Flouci verify_payment: network error"));
    await expect(confirmOrder(orderId, { trigger: "webhook" })).rejects.toThrow("network error");
    expect((await order(orderId)).status).toBe("pending");
  });

  it("unknown order: not_found, the operator is not called", async () => {
    expect(await confirmOrder(String(new mongoose.Types.ObjectId()), { trigger: "return" })).toEqual({ outcome: "not_found", changed: false });
    expect(await confirmOrder("not-an-id", { trigger: "webhook" })).toEqual({ outcome: "not_found", changed: false });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });

  it("throttles repeated return verifications, never the webhook", async () => {
    expect(VERIFY_MIN_INTERVAL_MS).toBe(10_000);
    const { orderId } = await pendingBoostOrder();
    verifies("pending", null, null);

    await confirmOrder(orderId, { trigger: "return" });
    await confirmOrder(orderId, { trigger: "return" });
    await confirmOrder(orderId, { trigger: "return" });
    expect(adapter.verifyPayment).toHaveBeenCalledTimes(1);

    // The webhook arrives right after: it is the operator asking us to look
    verifies("success");
    expect((await confirmOrder(orderId, { trigger: "webhook" })).outcome).toBe("paid");
    expect(adapter.verifyPayment).toHaveBeenCalledTimes(2);

    // Past the interval, a return verifies again
    const { orderId: other } = await pendingBoostOrder();
    verifies("pending", null, null);
    await confirmOrder(other, { trigger: "return" });
    await TransactionModel.updateOne({ _id: other }, { $set: { lastVerifiedAt: new Date(Date.now() - VERIFY_MIN_INTERVAL_MS - 1) } });
    adapter.verifyPayment.mockClear();
    await confirmOrder(other, { trigger: "return" });
    expect(adapter.verifyPayment).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Payment method — informative, never blocking
// ---------------------------------------------------------------------------

describe("confirmOrder — payment method reported by the operator", () => {
  /** The real Flouci adapter, fed with the operator's JSON for the given payment type. */
  function flouciReports(type: unknown): void {
    const real = new FlouciPaymentAdapter({
      publicKey: "pk",
      privateKey: "sk",
      baseUrl: "https://developers.flouci.com",
      environment: "test",
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ success: true, result: { type, amount: BOOST_TTC_MILLIMES, status: "SUCCESS", details: {}, settlement_status: "PROCESSING" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch,
    });
    adapter.verifyPayment.mockImplementation((id: string) => real.verifyPayment(id));
  }

  it.each([
    ["card", "card"],
    ["wallet", "wallet"],
    ["mpayment", null],
    ["NA", null],
    ["something-new", null],
  ])("Flouci type %s: the order is paid and the boost activated (method stored: %s)", async (type, stored) => {
    const { company, orderId } = await pendingBoostOrder();
    flouciReports(type);

    expect(await confirmOrder(orderId, { trigger: "webhook" })).toEqual({ outcome: "paid", changed: true });

    const doc = await order(orderId);
    expect(doc.status).toBe("paid");
    expect(doc.activationPending).toBe(false);
    expect(doc.paymentMethod).toBe(stored);
    expect(await BoostModel.countDocuments({ companyId: company._id, status: "active" })).toBe(1);
    // The stored document is still valid for the model: a later save cannot fail on it
    await expect((await TransactionModel.findById(orderId)).validate()).resolves.toBeUndefined();
  });

  it.each(["mpayment", "NA", "bitcoin", "", 42, {}, undefined])(
    "an adapter handing back the raw method %s cannot break the confirmation",
    async (method) => {
      const { company, orderId } = await pendingBoostOrder();
      adapter.verifyPayment.mockResolvedValue({ status: "success", amountMillimes: BOOST_TTC_MILLIMES, method, raw: {} });

      expect(await confirmOrder(orderId, { trigger: "webhook" })).toEqual({ outcome: "paid", changed: true });

      const doc = await order(orderId);
      expect(doc.status).toBe("paid");
      expect(doc.paymentMethod).toBeNull();
      expect(await BoostModel.countDocuments({ companyId: company._id, status: "active" })).toBe(1);
      await expect((await TransactionModel.findById(orderId)).validate()).resolves.toBeUndefined();
    },
  );
});

// ---------------------------------------------------------------------------
// Return route — only the stored payment id is ever verified
// ---------------------------------------------------------------------------

describe("return route — safety", () => {
  it("ignores a forged payment_id: a 'success' id in the URL of an order whose stored id is 'failure' activates nothing", async () => {
    // Real simulator behind the fake: the order's stored payment id encodes a failure
    const failing = new SimulatedPaymentAdapter({ outcome: "failure" });
    const simulator = new SimulatedPaymentAdapter();
    adapter.createPayment.mockImplementation((params: any) => failing.createPayment(params));
    adapter.verifyPayment.mockImplementation((id: string) => simulator.verifyPayment(id));
    const { company, orderId } = await pendingBoostOrder();
    const stored = (await order(orderId)).externalPaymentId;
    expect(stored).toMatch(/^SIM-failure-1072000-/);

    // The attacker rewrites the return URL with a payment id that would verify as a success
    const forged = "SIM-success-1072000-forged";
    expect((await simulator.verifyPayment(forged)).status).toBe("success");
    const res = await paymentReturn(
      new NextRequest(`https://app.test/api/v1/payments/return?order=${orderId}&result=success&payment_id=${forged}`),
    );

    expect(adapter.verifyPayment).toHaveBeenCalledTimes(1);
    expect(adapter.verifyPayment).toHaveBeenCalledWith(stored);
    expect(adapter.verifyPayment).not.toHaveBeenCalledWith(forged);
    const doc = await order(orderId);
    expect(doc.status).toBe("failed");
    expect(doc.externalPaymentId).toBe(stored);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${orderId}`);
  });

  it("operator unreachable during the return: redirect to Commandes, order shown as being verified, never a 500", async () => {
    const { company, orderId } = await pendingBoostOrder();
    adapter.verifyPayment.mockRejectedValue(new Error("Flouci verify_payment: network error"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await paymentReturn(
      new NextRequest(`https://app.test/api/v1/payments/return?order=${orderId}&result=success`),
    );
    logged.mockRestore();

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${orderId}`);
    const doc = await order(orderId);
    expect(doc.status).toBe("pending");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
    // What the Commandes page displays for this order: no advice to reload, a link that verifies again
    expect(orderOutcomeBanner({ ...doc, id: orderId })).toEqual({
      tone: "waiting",
      icon: "hourglass_top",
      text: "Paiement en cours de vérification.",
      action: { label: "Vérifier maintenant", href: `/api/v1/payments/return?order=${orderId}` },
    });
  });

  it("verification skipped by the 10 s delay: same redirect, the page shows the order as being verified", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("pending", null, null);
    await confirmOrder(orderId, { trigger: "return" });
    adapter.verifyPayment.mockClear();

    const res = await paymentReturn(
      new NextRequest(`https://app.test/api/v1/payments/return?order=${orderId}&result=success`),
    );

    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${orderId}`);
    expect(orderOutcomeBanner(await order(orderId)).tone).toBe("waiting");
  });

  it("the 'Vérifier maintenant' link goes back through the return route and verifies again once the delay has passed", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("pending", null, null);
    await confirmOrder(orderId, { trigger: "return" });

    const banner = orderOutcomeBanner({ ...(await order(orderId)), id: orderId });
    expect(banner.action!.label).toBe("Vérifier maintenant");
    const link = new NextRequest(`https://app.test${banner.action!.href}`);

    // Clicked at once: the 10 s delay applies, the operator is not asked again
    adapter.verifyPayment.mockClear();
    await paymentReturn(link);
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect((await order(orderId)).status).toBe("pending");

    // Clicked after the delay, the payment having succeeded meanwhile: verified and activated
    await TransactionModel.updateOne({ _id: orderId }, { $set: { lastVerifiedAt: new Date(Date.now() - VERIFY_MIN_INTERVAL_MS - 1) } });
    verifies("success");
    const res = await paymentReturn(new NextRequest(`https://app.test${banner.action!.href}`));

    expect(adapter.verifyPayment).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${orderId}`);
    expect((await order(orderId)).status).toBe("paid");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
    const after = orderOutcomeBanner({ ...(await order(orderId)), id: orderId });
    expect(after.tone).toBe("success");
    expect(after.action).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F3.1 — webhook route with the real confirmation service behind it
// ---------------------------------------------------------------------------

describe("webhook route — end to end (F3.1)", () => {
  const SECRET = "w".repeat(32);

  /** The call Flouci makes to the webhook URL stored for this order: GET, empty body, its own query appended. */
  async function flouciCallsWebhook(orderId: string, success: "True" | "False"): Promise<Response> {
    const webhookUrl: string = adapter.createPayment.mock.calls.at(-1)![0].webhookUrl;
    expect(webhookUrl).toBe(`https://app.test/api/v1/webhooks/payment/${SECRET}/${orderId}`);
    const req = new NextRequest(`${webhookUrl}?payment_id=n_MXItTjRJ2XoFPt_a8vYw&success=${success}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return paymentWebhook(req, { params: { secret: SECRET, orderId } });
  }

  it("the webhook alone confirms the order: the buyer may have closed the browser", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const res = await flouciCallsWebhook(orderId, "True");

    expect(res.status).toBe(200);
    expect((await order(orderId)).status).toBe("paid");
    expect(await BoostModel.countDocuments({ companyId: company._id, status: "active" })).toBe(1);
    // Verified with the payment id stored on the order, not the one in the query
    expect(adapter.verifyPayment).toHaveBeenCalledWith((await order(orderId)).externalPaymentId);
    expect(adapter.verifyPayment).not.toHaveBeenCalledWith("n_MXItTjRJ2XoFPt_a8vYw");
  });

  it("webhook on an order already paid: the operator is not asked again, 200", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");
    await confirmOrder(orderId, { trigger: "return" });
    adapter.verifyPayment.mockClear();

    const first = await flouciCallsWebhook(orderId, "True");
    const retry = await flouciCallsWebhook(orderId, "True");

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("success=True received while the operator's verification says failure: the verification wins", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("failure", null, null);

    const res = await flouciCallsWebhook(orderId, "True");

    expect(res.status).toBe(200);
    const doc = await order(orderId);
    expect(doc.status).toBe("failed");
    expect(doc.failureReason).toBe("payment_failure");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
  });

  it("success=False received while the operator's verification says success: the verification wins too", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const res = await flouciCallsWebhook(orderId, "False");

    expect(res.status).toBe(200);
    expect((await order(orderId)).status).toBe("paid");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("unknown order: 200, the operator is not asked, nothing is confirmed", async () => {
    const unknown = String(new mongoose.Types.ObjectId());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const req = new NextRequest(`https://app.test/api/v1/webhooks/payment/${SECRET}/${unknown}?payment_id=abc&success=True`);

    const res = await paymentWebhook(req, { params: { secret: SECRET, orderId: unknown } });
    warn.mockRestore();

    expect(res.status).toBe(200);
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(await BoostModel.countDocuments({})).toBe(0);
  });

  it("wrong secret: 401, the order is left untouched and the operator is not asked", async () => {
    const { orderId } = await pendingBoostOrder();
    verifies("success");
    const req = new NextRequest(`https://app.test/api/v1/webhooks/payment/wrong/${orderId}?payment_id=abc&success=True`);

    const res = await paymentWebhook(req, { params: { secret: "x".repeat(32), orderId } });

    expect(res.status).toBe(401);
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect((await order(orderId)).status).toBe("pending");
  });
});

describe("orderOutcomeBanner", () => {
  it.each([
    [{ type: "boost", status: "paid" }, "success", "Paiement confirmé. Votre boost est activé."],
    [{ type: "sponsoring", status: "paid_simulated" }, "success", "Paiement confirmé. Votre campagne est lancée."],
    [{ type: "boost", status: "failed" }, "failure", "Le paiement n'a pas abouti"],
    [{ type: "boost", status: "expired" }, "failure", "La session de paiement a expiré"],
    [{ type: "boost", status: "pending" }, "waiting", "Paiement en cours de vérification"],
    [
      { type: "boost", status: "paid", activationPending: true, activationPendingReason: "amount_mismatch" },
      "waiting",
      "le montant encaissé ne correspond pas à la commande",
    ],
  ])("%j", (input, tone, text) => {
    const banner = orderOutcomeBanner({ ...input, id: "665f1f77bcf86cd799439011" });
    expect(banner.tone).toBe(tone);
    expect(banner.text).toContain(text);
    expect(banner.text).not.toContain("Actualisez");
    // Only an order still being verified offers the link
    if (input.status === "pending") {
      expect(banner.action).toEqual({ label: "Vérifier maintenant", href: "/api/v1/payments/return?order=665f1f77bcf86cd799439011" });
    } else {
      expect(banner.action).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Sponsoring
// ---------------------------------------------------------------------------

describe("confirmOrder — sponsoring", () => {
  async function pendingSponsoringOrder(): Promise<{ company: any; campaign: any; orderId: string }> {
    const company = await createCompany();
    await createProfile(company._id);
    const campaign = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: "https://cdn.example.com/b.jpg", linkUrl: "https://www.example.com",
      status: "confirmed", confirmedAt: new Date(),
    });
    const { orderId } = await checkoutSponsoring(String(company._id), String(campaign._id), `spo-${counter}`);
    return { company, campaign, orderId };
  }

  it("success: order paid, campaign active for 7 days", async () => {
    const { campaign, orderId } = await pendingSponsoringOrder();
    expect(adapter.createPayment.mock.calls[0]![0].amountMillimes).toBe(SPONSORING_TTC_MILLIMES);
    expect((await SponsoringModel.findById(campaign._id).lean()).status).toBe("confirmed");
    verifies("success", SPONSORING_TTC_MILLIMES);

    expect((await confirmOrder(orderId, { trigger: "return" })).outcome).toBe("paid");

    const updated = await SponsoringModel.findById(campaign._id).lean();
    expect(updated.status).toBe("active");
    expect(String(updated.transactionId)).toBe(orderId);
    expect(Math.round((updated.to.getTime() - updated.from.getTime()) / 86_400_000)).toBe(7);
  });

  it("campaign no longer payable at confirmation: paid, activation pending service_already_active", async () => {
    const { campaign, orderId } = await pendingSponsoringOrder();
    await SponsoringModel.updateOne({ _id: campaign._id }, { $set: { status: "cancelled" } });
    verifies("success", SPONSORING_TTC_MILLIMES);

    expect((await confirmOrder(orderId, { trigger: "webhook" })).outcome).toBe("activation_pending");
    expect((await order(orderId)).activationPendingReason).toBe("service_already_active");
    expect((await SponsoringModel.findById(campaign._id).lean()).status).toBe("cancelled");
  });

  it("D1 — a campaign with a pending order cannot be cancelled by its owner", async () => {
    const { company, campaign } = await pendingSponsoringOrder();

    await expect(cancelSponsoring(String(company._id), String(campaign._id))).rejects.toMatchObject({
      code: "SPONSORING_PAYMENT_IN_PROGRESS",
      status: 422,
    });
    expect((await SponsoringModel.findById(campaign._id).lean()).status).toBe("confirmed");
  });

  it("a campaign whose order failed can be cancelled again", async () => {
    const { company, campaign, orderId } = await pendingSponsoringOrder();
    verifies("failure", null, null);
    await confirmOrder(orderId, { trigger: "webhook" });

    await cancelSponsoring(String(company._id), String(campaign._id));
    expect((await SponsoringModel.findById(campaign._id).lean()).status).toBe("cancelled");
  });
});

// ---------------------------------------------------------------------------
// Next click with a pending order — resume, not block
// ---------------------------------------------------------------------------

describe("checkout with a pending order", () => {
  it("still pending at the operator: resumes with the stored redirect URL, no new order", async () => {
    const { company, orderId, redirectUrl } = await pendingBoostOrder();
    verifies("pending", null, null);

    const again = await checkoutBoost(String(company._id), "brandup", "key-again");

    expect(again).toEqual({ orderId, redirectUrl });
    expect(adapter.verifyPayment).toHaveBeenCalledTimes(1);
    expect(adapter.createPayment).toHaveBeenCalledTimes(1);
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("paid in the meantime: confirmed, and the buyer is sent to the result page", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");

    const again = await checkoutBoost(String(company._id), "brandup", "key-again");

    expect(again).toEqual({ orderId, redirectUrl: `/dashboard/commandes?commande=${orderId}` });
    expect((await order(orderId)).status).toBe("paid");
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(1);
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
  });

  it("expired at the operator: marked expired, a new order is created", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("expired", null, null);

    const again = await checkoutBoost(String(company._id), "brandup", "key-again");

    expect(again.orderId).not.toBe(orderId);
    expect((await order(orderId)).status).toBe("expired");
    expect((await order(again.orderId)).status).toBe("pending");
    expect(adapter.createPayment).toHaveBeenCalledTimes(2);
  });

  it("failed at the operator: marked failed, a new order is created", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("failure", null, null);

    const again = await checkoutBoost(String(company._id), "brandup", "key-again");

    expect(again.orderId).not.toBe(orderId);
    expect((await order(orderId)).status).toBe("failed");
  });

  it("verification impossible: explicit 409, nothing is modified", async () => {
    const { company, orderId } = await pendingBoostOrder();
    adapter.verifyPayment.mockRejectedValue(new Error("Flouci verify_payment: HTTP 500"));

    await expect(checkoutBoost(String(company._id), "brandup", "key-again")).rejects.toMatchObject({
      code: "PAYMENT_VERIFICATION_UNAVAILABLE",
      status: 409,
    });
    expect((await order(orderId)).status).toBe("pending");
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
    expect(adapter.createPayment).toHaveBeenCalledTimes(1);
  });

  it("an old pending order never sent to the operator is released", async () => {
    const company = await createCompany();
    await createProfile(company._id);
    const stale = await TransactionModel.create({
      companyId: company._id, type: "boost", profileKind: "brandup",
      priceHT: 900, vatRate: 0.19, fiscalStampDT: 1, status: "pending",
    });
    await TransactionModel.collection.updateOne({ _id: stale._id }, { $set: { createdAt: new Date(Date.now() - 10 * 60_000) } });

    const fresh = await checkoutBoost(String(company._id), "brandup", "key-fresh");

    const released = await order(String(stale._id));
    expect(released.status).toBe("failed");
    expect(released.failureReason).toBe("payment_never_created");
    expect(fresh.orderId).not.toBe(String(stale._id));
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// D2 — account deletion
// ---------------------------------------------------------------------------

describe("assertAccountCanBeDeleted", () => {
  it("refuses while an order is still pending at the operator", async () => {
    const { company } = await pendingBoostOrder();
    verifies("pending", null, null);
    await expect(assertAccountCanBeDeleted(String(company._id))).rejects.toMatchObject({
      code: "ACCOUNT_DELETE_PAYMENT_PENDING",
      status: 422,
    });
  });

  it("refuses when the pending order cannot be verified", async () => {
    const { company, orderId } = await pendingBoostOrder();
    adapter.verifyPayment.mockRejectedValue(new Error("Flouci verify_payment: network error"));
    await expect(assertAccountCanBeDeleted(String(company._id))).rejects.toMatchObject({
      code: "ACCOUNT_DELETE_PAYMENT_PENDING",
    });
    expect((await order(orderId)).status).toBe("pending");
  });

  it("continues when the pending order turns out expired or failed", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("expired", null, null);
    await expect(assertAccountCanBeDeleted(String(company._id))).resolves.toBeUndefined();
    expect((await order(orderId)).status).toBe("expired");
  });

  it("refuses a paid order awaiting activation, pointing to the support", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success", 1_000);
    await confirmOrder(orderId, { trigger: "webhook" });

    await expect(assertAccountCanBeDeleted(String(company._id))).rejects.toMatchObject({
      code: "ACCOUNT_DELETE_ACTIVATION_PENDING",
      message: expect.stringContaining("Contactez le support"),
    });
  });

  it("continues with only settled orders", async () => {
    const { company, orderId } = await pendingBoostOrder();
    verifies("success");
    await confirmOrder(orderId, { trigger: "webhook" });
    await expect(assertAccountCanBeDeleted(String(company._id))).resolves.toBeUndefined();
  });
});

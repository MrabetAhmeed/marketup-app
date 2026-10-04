/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Transaction } from "@/models/transaction.model";
import { Boost } from "@/models/boost.model";
import { Notification } from "@/models/notification.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    MONETIZATION_ENABLED: true,
    ADMIN_NOTIFICATION_EMAIL: "admin@test.dev",
    PAYMENT_ADAPTER: "simulated",
  },
}));
vi.mock("@/lib/email/sender", () => ({
  sendTransactionAdminEmail: vi.fn().mockResolvedValue(undefined),
}));

const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const TransactionModel = Transaction as any;
const BoostModel = Boost as any;

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 20_000 }] });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let counter = 0;
async function createTestCompany(overrides: Record<string, unknown> = {}) {
  counter++;
  return CompanyModel.create({
    slug: `test-co-${counter}`,
    type: "B2B",
    legalId: `L${counter}`,
    accountEmail: `test${counter}@co.tn`,
    country: "TN",
    data: { displayName: { fr: "TestCo", ar: "", en: "" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", address: "Addr", languages: ["fr"] },
    ownerUserId: new mongoose.Types.ObjectId(),
    status: "active",
    registeredAt: new Date(),
    validatedAt: new Date(),
    ...overrides,
  });
}

async function createTestProfile(companyId: mongoose.Types.ObjectId, kind: string, overrides: Record<string, unknown> = {}) {
  return ProfileModel.create({
    companyId,
    kind,
    status: "active",
    isPublic: true,
    data: kind === "brandup"
      ? { pitch: { fr: "test", ar: "", en: "" }, about: { fr: "", ar: "", en: "" }, color: "#0078D4", links: [], gallery: [], projects: [], certifications: [], services: [] }
      : kind === "traceup"
        ? { channelName: { fr: "ch", ar: "", en: "" }, channelDescription: { fr: "", ar: "", en: "" }, videos: [] }
        : { qrConfig: { style: "rounded", colorForeground: "#000", colorBackground: "#FFF", logoOverlay: false }, socials: [] },
    publishedAt: new Date(),
    lastValidatedAt: new Date(),
    ...overrides,
  });
}

/** Second step of the purchase: the (simulated) payment is verified server-side. */
async function payAndConfirm(checkout: { orderId: string }): Promise<void> {
  const { confirmOrder } = await import("@/services/order.service");
  await confirmOrder(checkout.orderId, { trigger: "return" });
}

// ---------------------------------------------------------------------------
// checkoutBoost
// ---------------------------------------------------------------------------

describe("checkoutBoost", () => {
  it("creates a pending order with correct amounts; the boost is activated only after confirmation", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const result = await checkoutBoost(String(company._id), "brandup", "key-1");

    // Step 1 — order pending, buyer sent to the (simulated) payment, no boost yet
    expect(result.redirectUrl).toContain(`/api/v1/payments/return?order=${result.orderId}&result=success`);
    const pending = await TransactionModel.findById(result.orderId).lean();
    expect(pending!.status).toBe("pending");
    expect(pending!.priceHT).toBe(900);
    expect(pending!.fiscalStampDT).toBe(1);
    expect(pending!.currency).toBe("DT");
    expect(pending!.invoiceNumber).toMatch(/^\d{4}-\d{5}$/);
    expect(pending!.externalPaymentId).toMatch(/^SIM-success-1072000-/);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);

    // Step 2 — server-side verification
    const { confirmOrder } = await import("@/services/order.service");
    expect(await confirmOrder(result.orderId, { trigger: "return" })).toEqual({ outcome: "paid", changed: true });

    const tx = await TransactionModel.findById(result.orderId).lean();
    expect(tx!.status).toBe("paid_simulated"); // raw DB has paid_simulated
    expect(tx!.paymentReference).toMatch(/^SIM-/);
    expect(tx!.paymentMethod).toBe("simulated");

    const boost = await BoostModel.findOne({ companyId: company._id }).lean();
    expect(boost!.status).toBe("active");
    expect(boost!.profileKind).toBe("brandup");
    expect(String(boost!.transactionId)).toBe(result.orderId);
  });

  it("returns 409 BOOST_ALREADY_ACTIVE when boost exists on same profile", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    await payAndConfirm(await checkoutBoost(String(company._id), "brandup", "key-dup-1"));

    await expect(
      checkoutBoost(String(company._id), "brandup", "key-dup-2"),
    ).rejects.toMatchObject({ code: "BOOST_ALREADY_ACTIVE", status: 409 });
  });

  it("allows boost on different profileKind for same company", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");
    await createTestProfile(company._id, "traceup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const r1 = await checkoutBoost(String(company._id), "brandup", "key-multi-1");
    const r2 = await checkoutBoost(String(company._id), "traceup", "key-multi-2");

    expect(r1.orderId).not.toBe(r2.orderId);
    expect((await TransactionModel.findById(r1.orderId).lean())!.profileKind).toBe("brandup");
    expect((await TransactionModel.findById(r2.orderId).lean())!.profileKind).toBe("traceup");
  });

  it("rejects when profile does not exist", async () => {
    const company = await createTestCompany();

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(
      checkoutBoost(String(company._id), "brandup", "key-no-profile"),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("rejects when company is not active", async () => {
    const company = await createTestCompany({ status: "suspended" });
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(
      checkoutBoost(String(company._id), "brandup", "key-suspended"),
    ).rejects.toMatchObject({ code: "COMPANY_NOT_ACTIVE" });
  });

  it("rejects when profile is pending (R1)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup", { status: "pending" });

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(
      checkoutBoost(String(company._id), "brandup", "key-pending"),
    ).rejects.toMatchObject({ code: "BOOST_PROFILE_NOT_PUBLIC", status: 422 });
  });

  it("rejects when profile is rejected (R1)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup", { status: "rejected" });

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(
      checkoutBoost(String(company._id), "brandup", "key-rejected"),
    ).rejects.toMatchObject({ code: "BOOST_PROFILE_NOT_PUBLIC", status: 422 });
  });

  it("rejects when profile is active but isPublic false (R1)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup", { status: "active", isPublic: false });

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(
      checkoutBoost(String(company._id), "brandup", "key-not-public"),
    ).rejects.toMatchObject({ code: "BOOST_PROFILE_NOT_PUBLIC", status: 422 });
  });

  it("accepts active + isPublic true (R1)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup", { status: "active", isPublic: true });

    const { checkoutBoost } = await import("@/services/boost.service");
    const result = await checkoutBoost(String(company._id), "brandup", "key-public-ok");
    expect((await TransactionModel.findById(result.orderId).lean())!.status).toBe("pending");
  });

  it("idempotency: same key returns same transaction", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const r1 = await checkoutBoost(String(company._id), "brandup", "idemp-key");
    const r2 = await checkoutBoost(String(company._id), "brandup", "idemp-key");

    expect(r1.orderId).toBe(r2.orderId);
    expect(r1.redirectUrl).toBe(r2.redirectUrl);

    // Only 1 transaction in DB
    const txCount = await TransactionModel.countDocuments({ companyId: company._id, type: "boost" });
    expect(txCount).toBe(1);
  });

  it("creates owner notification once the payment is confirmed", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const result = await checkoutBoost(String(company._id), "brandup", "key-notif");
    expect(await (Notification as any).countDocuments({ kind: "boost_paid" })).toBe(0);
    await payAndConfirm(result);

    // Wait for async notification
    await new Promise((r) => setTimeout(r, 200));

    const notifs = await (Notification as any).find({
      recipientType: "owner",
      kind: "boost_paid",
    }).lean();
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// expireStaleBoosts
// ---------------------------------------------------------------------------

describe("expireStaleBoosts", () => {
  it("flips expired boosts to expired status", async () => {
    const company = await createTestCompany();
    const past = new Date(Date.now() - 86_400_000);
    await BoostModel.create({
      companyId: company._id,
      profileKind: "brandup",
      from: new Date(past.getTime() - 30 * 86_400_000),
      to: past,
      status: "active",
    });

    const { expireStaleBoosts } = await import("@/services/boost.service");
    const count = await expireStaleBoosts();
    expect(count).toBe(1);

    const boost = await BoostModel.findOne({ companyId: company._id }).lean();
    expect(boost!.status).toBe("expired");
  });

  it("does not touch active boosts with future to date", async () => {
    const company = await createTestCompany();
    const future = new Date(Date.now() + 10 * 86_400_000);
    await BoostModel.create({
      companyId: company._id,
      profileKind: "brandup",
      from: new Date(),
      to: future,
      status: "active",
    });

    const { expireStaleBoosts } = await import("@/services/boost.service");
    const count = await expireStaleBoosts();
    expect(count).toBe(0);

    const boost = await BoostModel.findOne({ companyId: company._id }).lean();
    expect(boost!.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// getBoostHistory
// ---------------------------------------------------------------------------

describe("getBoostHistory", () => {
  it("returns boost history sorted by from desc with TTC", async () => {
    const company = await createTestCompany();
    const txDoc = await TransactionModel.create({
      companyId: company._id,
      type: "boost",
      profileKind: "brandup",
      priceHT: 900,
      vatRate: 0.19,
      currency: "DT",
      status: "paid_simulated",
      paidAt: new Date(),
      paymentMethod: "simulated",
    });
    await BoostModel.create({
      companyId: company._id,
      profileKind: "brandup",
      from: new Date(Date.now() - 30 * 86_400_000),
      to: new Date(Date.now() - 1 * 86_400_000),
      status: "expired",
      transactionId: txDoc._id,
      viewsAdded: 42,
      clicksAdded: 5,
    });

    const { getBoostHistory } = await import("@/services/boost.service");
    const items = await getBoostHistory(String(company._id));
    expect(items).toHaveLength(1);
    expect(items[0]!.profileKind).toBe("brandup");
    expect(items[0]!.status).toBe("expired");
    expect(items[0]!.priceTTC).toBeCloseTo(1071);
    expect(items[0]!.viewsAdded).toBe(42);
    expect(items[0]!.clicksAdded).toBe(5);
  });

  it("cross-tenant: company A does not see company B boosts", async () => {
    const companyA = await createTestCompany();
    const companyB = await createTestCompany();
    await BoostModel.create({
      companyId: companyA._id,
      profileKind: "brandup",
      from: new Date(),
      to: new Date(Date.now() + 30 * 86_400_000),
      status: "active",
    });
    await BoostModel.create({
      companyId: companyB._id,
      profileKind: "brandup",
      from: new Date(),
      to: new Date(Date.now() + 30 * 86_400_000),
      status: "active",
    });

    const { getBoostHistory } = await import("@/services/boost.service");
    const itemsA = await getBoostHistory(String(companyA._id));
    const itemsB = await getBoostHistory(String(companyB._id));
    expect(itemsA).toHaveLength(1);
    expect(itemsB).toHaveLength(1);
    expect(itemsA[0]!.id).not.toBe(itemsB[0]!.id);
  });
});

// ---------------------------------------------------------------------------
// V1.2 F2 — fields frozen on the order at purchase
// ---------------------------------------------------------------------------

describe("checkoutBoost — frozen fields (F2)", () => {
  it("freezes the duration and the adapter environment on the order", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const result = await checkoutBoost(String(company._id), "brandup", "key-f2-frozen");

    const order = await TransactionModel.findById(result.orderId).lean();
    expect(order.durationDays).toBe(30);
    expect(order.adapterEnvironment).toBe("test");
    expect(order.activationPending).toBe(false);
    expect(order.activationPendingReason).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// V1.2 F2 — a second order for the same service is a 409, never a 500
// ---------------------------------------------------------------------------

describe("checkoutBoost — pending order conflict (F2)", () => {
  it("returns 409 BOOST_CHECKOUT_IN_PROGRESS when a pending order already exists", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");
    await TransactionModel.create({
      companyId: company._id, type: "boost", profileKind: "brandup",
      priceHT: 900, vatRate: 0.19, status: "pending",
    });

    const { checkoutBoost } = await import("@/services/boost.service");
    await expect(checkoutBoost(String(company._id), "brandup", "key-f2-conflict")).rejects.toMatchObject({
      code: "BOOST_CHECKOUT_IN_PROGRESS",
      status: 409,
    });

    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
  });

  it("two simultaneous purchases: one order is created, the other click is refused", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const outcomes = await Promise.allSettled([
      checkoutBoost(String(company._id), "brandup", "key-f2-simul-a"),
      checkoutBoost(String(company._id), "brandup", "key-f2-simul-b"),
    ]);

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o): o is PromiseRejectedResult => o.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({ code: "BOOST_CHECKOUT_IN_PROGRESS", status: 409 });

    // One single order; the boost only exists once that order is confirmed
    expect(await TransactionModel.countDocuments({ companyId: company._id })).toBe(1);
    expect(await BoostModel.countDocuments({ companyId: company._id })).toBe(0);
  });
});

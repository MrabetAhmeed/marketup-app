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
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
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

// ---------------------------------------------------------------------------
// checkoutBoost
// ---------------------------------------------------------------------------

describe("checkoutBoost", () => {
  it("creates Transaction + Boost atomically with correct amounts", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const result = await checkoutBoost(String(company._id), "brandup", "key-1");

    expect(result.boost.status).toBe("active");
    expect(result.boost.profileKind).toBe("brandup");
    expect(result.transaction.priceHT).toBe(50);
    expect(result.transaction.vatAmount).toBeCloseTo(9.5);
    expect(result.transaction.fiscalStampDT).toBe(1);
    expect(result.transaction.priceTTC).toBeCloseTo(60.5);
    expect(result.transaction.currency).toBe("DT");
    expect(result.transaction.status).toBe("paid"); // paid_simulated mapped for owner
    expect(result.transaction.invoiceNumber).toMatch(/^MU-\d{4}-\d{5}$/);

    // Verify DB state
    const tx = await TransactionModel.findById(result.transaction.id).lean();
    expect(tx!.status).toBe("paid_simulated"); // raw DB has paid_simulated
    expect(tx!.paymentReference).toMatch(/^SIM-/);
    expect(tx!.fiscalStampDT).toBe(1);

    const boost = await BoostModel.findById(result.boost.id).lean();
    expect(boost!.status).toBe("active");
    expect(String(boost!.transactionId)).toBe(result.transaction.id);
  });

  it("returns 409 BOOST_ALREADY_ACTIVE when boost exists on same profile", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    await checkoutBoost(String(company._id), "brandup", "key-dup-1");

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

    expect(r1.boost.profileKind).toBe("brandup");
    expect(r2.boost.profileKind).toBe("traceup");
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
    expect(result.boost.status).toBe("active");
  });

  it("idempotency: same key returns same transaction", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    const r1 = await checkoutBoost(String(company._id), "brandup", "idemp-key");
    const r2 = await checkoutBoost(String(company._id), "brandup", "idemp-key");

    expect(r1.transaction.id).toBe(r2.transaction.id);
    expect(r1.boost.id).toBe(r2.boost.id);

    // Only 1 transaction in DB
    const txCount = await TransactionModel.countDocuments({ companyId: company._id, type: "boost" });
    expect(txCount).toBe(1);
  });

  it("creates owner notification on checkout", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { checkoutBoost } = await import("@/services/boost.service");
    await checkoutBoost(String(company._id), "brandup", "key-notif");

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
      priceHT: 50,
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
    expect(items[0]!.priceTTC).toBeCloseTo(59.5);
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

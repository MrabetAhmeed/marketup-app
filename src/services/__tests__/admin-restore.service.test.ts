/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Transaction } from "@/models/transaction.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Notification } from "@/models/notification.model";
import { File as FileModel } from "@/models/file.model";
import {
  restoreCompanyByAdmin,
  listDeletedCompanies,
  listAllCompanies,
} from "@/services/admin-company.service";
import { getProfileForAdminReview } from "@/services/admin-profile.service";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.com",
    MONGODB_URI: "mongodb://localhost",
  },
}));
vi.mock("@/lib/email/sender", () => ({
  sendCompanyValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanySuspendedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyReactivatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyRestoredEmail: vi.fn().mockResolvedValue(undefined),
}));

let replSet: MongoMemoryReplSet;
const adminId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  // Pre-create all collections to avoid "catalog changes" errors in transactions
  const uid = new mongoose.Types.ObjectId();
  const cid = new mongoose.Types.ObjectId();
  await (Company as any).create({ type: "B2B", status: "pending", slug: "init", legalId: "INIT", accountEmail: "init@t.tn", ownerUserId: uid, data: { displayName: { fr: "Init" } }, liveData: { sectorId: "x", gouvernorat: "x", ville: "x", contactEmail: "x@x.x" }, registeredAt: new Date() });
  await (User as any).create({ _id: uid, firstName: "I", lastName: "N", email: "init@t.tn", passwordHash: "h", companyId: cid });
  await (Profile as any).create({ companyId: cid, kind: "brandup", status: "incomplete", isPublic: false, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {} });
  await (Transaction as any).create({ companyId: cid, type: "boost", priceHT: 1, vatRate: 0.19, status: "pending" });
  await (Boost as any).create({ companyId: cid, profileKind: "brandup", status: "active", from: new Date(), to: new Date() });
  await (Sponsoring as any).create({ companyId: cid, profileKind: "brandup", status: "active", from: new Date(), to: new Date(), bannerUrl: "https://cdn/banner.jpg", linkUrl: "https://example.com" });
  await (RseReceipt as any).create({ companyId: cid, associationId: new mongoose.Types.ObjectId(), amount: 1, donationDate: new Date(), status: "pending" });
  await (Notification as any).create({ recipientType: "owner", recipientId: uid, kind: "info", title: { fr: "i" }, body: { fr: "i" } });
  await (FileModel as any).create({ ownerUserId: uid, key: "i.png", url: "u", mimeType: "image/png", size: 1, purpose: "logo" });
  // Clear all
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
}, 30_000);

// Create a full company + user + profile, then soft-delete cascade
async function createDeletedCompany(opts?: { validatedAt?: Date | null; profileStatus?: string }): Promise<{
  companyId: string;
  userId: string;
  profileId: string;
  cascadeTimestamp: Date;
}> {
  const now = new Date();
  const uid = new mongoose.Types.ObjectId();
  const company = await (Company as any).create({
    type: "B2B",
    status: "deleted",
    slug: `del-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    legalId: `RNE${Date.now()}`,
    accountEmail: `del${Date.now()}@test.tn`,
    ownerUserId: uid,
    data: { displayName: { fr: "Deleted Co" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "d@t.tn" },
    registeredAt: new Date("2026-01-01"),
    validatedAt: opts?.validatedAt !== undefined ? opts.validatedAt : new Date("2026-01-02"),
    deletedAt: now,
  });
  await (User as any).create({
    _id: uid,
    firstName: "Del",
    lastName: "User",
    email: `del${Date.now()}@test.tn`,
    passwordHash: "hash",
    companyId: company._id,
    deletedAt: now,
  });
  const profile = await (Profile as any).create({
    companyId: company._id,
    kind: "brandup",
    status: opts?.profileStatus ?? "rejected",
    isPublic: true,
    stats: { viewsTotal: 10, views30d: 0, clicksTotal: 2 },
    data: {},
    deletedAt: now,
  });
  // Create related docs with same cascadeTimestamp
  await (Transaction as any).create({ companyId: company._id, type: "boost", priceHT: 100, vatRate: 0.19, status: "paid", deletedAt: now });
  await (Boost as any).create({ companyId: company._id, profileKind: "brandup", status: "expired", from: new Date("2026-01-01"), to: new Date("2026-02-01"), deletedAt: now });
  await (Sponsoring as any).create({ companyId: company._id, profileKind: "brandup", status: "expired", from: new Date("2026-01-01"), to: new Date("2026-02-01"), bannerUrl: "https://cdn/banner.jpg", linkUrl: "https://example.com", deletedAt: now });
  await (RseReceipt as any).create({ companyId: company._id, associationId: new mongoose.Types.ObjectId(), amount: 50, donationDate: new Date(), status: "validated", deletedAt: now });
  await (Notification as any).create({ recipientType: "owner", recipientId: uid, kind: "info", title: { fr: "test" }, body: { fr: "test" }, deletedAt: now });
  await (FileModel as any).create({ ownerUserId: uid, key: "test.png", url: "https://cdn/test.png", mimeType: "image/png", size: 1000, purpose: "logo", deletedAt: now });

  return { companyId: company._id.toString(), userId: uid.toString(), profileId: profile._id.toString(), cascadeTimestamp: now };
}

// =====================================================================
// restoreCompanyByAdmin
// =====================================================================

describe("restoreCompanyByAdmin", () => {
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key]!.deleteMany({});
    }
  });
  it("restores all 9 models (cascade inverse)", async () => {
    const { companyId, userId, profileId } = await createDeletedCompany();

    await restoreCompanyByAdmin(companyId, adminId);

    // Company
    const company = await (Company as any).findById(companyId).lean();
    expect(company).not.toBeNull();
    expect(company.status).toBe("active");
    expect(company.deletedAt).toBeNull();

    // User
    const user = await (User as any).findById(userId).lean();
    expect(user).not.toBeNull();
    expect(user.deletedAt).toBeNull();

    // Profile
    const profile = await (Profile as any).findById(profileId).lean();
    expect(profile).not.toBeNull();
    expect(profile.deletedAt).toBeNull();

    // Transaction
    const txns = await (Transaction as any).find({ companyId }).lean();
    expect(txns.length).toBeGreaterThan(0);
    expect(txns[0].deletedAt).toBeNull();

    // Boost
    const boosts = await (Boost as any).find({ companyId }).lean();
    expect(boosts.length).toBeGreaterThan(0);

    // Sponsoring
    const sponsorings = await (Sponsoring as any).find({ companyId }).lean();
    expect(sponsorings.length).toBeGreaterThan(0);

    // RseReceipt
    const receipts = await (RseReceipt as any).find({ companyId }).lean();
    expect(receipts.length).toBeGreaterThan(0);

    // Notification
    const notifs = await (Notification as any).find({ recipientId: userId }).lean();
    expect(notifs.length).toBeGreaterThan(0);

    // File
    const files = await (FileModel as any).find({ ownerUserId: userId }).lean();
    expect(files.length).toBeGreaterThan(0);
  });

  it("profile status preserved (rejected before → rejected after)", async () => {
    const { companyId, profileId } = await createDeletedCompany({ profileStatus: "rejected" });
    await restoreCompanyByAdmin(companyId, adminId);
    const profile = await (Profile as any).findById(profileId).lean();
    expect(profile.status).toBe("rejected");
  });

  it("E1: validatedAt null → restored as pending", async () => {
    const { companyId } = await createDeletedCompany({ validatedAt: null });
    await restoreCompanyByAdmin(companyId, adminId);
    const company = await (Company as any).findById(companyId).lean();
    expect(company.status).toBe("pending");
  });

  it("E5: restore non-deleted company → 409 ConflictError", async () => {
    const company = await (Company as any).create({
      type: "B2B", status: "active",
      slug: `active-${Date.now()}`, legalId: `RNE${Date.now()}`,
      accountEmail: `act${Date.now()}@t.tn`, ownerUserId: new mongoose.Types.ObjectId(),
      data: { displayName: { fr: "Active Co" } },
      liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "a@t.tn" },
      registeredAt: new Date(),
    });
    await expect(restoreCompanyByAdmin(company._id.toString(), adminId))
      .rejects.toThrow("Ce compte n'est pas supprimé.");
    // Verify 409 status code
    try {
      await restoreCompanyByAdmin(company._id.toString(), adminId);
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.code).toBe("NOT_DELETED");
    }
  });

  it("match exact: doc soft-deleted BEFORE cascade is NOT restored", async () => {
    const oldTimestamp = new Date("2025-01-01");
    const cascadeTimestamp = new Date("2026-06-01");
    const uid = new mongoose.Types.ObjectId();
    const company = await (Company as any).create({
      type: "B2B", status: "deleted",
      slug: `exact-${Date.now()}`, legalId: `RNE${Date.now()}`,
      accountEmail: `exact${Date.now()}@t.tn`, ownerUserId: uid,
      data: { displayName: { fr: "Exact Co" } },
      liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "e@t.tn" },
      registeredAt: new Date(), validatedAt: new Date(),
      deletedAt: cascadeTimestamp,
    });
    await (User as any).create({
      _id: uid, firstName: "E", lastName: "U", email: `exact${Date.now()}@t.tn`,
      passwordHash: "h", companyId: company._id, deletedAt: cascadeTimestamp,
    });
    // Profile deleted BEFORE cascade (different timestamp)
    const oldProfile = await (Profile as any).create({
      companyId: company._id, kind: "brandup", status: "disabled", isPublic: false,
      stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {},
      deletedAt: oldTimestamp,
    });
    // Profile deleted WITH cascade (same timestamp)
    const cascadeProfile = await (Profile as any).create({
      companyId: company._id, kind: "traceup", status: "active", isPublic: true,
      stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {},
      deletedAt: cascadeTimestamp,
    });

    await restoreCompanyByAdmin(company._id.toString(), adminId);

    // Old profile should still be deleted
    const old = await (Profile as any).findById(oldProfile._id).setOptions({ withDeleted: true }).lean();
    expect(old.deletedAt).not.toBeNull();

    // Cascade profile should be restored
    const cascade = await (Profile as any).findById(cascadeProfile._id).lean();
    expect(cascade).not.toBeNull();
    expect(cascade.deletedAt).toBeNull();
  });

  it("audit trail entry 'restored' added", async () => {
    const { companyId } = await createDeletedCompany();
    await restoreCompanyByAdmin(companyId, adminId);
    const company = await (Company as any).findById(companyId).lean();
    const lastEntry = company.auditTrail[company.auditTrail.length - 1];
    expect(lastEntry.action).toBe("restored");
    expect(lastEntry.byRole).toBe("SUPER_ADMIN");
  });

  it("slug preserved after restore", async () => {
    const { companyId } = await createDeletedCompany();
    const before = await (Company as any).findById(companyId).setOptions({ withDeleted: true }).lean();
    await restoreCompanyByAdmin(companyId, adminId);
    const after = await (Company as any).findById(companyId).lean();
    expect(after.slug).toBe(before.slug);
  });

  it("email sent non-blocking", async () => {
    const { sendCompanyRestoredEmail } = await import("@/lib/email/sender");
    const { companyId } = await createDeletedCompany();
    await restoreCompanyByAdmin(companyId, adminId);
    expect(sendCompanyRestoredEmail).toHaveBeenCalled();
  });
});

// =====================================================================
// listDeletedCompanies / listAllCompanies isolation
// =====================================================================

describe("list isolation", () => {
  it("listDeletedCompanies returns only deleted", async () => {
    await createDeletedCompany();
    const deleted = await listDeletedCompanies("fr");
    expect(deleted.length).toBeGreaterThan(0);
    for (const c of deleted) {
      expect(c.deletedAt).toBeTruthy();
    }
  });

  it("listAllCompanies does NOT include deleted", async () => {
    const all = await listAllCompanies("fr");
    for (const c of all) {
      expect(c.status).not.toBe("deleted");
    }
  });
});

// =====================================================================
// getProfileForAdminReview with withDeleted (B2)
// =====================================================================

describe("getProfileForAdminReview withDeleted", () => {
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key]!.deleteMany({});
    }
  });

  it("returns deleted profile data with withDeleted: true", async () => {
    const { profileId } = await createDeletedCompany({ profileStatus: "active" });
    const result = await getProfileForAdminReview(profileId, "fr", { withDeleted: true });
    expect(result).not.toBeNull();
    expect(result.id).toBe(profileId);
    expect(result.companyStatus).toBe("deleted");
  });

  it("throws NotFoundError for deleted profile without withDeleted", async () => {
    const { profileId } = await createDeletedCompany();
    await expect(getProfileForAdminReview(profileId, "fr"))
      .rejects.toThrow("Profile not found");
  });
});

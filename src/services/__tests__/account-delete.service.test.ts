/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";
import { Transaction } from "@/models/transaction.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Notification } from "@/models/notification.model";
import { File } from "@/models/file.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email/sender", () => ({
  sendAccountDeletedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanySuspendedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyReactivatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
  },
}));

import { deleteMyAccount } from "@/services/account-delete.service";
import { suspendCompanyByAdmin, reactivateCompanyByAdmin } from "@/services/admin-company.service";
import { ensureUniqueSlug } from "@/lib/slug";
import { sendAccountDeletedEmail, sendCompanySuspendedEmail, sendCompanyReactivatedEmail } from "@/lib/email/sender";
import { isSessionInvalidatedByCompanyStatus } from "@/lib/session-check";

const CompanyModel = Company as any;
const UserModel = User as any;
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;
const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const RseReceiptModel = RseReceipt as any;
const NotificationModel = Notification as any;
const FileModel = File as any;

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

let companyId: string;
let userId: string;

async function seedFullCompany(password = "TestPass123!"): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  const company = await CompanyModel.create({
    slug: "test-delete-co",
    type: "B2B",
    legalId: "DEL123",
    accountEmail: "owner@delete.tn",
    data: { displayName: { fr: "Delete Co" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse" },
    status: "active",
    ownerUserId: new mongoose.Types.ObjectId(),
  });
  companyId = company._id.toString();

  const user = await UserModel.create({
    email: "owner@delete.tn",
    passwordHash: hash,
    firstName: "Test",
    lastName: "Owner",
    role: "OWNER",
    companyId,
    emailVerifiedAt: new Date(),
  });
  userId = user._id.toString();

  // Update ownerUserId
  await CompanyModel.findByIdAndUpdate(companyId, { $set: { ownerUserId: user._id } });

  // Create related documents (using discriminator models for kind index)
  await BrandUpModel.create({
    companyId, status: "active", isPublic: true,
    data: { pitch: { fr: "" }, about: { fr: "" }, color: "#0078D4", gallery: [] },
  });
  await TraceUpModel.create({
    companyId, status: "active", isPublic: true,
    data: { videos: [], color: "#5C2D91" },
  });
  await LinkUpModel.create({
    companyId, status: "active", isPublic: true,
    data: { socials: [], color: "#000000" },
  });
  await TransactionModel.create({
    companyId, type: "boost", priceHT: 100, vatRate: 0.19, status: "paid",
  });
  await BoostModel.create({
    companyId, profileKind: "brandup", from: new Date(), to: new Date(),
    status: "active",
  });
  await SponsoringModel.create({
    companyId, profileKind: "linkup", from: new Date(), to: new Date(),
    status: "active", bannerUrl: "https://cdn/banner.jpg", linkUrl: "https://example.com",
  });
  await RseReceiptModel.create({
    companyId, associationId: new mongoose.Types.ObjectId(),
    amount: 200, donationDate: new Date(), status: "pending",
  });
  await NotificationModel.create({
    recipientType: "owner", recipientId: user._id,
    kind: "info", title: { fr: "Test" }, body: { fr: "Notif" },
  });
  await FileModel.create({
    ownerUserId: user._id, purpose: "logo", url: "https://logo.png",
  });
}

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// CHANTIER A — Delete account
// ═══════════════════════════════════════════════════════════════════════

describe("deleteMyAccount — cascade soft-delete", () => {
  it("marks all 9 collections with deletedAt", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    // All should have deletedAt set
    const company = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    expect(company.deletedAt).toBeInstanceOf(Date);
    expect(company.status).toBe("deleted");

    const user = await UserModel.findById(userId).setOptions({ withDeleted: true }).lean();
    expect(user.deletedAt).toBeInstanceOf(Date);

    const profiles = await ProfileModel.find({ companyId }).setOptions({ withDeleted: true }).lean();
    expect(profiles).toHaveLength(3);
    profiles.forEach((p: any) => expect(p.deletedAt).toBeInstanceOf(Date));

    const txn = await TransactionModel.find({ companyId }).setOptions({ withDeleted: true }).lean();
    expect(txn).toHaveLength(1);
    expect(txn[0].deletedAt).toBeInstanceOf(Date);

    const boost = await BoostModel.find({ companyId }).setOptions({ withDeleted: true }).lean();
    expect(boost).toHaveLength(1);
    expect(boost[0].deletedAt).toBeInstanceOf(Date);

    const spons = await SponsoringModel.find({ companyId }).setOptions({ withDeleted: true }).lean();
    expect(spons).toHaveLength(1);
    expect(spons[0].deletedAt).toBeInstanceOf(Date);

    const rse = await RseReceiptModel.find({ companyId }).setOptions({ withDeleted: true }).lean();
    expect(rse).toHaveLength(1);
    expect(rse[0].deletedAt).toBeInstanceOf(Date);

    // Notification by recipientId
    const notifs = await NotificationModel.find({}).setOptions({ withDeleted: true }).lean();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].deletedAt).toBeInstanceOf(Date);

    // File by ownerUserId
    const files = await FileModel.find({}).setOptions({ withDeleted: true }).lean();
    expect(files).toHaveLength(1);
    expect(files[0].deletedAt).toBeInstanceOf(Date);
  });

  it("bad password → ZERO mutations", async () => {
    await seedFullCompany();
    await expect(deleteMyAccount(userId, "WrongPass!")).rejects.toThrow("Mot de passe incorrect");

    // Nothing should be deleted
    const company = await CompanyModel.findById(companyId).lean();
    expect(company).not.toBeNull();
    expect(company.status).toBe("active");
    expect(company.deletedAt).toBeNull();

    const profiles = await ProfileModel.find({ companyId }).lean();
    expect(profiles).toHaveLength(3);
  });

  it("re-login impossible after delete (soft-delete filter)", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    // User.findOne with default filter → null (soft-delete filter excludes deleted)
    const found = await UserModel.findOne({ email: "owner@delete.tn" }).lean();
    expect(found).toBeNull();
  });

  it("delete from rejected company works", async () => {
    await seedFullCompany();
    await CompanyModel.findByIdAndUpdate(companyId, { $set: { status: "rejected" } });
    await deleteMyAccount(userId, "TestPass123!");

    const company = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    expect(company.status).toBe("deleted");
    expect(company.deletedAt).toBeInstanceOf(Date);
  });

  it("sends account-deleted email", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");
    expect(sendAccountDeletedEmail).toHaveBeenCalledOnce();
    expect(sendAccountDeletedEmail).toHaveBeenCalledWith({
      userEmail: "owner@delete.tn",
      companyName: "Delete Co",
    });
  });

  it("session invalidated for deleted company", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    const co = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    const invalidated = isSessionInvalidatedByCompanyStatus(co?.status);
    expect(invalidated).toBe(true);
  });

  it("audit trail entry created", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    const company = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    const trail = company.auditTrail;
    expect(trail.length).toBeGreaterThanOrEqual(1);
    const last = trail[trail.length - 1];
    expect(last.action).toBe("account_deleted");
    expect(last.byRole).toBe("OWNER");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A5 — ensureUniqueSlug vs deleted companies
// ═══════════════════════════════════════════════════════════════════════

describe("ensureUniqueSlug — deleted company slug reserved", () => {
  it("slug of deleted company gets -2 suffix for new company", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    // Verify the deleted company still has its slug
    const deleted = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    expect(deleted.slug).toBe("test-delete-co");

    // New company trying same slug should get -2
    const newSlug = await ensureUniqueSlug("test-delete-co");
    expect(newSlug).toBe("test-delete-co-2");
  });

  it("slugHistory of deleted company is also reserved", async () => {
    await seedFullCompany();
    // Add an old slug to history
    await CompanyModel.findByIdAndUpdate(companyId, {
      $push: { slugHistory: "old-slug-name" },
    });
    await deleteMyAccount(userId, "TestPass123!");

    const newSlug = await ensureUniqueSlug("old-slug-name");
    expect(newSlug).toBe("old-slug-name-2");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A6 — Public 404 for deleted company
// ═══════════════════════════════════════════════════════════════════════

describe("public access after delete — 404", () => {
  it("Company.findOne with default filter returns null for deleted", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    const found = await CompanyModel.findOne({ slug: "test-delete-co" }).lean();
    expect(found).toBeNull();
  });

  it("Profile.find with default filter returns empty for deleted", async () => {
    await seedFullCompany();
    await deleteMyAccount(userId, "TestPass123!");

    const profiles = await ProfileModel.find({ companyId }).lean();
    expect(profiles).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CHANTIER B — Suspend hardening
// ═══════════════════════════════════════════════════════════════════════

describe("suspendCompanyByAdmin — reason + audit trail", () => {
  it("writes suspendedReason and audit trail", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Contenu inapproprié");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.status).toBe("suspended");
    expect(company.suspendedReason).toBe("Contenu inapproprié");
    expect(company.suspendedAt).toBeInstanceOf(Date);

    const trail = company.auditTrail;
    const entry = trail.find((e: any) => e.action === "suspended");
    expect(entry).toBeDefined();
    expect(entry.byRole).toBe("SUPER_ADMIN");
    expect(entry.details.reason).toBe("Contenu inapproprié");
  });

  it("sends suspended email", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Violation ToS");

    expect(sendCompanySuspendedEmail).toHaveBeenCalledOnce();
    const call = (sendCompanySuspendedEmail as any).mock.calls[0][0];
    expect(call.userEmail).toBe("owner@delete.tn");
    expect(call.reason).toBe("Violation ToS");
  });

  it("session invalidated for suspended company", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Test reason");

    const co = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    const invalidated = isSessionInvalidatedByCompanyStatus(co?.status);
    expect(invalidated).toBe(true);
  });
});

describe("reactivateCompanyByAdmin — cleanup + audit trail", () => {
  it("clears suspendedReason and adds audit trail", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Test reason");
    vi.clearAllMocks();
    await reactivateCompanyByAdmin(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.status).toBe("active");
    expect(company.suspendedReason).toBeNull();
    expect(company.suspendedAt).toBeNull();

    const trail = company.auditTrail;
    const entry = trail.find((e: any) => e.action === "reactivated");
    expect(entry).toBeDefined();
    expect(entry.byRole).toBe("SUPER_ADMIN");
  });

  it("sends reactivated email", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Test");
    vi.clearAllMocks();
    await reactivateCompanyByAdmin(companyId, adminId);

    expect(sendCompanyReactivatedEmail).toHaveBeenCalledOnce();
    const call = (sendCompanyReactivatedEmail as any).mock.calls[0][0];
    expect(call.userEmail).toBe("owner@delete.tn");
  });

  it("session valid again after reactivation", async () => {
    await seedFullCompany();
    const adminId = new mongoose.Types.ObjectId().toString();

    await suspendCompanyByAdmin(companyId, adminId, "Test");
    await reactivateCompanyByAdmin(companyId, adminId);

    const co = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
    const invalidated = isSessionInvalidatedByCompanyStatus(co?.status);
    expect(invalidated).toBe(false);
  });
});

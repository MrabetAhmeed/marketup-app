/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Sponsoring } from "@/models/sponsoring.model";

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
  sendSponsoringSubmittedEmail: vi.fn().mockResolvedValue(undefined),
  sendSponsoringValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendSponsoringRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));

const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const SponsoringModel = Sponsoring as any;

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
    slug: `test-spo-${counter}`,
    type: "B2B",
    legalId: `S${counter}`,
    accountEmail: `spo${counter}@co.tn`,
    country: "TN",
    data: { displayName: { fr: "SpoCo", ar: "", en: "" } },
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

const BANNER = "https://cdn.example.com/banner.jpg";
const LINK = "https://www.example.com";

// ---------------------------------------------------------------------------
// requestSponsoring
// ---------------------------------------------------------------------------

describe("requestSponsoring", () => {
  it("creates a pending sponsoring", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    const result = await requestSponsoring(String(company._id), "brandup", BANNER, LINK);

    expect(result.status).toBe("pending");
    expect(result.bannerUrl).toBe(BANNER);
    expect(result.linkUrl).toBe(LINK);

    const doc = await SponsoringModel.findById(result.id).lean();
    expect(doc.status).toBe("pending");
    expect(doc.from).toBeNull();
    expect(doc.to).toBeNull();
  });

  it("rejects if profile is not active+public (422 SPONSORING_PROFILE_NOT_PUBLIC)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup", { status: "pending" });

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    await expect(requestSponsoring(String(company._id), "brandup", BANNER, LINK))
      .rejects.toThrow("actif et visible");
  });

  it("rejects duplicate — slot occupied by pending (409)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    await requestSponsoring(String(company._id), "brandup", BANNER, LINK);

    await expect(requestSponsoring(String(company._id), "brandup", BANNER, LINK))
      .rejects.toThrow("déjà en cours");
  });

  it("rejects duplicate — slot occupied by confirmed (409)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "linkup");

    await SponsoringModel.create({
      companyId: company._id, profileKind: "linkup",
      bannerUrl: BANNER, linkUrl: LINK, status: "confirmed",
    });

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    await expect(requestSponsoring(String(company._id), "linkup", BANNER, LINK))
      .rejects.toThrow("déjà en cours");
  });

  it("rejects duplicate — slot occupied by active (409)", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "traceup");

    await SponsoringModel.create({
      companyId: company._id, profileKind: "traceup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    await expect(requestSponsoring(String(company._id), "traceup", BANNER, LINK))
      .rejects.toThrow("déjà en cours");
  });

  it("allows request after rejected frees the slot", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "brandup");

    await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "rejected",
      rejectionReason: "Bad banner",
    });

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    const result = await requestSponsoring(String(company._id), "brandup", BANNER, LINK);
    expect(result.status).toBe("pending");
  });

  it("allows request after cancelled frees the slot", async () => {
    const company = await createTestCompany();
    await createTestProfile(company._id, "linkup");

    await SponsoringModel.create({
      companyId: company._id, profileKind: "linkup",
      bannerUrl: BANNER, linkUrl: LINK, status: "cancelled",
      cancelledAt: new Date(),
    });

    const { requestSponsoring } = await import("@/services/sponsoring.service");
    const result = await requestSponsoring(String(company._id), "linkup", BANNER, LINK);
    expect(result.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// validateSponsoring / rejectSponsoring
// ---------------------------------------------------------------------------

describe("validateSponsoring", () => {
  it("pending → confirmed", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });

    const { validateSponsoring } = await import("@/services/sponsoring.service");
    await validateSponsoring(String(doc._id));

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.status).toBe("confirmed");
    expect(updated.confirmedAt).toBeInstanceOf(Date);
  });
});

describe("rejectSponsoring", () => {
  it("pending → rejected with reason", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });

    const { rejectSponsoring } = await import("@/services/sponsoring.service");
    await rejectSponsoring(String(doc._id), "Bannière inappropriée");

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.status).toBe("rejected");
    expect(updated.rejectionReason).toBe("Bannière inappropriée");
  });
});

// ---------------------------------------------------------------------------
// cancelSponsoring
// ---------------------------------------------------------------------------

describe("cancelSponsoring", () => {
  it("cancel from pending OK", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });

    const { cancelSponsoring } = await import("@/services/sponsoring.service");
    await cancelSponsoring(String(company._id), String(doc._id));

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.status).toBe("cancelled");
    expect(updated.cancelledAt).toBeInstanceOf(Date);
  });

  it("cancel from confirmed OK", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "confirmed",
      confirmedAt: new Date(),
    });

    const { cancelSponsoring } = await import("@/services/sponsoring.service");
    await cancelSponsoring(String(company._id), String(doc._id));

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.status).toBe("cancelled");
  });

  it("cancel from active → 4xx", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });

    const { cancelSponsoring } = await import("@/services/sponsoring.service");
    await expect(cancelSponsoring(String(company._id), String(doc._id)))
      .rejects.toThrow("en attente ou validées");
  });
});

// ---------------------------------------------------------------------------
// checkoutSponsoring
// ---------------------------------------------------------------------------

describe("checkoutSponsoring", () => {
  it("confirmed → active with Transaction", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "confirmed",
      confirmedAt: new Date(),
    });

    const { checkoutSponsoring } = await import("@/services/sponsoring.service");
    const result = await checkoutSponsoring(String(company._id), String(doc._id), "spo-key-1");

    expect(result.sponsoring.status).toBe("active");
    expect(result.transaction.priceHT).toBe(100);
    expect(result.transaction.vatAmount).toBeCloseTo(19);
    expect(result.transaction.fiscalStampDT).toBe(1);
    expect(result.transaction.priceTTC).toBeCloseTo(120);
    expect(result.transaction.status).toBe("paid");
    expect(result.transaction.invoiceNumber).toMatch(/^MU-\d{4}-\d{5}$/);

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.status).toBe("active");
    expect(updated.from).toBeInstanceOf(Date);
    expect(updated.to).toBeInstanceOf(Date);
    expect(updated.paidAt).toBeInstanceOf(Date);
    expect(updated.transactionId).toBeTruthy();
  });

  it("checkout from pending → 4xx", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });

    const { checkoutSponsoring } = await import("@/services/sponsoring.service");
    await expect(checkoutSponsoring(String(company._id), String(doc._id), "key-pending"))
      .rejects.toThrow("validées par l'admin");
  });
});

// ---------------------------------------------------------------------------
// expireStaleSponsorings
// ---------------------------------------------------------------------------

describe("expireStaleSponsorings", () => {
  it("flips active with past to → expired", async () => {
    const company = await createTestCompany();
    await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(Date.now() - 8 * 86_400_000),
      to: new Date(Date.now() - 1 * 86_400_000),
    });

    const { expireStaleSponsorings } = await import("@/services/sponsoring.service");
    const count = await expireStaleSponsorings();
    expect(count).toBe(1);

    const docs = await SponsoringModel.find({ companyId: company._id }).lean();
    expect(docs[0].status).toBe("expired");
  });
});

// ---------------------------------------------------------------------------
// getActiveSponsoringForKind (banner selection)
// ---------------------------------------------------------------------------

describe("getActiveSponsoringForKind", () => {
  it("returns an active sponsoring for the kind", async () => {
    const company = await createTestCompany();
    await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });

    const { getActiveSponsoringForKind } = await import("@/services/sponsoring.service");
    const result = await getActiveSponsoringForKind("brandup");
    expect(result).not.toBeNull();
    expect(result!.bannerUrl).toBe(BANNER);
  });

  it("returns null when no active sponsoring", async () => {
    const { getActiveSponsoringForKind } = await import("@/services/sponsoring.service");
    const result = await getActiveSponsoringForKind("traceup");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getActiveSponsoringsForKind (plural — carousel)
// ---------------------------------------------------------------------------

describe("getActiveSponsoringsForKind", () => {
  it("returns all active sponsorings for the kind (shuffled)", async () => {
    const company1 = await createTestCompany();
    const company2 = await createTestCompany();
    await SponsoringModel.create({
      companyId: company1._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });
    await SponsoringModel.create({
      companyId: company2._id, profileKind: "brandup",
      bannerUrl: "https://cdn.example.com/banner2.jpg", linkUrl: "https://www.example2.com", status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });

    const { getActiveSponsoringsForKind } = await import("@/services/sponsoring.service");
    const result = await getActiveSponsoringsForKind("brandup");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.bannerUrl).sort()).toEqual([BANNER, "https://cdn.example.com/banner2.jpg"]);
  });

  it("returns empty array when no active sponsoring", async () => {
    const { getActiveSponsoringsForKind } = await import("@/services/sponsoring.service");
    const result = await getActiveSponsoringsForKind("traceup");
    expect(result).toEqual([]);
  });

  it("excludes expired sponsorings", async () => {
    const company = await createTestCompany();
    await SponsoringModel.create({
      companyId: company._id, profileKind: "linkup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(Date.now() - 14 * 86_400_000), to: new Date(Date.now() - 1 * 86_400_000),
    });

    const { getActiveSponsoringsForKind } = await import("@/services/sponsoring.service");
    const result = await getActiveSponsoringsForKind("linkup");
    expect(result).toEqual([]);
  });

  it("excludes pending/confirmed — only active", async () => {
    const company = await createTestCompany();
    await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });
    await SponsoringModel.create({
      companyId: company._id, profileKind: "traceup",
      bannerUrl: BANNER, linkUrl: LINK, status: "confirmed",
    });

    const { getActiveSponsoringsForKind } = await import("@/services/sponsoring.service");
    expect(await getActiveSponsoringsForKind("brandup")).toEqual([]);
    expect(await getActiveSponsoringsForKind("traceup")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// incSponsoringImpressions / incSponsoringClicks
// ---------------------------------------------------------------------------

describe("incSponsoringImpressions + incSponsoringClicks", () => {
  it("$inc impressions and clicks fail-silent", async () => {
    const company = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "active",
      from: new Date(), to: new Date(Date.now() + 7 * 86_400_000),
    });

    const { incSponsoringImpressions, incSponsoringClicks } = await import("@/services/sponsoring.service");
    await incSponsoringImpressions(String(doc._id));
    await incSponsoringImpressions(String(doc._id));
    await incSponsoringClicks(String(doc._id));

    const updated = await SponsoringModel.findById(doc._id).lean();
    expect(updated.impressions).toBe(2);
    expect(updated.clicks).toBe(1);
  });

  it("sponsor_click on unknown id → no-op (no crash)", async () => {
    const { incSponsoringClicks } = await import("@/services/sponsoring.service");
    // Should not throw
    await incSponsoringClicks(new mongoose.Types.ObjectId().toString());
  });
});

// ---------------------------------------------------------------------------
// cross-tenant guard
// ---------------------------------------------------------------------------

describe("cross-tenant", () => {
  it("cancel rejects when sponsoringId belongs to another company", async () => {
    const company1 = await createTestCompany();
    const company2 = await createTestCompany();
    const doc = await SponsoringModel.create({
      companyId: company1._id, profileKind: "brandup",
      bannerUrl: BANNER, linkUrl: LINK, status: "pending",
    });

    const { cancelSponsoring } = await import("@/services/sponsoring.service");
    await expect(cancelSponsoring(String(company2._id), String(doc._id)))
      .rejects.toThrow(); // NotFoundError — not found for this company
  });
});

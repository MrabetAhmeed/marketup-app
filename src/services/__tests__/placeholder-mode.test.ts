import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoisted mock fns ---
const {
  mockCompanyFindOne,
  mockProfileFindOne,
  mockProfileFindById,
  mockProfileFind,
  mockBoostFindOne,
  mockRseReceiptFind,
  mockAssociationFind,
  mockSectorFindOne,
  mockGouvernoratFindOne,
  mockBrandUpUpdate,
  mockTraceUpUpdate,
  mockLinkUpUpdate,
  mockUserFindById,
} = vi.hoisted(() => ({
  mockCompanyFindOne: vi.fn(),
  mockProfileFindOne: vi.fn(),
  mockProfileFindById: vi.fn(),
  mockProfileFind: vi.fn(),
  mockBoostFindOne: vi.fn(),
  mockRseReceiptFind: vi.fn(),
  mockAssociationFind: vi.fn(),
  mockSectorFindOne: vi.fn(),
  mockGouvernoratFindOne: vi.fn(),
  mockBrandUpUpdate: vi.fn(),
  mockTraceUpUpdate: vi.fn(),
  mockLinkUpUpdate: vi.fn(),
  mockUserFindById: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {},
}));
vi.mock("@/models/company.model", () => ({
  Company: { findOne: (...a: unknown[]) => ({ lean: () => mockCompanyFindOne(...a) }) },
}));
vi.mock("@/models/profile.model", () => ({
  Profile: {
    findOne: (...a: unknown[]) => ({ lean: () => mockProfileFindOne(...a) }),
    findById: (...a: unknown[]) => ({ lean: () => mockProfileFindById(...a) }),
    find: (...a: unknown[]) => ({ lean: () => mockProfileFind(...a) }),
  },
}));
vi.mock("@/models/profile-brandup.model", () => ({
  BrandUp: { findByIdAndUpdate: (...a: unknown[]) => mockBrandUpUpdate(...a) },
}));
vi.mock("@/models/profile-traceup.model", () => ({
  TraceUp: { findByIdAndUpdate: (...a: unknown[]) => mockTraceUpUpdate(...a) },
}));
vi.mock("@/models/profile-linkup.model", () => ({
  LinkUp: { findByIdAndUpdate: (...a: unknown[]) => mockLinkUpUpdate(...a) },
}));
vi.mock("@/models/boost.model", () => ({
  Boost: { findOne: (...a: unknown[]) => ({ lean: () => mockBoostFindOne(...a) }) },
}));
vi.mock("@/models/rse-receipt.model", () => ({
  RseReceipt: { find: () => ({ sort: () => ({ lean: () => mockRseReceiptFind() }) }) },
}));
vi.mock("@/models/association.model", () => ({
  Association: { find: () => ({ lean: () => mockAssociationFind() }) },
}));
vi.mock("@/models/sector.model", () => ({
  Sector: { findOne: (...a: unknown[]) => ({ lean: () => mockSectorFindOne(...a) }) },
}));
vi.mock("@/models/gouvernorat.model", () => ({
  Gouvernorat: { findOne: (...a: unknown[]) => ({ lean: () => mockGouvernoratFindOne(...a) }) },
}));
vi.mock("@/models/user.model", () => ({
  User: { findById: (...a: unknown[]) => ({ lean: () => mockUserFindById(...a) }) },
}));
vi.mock("@/services/profile-editor.service", () => ({
  getProfileForEditor: vi.fn().mockResolvedValue({
    id: "p1", kind: "brandup", status: "active", isPublic: true, placeholderMode: "hidden",
    rejectionReason: null, submittedAt: null, rejectedAt: null, publishedAt: null,
    hasPendingData: false, boosted: false, sponsoring: false,
    data: { pitch: "", about: "", color: "#0078D4", gallery: [] },
    pendingGallery: null, currentGallery: null,
  }),
}));

import { getPublicProfileBySlug } from "@/services/public-profile.service";
import type { PublicPlaceholderProfile } from "@/services/public-profile.service";
import { NotFoundError } from "@/lib/api-error";
import { updateProfileSoft } from "@/services/profile-soft.service";
import { BrandupSoftSchema, TraceupSoftSchema, LinkupSoftSchema } from "@/schemas/profile-soft.schema";

// --- Helpers ---

const COMPANY_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const PROFILE_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    _id: COMPANY_ID, slug: "technofab-industries", type: "b2b", status: "active",
    legalId: "TN123456", accountEmail: "a@b.tn",
    data: { displayName: { fr: "TechnoFab" }, logoUrl: "https://logo.png", bannerUrl: null, color: "#0078D4" },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "a@b.tn", phone: null, whatsapp: null, address: null, gpsPosition: null },
    rseBadgeStatus: "none", slugHistory: [],
    ...overrides,
  };
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    _id: PROFILE_ID, companyId: COMPANY_ID, kind: "brandup", status: "active",
    isPublic: true, placeholderMode: "hidden", publishedAt: new Date("2026-06-01"),
    pendingData: null,
    data: { pitch: { fr: "Hello" }, about: { fr: "World" }, color: "#0078D4", gallery: [], links: [], projects: [], certifications: [], services: [] },
    ...overrides,
  };
}

function setupMocks(company: ReturnType<typeof makeCompany>, profile: ReturnType<typeof makeProfile>) {
  mockCompanyFindOne.mockResolvedValue(company);
  mockProfileFindOne.mockResolvedValue(profile);
  mockProfileFind.mockResolvedValue([]);
  mockBoostFindOne.mockResolvedValue(null);
  mockRseReceiptFind.mockResolvedValue([]);
  mockAssociationFind.mockResolvedValue([]);
  mockSectorFindOne.mockResolvedValue(null);
  mockGouvernoratFindOne.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================================================
// PUBLIC SERVICE — Placeholder cause matrix
// =====================================================================

describe("PP-14.5 — placeholder mode cause matrix", () => {
  it("isPublic false + hidden → NotFoundError (behaviour unchanged)", async () => {
    setupMocks(makeCompany(), makeProfile({ isPublic: false, placeholderMode: "hidden" }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("isPublic false + coming_soon + publishedAt → placeholder DTO", async () => {
    setupMocks(makeCompany(), makeProfile({ isPublic: false, placeholderMode: "coming_soon" }));
    const result = await getPublicProfileBySlug("brandup", "technofab-industries");
    expect(result).toHaveProperty("placeholder", true);
    expect(result.kind).toBe("brandup");
    expect(result.company.displayName).toBe("TechnoFab");
    expect(result.company.slug).toBe("technofab-industries");
  });

  it("isPublic false + coming_soon + publishedAt NULL → 404 (no leak pre-validation)", async () => {
    setupMocks(makeCompany(), makeProfile({ isPublic: false, placeholderMode: "coming_soon", publishedAt: null }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("company suspended + coming_soon → 404 (sanction overrides placeholder)", async () => {
    setupMocks(makeCompany({ status: "suspended" }), makeProfile({ isPublic: false, placeholderMode: "coming_soon" }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("company deleted + coming_soon → 404", async () => {
    setupMocks(makeCompany({ status: "deleted" }), makeProfile({ isPublic: false, placeholderMode: "coming_soon" }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("isPublic true + coming_soon → full profile (placeholder ignored)", async () => {
    setupMocks(makeCompany(), makeProfile({ isPublic: true, placeholderMode: "coming_soon" }));
    const result = await getPublicProfileBySlug("brandup", "technofab-industries");
    expect(result).not.toHaveProperty("placeholder");
    expect(result.kind).toBe("brandup");
    expect((result.company as Record<string, unknown>).contactEmail).toBeDefined();
  });

  it("profile disabled + coming_soon → 404", async () => {
    setupMocks(makeCompany(), makeProfile({ status: "disabled", isPublic: false, placeholderMode: "coming_soon" }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("profile incomplete + coming_soon → 404", async () => {
    setupMocks(makeCompany(), makeProfile({ status: "incomplete", isPublic: false, placeholderMode: "coming_soon" }));
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });

  it("rétrocompat — profile without placeholderMode field → hidden → 404 on isPublic false", async () => {
    const profile = makeProfile({ isPublic: false });
    delete (profile as Record<string, unknown>).placeholderMode;
    setupMocks(makeCompany(), profile);
    await expect(getPublicProfileBySlug("brandup", "technofab-industries")).rejects.toThrow(NotFoundError);
  });
});

// =====================================================================
// NON-FUITE — Placeholder DTO strict key whitelist
// =====================================================================

describe("PP-14.5 — placeholder DTO non-fuite", () => {
  it("placeholder DTO contains ONLY kind, placeholder, company.{displayName,logoUrl,slug}", async () => {
    setupMocks(makeCompany(), makeProfile({ isPublic: false, placeholderMode: "coming_soon" }));
    const result = await getPublicProfileBySlug("brandup", "technofab-industries") as PublicPlaceholderProfile;

    const topKeys = Object.keys(result).sort();
    expect(topKeys).toEqual(["company", "kind", "placeholder"]);

    const companyKeys = Object.keys(result.company).sort();
    expect(companyKeys).toEqual(["displayName", "logoUrl", "slug"]);

    expect(result).not.toHaveProperty("data");
    expect(result).not.toHaveProperty("socials");
    expect(result).not.toHaveProperty("rseReceipts");
    expect(result).not.toHaveProperty("pendingData");
    expect((result.company as Record<string, unknown>)).not.toHaveProperty("contactEmail");
    expect((result.company as Record<string, unknown>)).not.toHaveProperty("phone");
    expect((result.company as Record<string, unknown>)).not.toHaveProperty("gpsPosition");
  });
});

// =====================================================================
// ZOD SCHEMAS — placeholderMode validation
// =====================================================================

describe("PP-14.5 — Zod soft schemas accept placeholderMode", () => {
  it("BrandupSoftSchema accepts hidden", () => {
    expect(BrandupSoftSchema.parse({ placeholderMode: "hidden" }).placeholderMode).toBe("hidden");
  });

  it("BrandupSoftSchema accepts coming_soon", () => {
    expect(BrandupSoftSchema.parse({ placeholderMode: "coming_soon" }).placeholderMode).toBe("coming_soon");
  });

  it("BrandupSoftSchema rejects invalid value", () => {
    expect(() => BrandupSoftSchema.parse({ placeholderMode: "foo" })).toThrow();
  });

  it("TraceupSoftSchema accepts placeholderMode", () => {
    expect(TraceupSoftSchema.parse({ placeholderMode: "coming_soon" }).placeholderMode).toBe("coming_soon");
  });

  it("LinkupSoftSchema accepts placeholderMode", () => {
    expect(LinkupSoftSchema.parse({ placeholderMode: "coming_soon" }).placeholderMode).toBe("coming_soon");
  });

  it("strict mode rejects unknown keys", () => {
    expect(() => BrandupSoftSchema.parse({ placeholderMode: "hidden", bogus: true })).toThrow();
  });
});

// =====================================================================
// SOFT SERVICE — mutation persists placeholderMode
// =====================================================================

describe("PP-14.5 — soft mutation placeholderMode", () => {
  beforeEach(() => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "brandup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    mockUserFindById.mockResolvedValue({ _id: "user1", companyId: COMPANY_ID });
    mockBrandUpUpdate.mockResolvedValue({});
    mockTraceUpUpdate.mockResolvedValue({});
    mockLinkUpUpdate.mockResolvedValue({});
  });

  it("brandup — sets placeholderMode via $set", async () => {
    await updateProfileSoft(PROFILE_ID, "user1", { placeholderMode: "coming_soon" });
    expect(mockBrandUpUpdate).toHaveBeenCalledWith(PROFILE_ID, { $set: { placeholderMode: "coming_soon" } });
  });

  it("traceup — sets placeholderMode via $set", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "traceup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { placeholderMode: "coming_soon" });
    expect(mockTraceUpUpdate).toHaveBeenCalledWith(PROFILE_ID, { $set: { placeholderMode: "coming_soon" } });
  });

  it("linkup — sets placeholderMode via $set", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "linkup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { placeholderMode: "coming_soon" });
    expect(mockLinkUpUpdate).toHaveBeenCalledWith(PROFILE_ID, { $set: { placeholderMode: "coming_soon" } });
  });

  it("empty patch does not call update", async () => {
    await updateProfileSoft(PROFILE_ID, "user1", {});
    expect(mockBrandUpUpdate).not.toHaveBeenCalled();
  });
});

// =====================================================================
// PP-14.6 — Dashboard toggle OFF: isPublic false + placeholderMode coming_soon
// =====================================================================

describe("PP-14.6 — dashboard toggle OFF sets isPublic false + placeholderMode coming_soon", () => {
  beforeEach(() => {
    mockUserFindById.mockResolvedValue({ _id: "user1", companyId: COMPANY_ID });
    mockBrandUpUpdate.mockResolvedValue({});
    mockTraceUpUpdate.mockResolvedValue({});
    mockLinkUpUpdate.mockResolvedValue({});
  });

  it("brandup — toggle OFF sets both fields", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "brandup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { isPublic: false, placeholderMode: "coming_soon" });
    expect(mockBrandUpUpdate).toHaveBeenCalledWith(PROFILE_ID, {
      $set: { isPublic: false, placeholderMode: "coming_soon" },
    });
  });

  it("traceup — toggle OFF sets both fields", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "traceup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { isPublic: false, placeholderMode: "coming_soon" });
    expect(mockTraceUpUpdate).toHaveBeenCalledWith(PROFILE_ID, {
      $set: { isPublic: false, placeholderMode: "coming_soon" },
    });
  });

  it("linkup — toggle OFF sets both fields", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "linkup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { isPublic: false, placeholderMode: "coming_soon" });
    expect(mockLinkUpUpdate).toHaveBeenCalledWith(PROFILE_ID, {
      $set: { isPublic: false, placeholderMode: "coming_soon" },
    });
  });
});

// =====================================================================
// PP-14.6 — Dashboard toggle ON: isPublic true, placeholderMode INCHANGÉ
// =====================================================================

describe("PP-14.6 — dashboard toggle ON sets isPublic true only", () => {
  beforeEach(() => {
    mockUserFindById.mockResolvedValue({ _id: "user1", companyId: COMPANY_ID });
    mockBrandUpUpdate.mockResolvedValue({});
  });

  it("toggle ON sends only isPublic true, placeholderMode untouched", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "brandup",
      status: "active", isPublic: false, placeholderMode: "coming_soon",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { isPublic: true });
    expect(mockBrandUpUpdate).toHaveBeenCalledWith(PROFILE_ID, {
      $set: { isPublic: true },
    });
    // placeholderMode NOT in $set
    const setArg = mockBrandUpUpdate.mock.calls[0][1].$set;
    expect(setArg).not.toHaveProperty("placeholderMode");
  });
});

// =====================================================================
// PP-14.6 — Dashboard toggle OFF overwrites hidden → coming_soon
// =====================================================================

describe("PP-14.6 — toggle OFF overwrites existing hidden → coming_soon", () => {
  beforeEach(() => {
    mockUserFindById.mockResolvedValue({ _id: "user1", companyId: COMPANY_ID });
    mockLinkUpUpdate.mockResolvedValue({});
  });

  it("profile with placeholderMode=hidden → OFF sets coming_soon", async () => {
    mockProfileFindById.mockResolvedValue({
      _id: PROFILE_ID, companyId: COMPANY_ID, kind: "linkup",
      status: "active", isPublic: true, placeholderMode: "hidden",
    });
    await updateProfileSoft(PROFILE_ID, "user1", { isPublic: false, placeholderMode: "coming_soon" });
    const setArg = mockLinkUpUpdate.mock.calls[0][1].$set;
    expect(setArg.isPublic).toBe(false);
    expect(setArg.placeholderMode).toBe("coming_soon");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";

// Mock connectDb — tests use direct mongoose.connect instead
vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock email sender
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
    NOMINATIM_USER_AGENT: "TEST/1.0",
  },
}));

// Mock geocoding
vi.mock("@/lib/geocoding/nominatim", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
}));

import { updateMeAccount, syncOwnerFullName } from "@/services/account.service";
import { geocodeAddress } from "@/lib/geocoding/nominatim";
import { AccountLiveUpdateSchema } from "@/schemas/account.schema";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;

let replSet: MongoMemoryReplSet;

// Shared test fixtures
let userId: string;
let companyId: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
  vi.clearAllMocks();

  // Seed reference data
  await SectorModel.create({ slug: "mecanique", kind: "B2B", name: { fr: "Mécanique" }, order: 1 });
  await GouvernoratModel.create({ slug: "sousse", name: { fr: "Sousse" }, order: 1 });

  // Create base user + company
  const company = await CompanyModel.create({
    slug: "technofab-industries",
    type: "B2B",
    legalId: "TN-RNE-001",
    accountEmail: "ahmed@technofab.tn",
    country: "TN",
    data: {
      displayName: { fr: "TechnoFab Industries", ar: "", en: "" },
      logoUrl: null,
      bannerUrl: null,
      color: "#0078D4",
    },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      contactEmail: "ahmed@technofab.tn",
      phone: "+21698000001",
      whatsapp: "+21698000001",
      languages: ["fr"],
    },
    status: "active",
    ownerUserId: new mongoose.Types.ObjectId(),
    ownerFullName: "Ahmed Mrabet",
  });

  const user = await UserModel.create({
    email: "ahmed@technofab.tn",
    firstName: "Ahmed",
    lastName: "Mrabet",
    passwordHash: "hashedpw",
    companyId: company._id,
    role: "OWNER",
    emailVerifiedAt: new Date(),
    languages: ["fr"],
  });

  // Fix ownerUserId back-reference
  await CompanyModel.findByIdAndUpdate(company._id, { ownerUserId: user._id });

  userId = user._id.toString();
  companyId = company._id.toString();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateMeAccount — identity fields", () => {
  it("PATCH with firstName updates User.firstName", async () => {
    const me = await updateMeAccount(userId, { firstName: "Mohamed" });

    expect(me.user.firstName).toBe("Mohamed");
    expect(me.user.lastName).toBe("Mrabet");

    // Verify DB
    const user = await UserModel.findById(userId).lean();
    expect(user.firstName).toBe("Mohamed");
  });

  it("PATCH with firstName+lastName recalculates Company.ownerFullName", async () => {
    const me = await updateMeAccount(userId, { firstName: "Mohamed", lastName: "Ben Ali" });

    expect(me.user.firstName).toBe("Mohamed");
    expect(me.user.lastName).toBe("Ben Ali");

    // Verify denormalization
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.ownerFullName).toBe("Mohamed Ben Ali");
  });

  it("PATCH without firstName/lastName does NOT touch User or ownerFullName", async () => {
    const me = await updateMeAccount(userId, { ville: "Monastir" });

    // User unchanged
    expect(me.user.firstName).toBe("Ahmed");
    expect(me.user.lastName).toBe("Mrabet");

    // ownerFullName unchanged
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.ownerFullName).toBe("Ahmed Mrabet");
    expect(company.liveData.ville).toBe("Monastir");
  });
});

describe("AccountLiveUpdateSchema — identity validation", () => {
  it("rejects empty firstName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.filter((i) => i.path[0] === "firstName");
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects firstName > 60 chars", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "A".repeat(61) });
    expect(result.success).toBe(false);
  });

  it("accepts valid firstName only (lastName omitted = optional)", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "Mohamed" });
    expect(result.success).toBe(true);
  });
});

describe("syncOwnerFullName", () => {
  it("updates Company.ownerFullName", async () => {
    await syncOwnerFullName(companyId, "Youssef", "Trabelsi");
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.ownerFullName).toBe("Youssef Trabelsi");
  });
});

describe("updateMeAccount — geocoding disabled", () => {
  it("does NOT trigger geocoding when ville changes (disabled V1.1)", async () => {
    const mockGeocode = geocodeAddress as ReturnType<typeof vi.fn>;

    await updateMeAccount(userId, { ville: "Sahline" });

    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it("does NOT trigger geocoding when only phone changes", async () => {
    const mockGeocode = geocodeAddress as ReturnType<typeof vi.fn>;

    await updateMeAccount(userId, { phone: "+21699000000" });

    expect(mockGeocode).not.toHaveBeenCalled();
  });
});

describe("updateMeAccount — displayName hard change", () => {
  it("creates pendingUpdates when displayName differs from current", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab International" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    expect(company.pendingUpdates.fields).toHaveLength(1);
    expect(company.pendingUpdates.fields[0].key).toBe("data.displayName");
    expect(company.pendingUpdates.fields[0].currentValue).toEqual({ fr: "TechnoFab Industries", ar: "", en: "" });
    expect(company.pendingUpdates.fields[0].newValue).toEqual({ fr: "TechnoFab International", ar: "", en: "" });
    // data.displayName unchanged
    expect(company.data.displayName.fr).toBe("TechnoFab Industries");
  });

  it("no-op when displayName is same as current", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab Industries" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });

  it("does not touch pendingUpdates when displayName not in patch", async () => {
    await updateMeAccount(userId, { ville: "Monastir" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });

  it("overwrites existing pending displayName with new submission", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab V2" });
    await updateMeAccount(userId, { displayName: "TechnoFab V3" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(1);
    expect(company.pendingUpdates.fields[0].newValue.fr).toBe("TechnoFab V3");
  });
});

describe("AccountLiveUpdateSchema — displayName validation", () => {
  it("rejects empty displayName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects displayName > 100 chars", () => {
    const result = AccountLiveUpdateSchema.safeParse({ displayName: "X".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts valid displayName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ displayName: "TechnoFab International" });
    expect(result.success).toBe(true);
  });
});

describe("updateMeAccount — gouvernorat hard change", () => {
  it("creates pendingUpdates when gouvernorat differs from current", async () => {
    await updateMeAccount(userId, { gouvernorat: "tunis" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    const gField = company.pendingUpdates.fields.find((f: any) => f.key === "liveData.gouvernorat");
    expect(gField).toBeDefined();
    expect(gField.currentValue).toBe("sousse");
    expect(gField.newValue).toBe("tunis");
    // liveData.gouvernorat unchanged
    expect(company.liveData.gouvernorat).toBe("sousse");
  });

  it("no-op when gouvernorat is same as current", async () => {
    await updateMeAccount(userId, { gouvernorat: "sousse" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });

  it("does not touch pendingUpdates when gouvernorat not in patch", async () => {
    await updateMeAccount(userId, { ville: "Monastir" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });

  it("overwrites existing pending gouvernorat", async () => {
    await updateMeAccount(userId, { gouvernorat: "tunis" });
    await updateMeAccount(userId, { gouvernorat: "sfax" });

    const company = await CompanyModel.findById(companyId).lean();
    const gFields = company.pendingUpdates.fields.filter((f: any) => f.key === "liveData.gouvernorat");
    expect(gFields).toHaveLength(1);
    expect(gFields[0].newValue).toBe("sfax");
  });

  it("handles displayName + gouvernorat together → 2 fields", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab International", gouvernorat: "tunis" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(2);
    const keys = company.pendingUpdates.fields.map((f: any) => f.key).sort();
    expect(keys).toEqual(["data.displayName", "liveData.gouvernorat"]);
  });
});

describe("AccountLiveUpdateSchema — gouvernorat validation", () => {
  it("rejects empty gouvernorat", () => {
    const result = AccountLiveUpdateSchema.safeParse({ gouvernorat: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid gouvernorat slug", () => {
    const result = AccountLiveUpdateSchema.safeParse({ gouvernorat: "sousse" });
    expect(result.success).toBe(true);
  });
});

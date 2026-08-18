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
  },
}));

import { updateMeAccount, syncOwnerFullName } from "@/services/account.service";
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
      gerantFirstName: "Ahmed",
      gerantLastName: "Mrabet",
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
// FB-7a: firstName/lastName now go through pendingUpdates (no longer instant)
// ---------------------------------------------------------------------------

describe("updateMeAccount — gerant identity (FB-7a: pendingUpdates)", () => {
  it("PATCH firstName → creates pendingUpdates with liveData.gerantFirstName key", async () => {
    await updateMeAccount(userId, { firstName: "Mohamed" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.gerantFirstName");
    expect(f).toBeDefined();
    expect(f.currentValue).toBe("Ahmed");
    expect(f.newValue).toBe("Mohamed");
    // liveData.gerantFirstName NOT changed yet
    expect(company.liveData.gerantFirstName).toBe("Ahmed");
  });

  it("PATCH firstName+lastName → 2 fields in pendingUpdates", async () => {
    await updateMeAccount(userId, { firstName: "Mohamed", lastName: "Ben Ali" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(2);
    const keys = company.pendingUpdates.fields.map((f: any) => f.key).sort();
    expect(keys).toEqual(["liveData.gerantFirstName", "liveData.gerantLastName"]);
  });

  it("PATCH firstName does NOT write User.firstName directly", async () => {
    await updateMeAccount(userId, { firstName: "Mohamed" });

    const user = await UserModel.findById(userId).lean();
    expect(user.firstName).toBe("Ahmed"); // User untouched
  });

  it("no-op when firstName same as current", async () => {
    await updateMeAccount(userId, { firstName: "Ahmed" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FB-7a: phone, contactEmail, whatsapp now go through pendingUpdates
// ---------------------------------------------------------------------------

describe("updateMeAccount — contact fields (FB-7a: pendingUpdates)", () => {
  it("PATCH phone → creates pendingUpdates (no longer instant)", async () => {
    await updateMeAccount(userId, { phone: "+21699123456" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.phone");
    expect(f).toBeDefined();
    expect(f.currentValue).toBe("+21698000001");
    expect(f.newValue).toBe("+21699123456");
    // liveData.phone NOT changed yet
    expect(company.liveData.phone).toBe("+21698000001");
  });

  it("PATCH whatsapp → creates pendingUpdates", async () => {
    await updateMeAccount(userId, { whatsapp: "+21699999999" });

    const company = await CompanyModel.findById(companyId).lean();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.whatsapp");
    expect(f).toBeDefined();
    expect(f.newValue).toBe("+21699999999");
    expect(company.liveData.whatsapp).toBe("+21698000001");
  });

  it("PATCH contactEmail → creates pendingUpdates", async () => {
    await updateMeAccount(userId, { contactEmail: "new@technofab.tn" });

    const company = await CompanyModel.findById(companyId).lean();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.contactEmail");
    expect(f).toBeDefined();
    expect(f.newValue).toBe("new@technofab.tn");
    expect(company.liveData.contactEmail).toBe("ahmed@technofab.tn");
  });

  it("PATCH phone + firstName → both in pendingUpdates", async () => {
    await updateMeAccount(userId, { phone: "+21699123456", firstName: "Mohamed" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(2);
    const keys = company.pendingUpdates.fields.map((f: any) => f.key).sort();
    expect(keys).toEqual(["liveData.gerantFirstName", "liveData.phone"]);
  });
});

// ---------------------------------------------------------------------------
// displayName, gouvernorat, ville, address still go through pendingUpdates
// ---------------------------------------------------------------------------

describe("updateMeAccount — displayName hard change (unchanged behavior)", () => {
  it("creates pendingUpdates when displayName differs from current", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab International" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    expect(company.pendingUpdates.fields).toHaveLength(1);
    expect(company.pendingUpdates.fields[0].key).toBe("data.displayName");
    expect(company.pendingUpdates.fields[0].currentValue).toEqual({ fr: "TechnoFab Industries", ar: "", en: "" });
    expect(company.pendingUpdates.fields[0].newValue).toEqual({ fr: "TechnoFab International", ar: "", en: "" });
    expect(company.data.displayName.fr).toBe("TechnoFab Industries");
  });

  it("no-op when displayName is same as current", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab Industries" });
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

describe("updateMeAccount — gouvernorat hard change", () => {
  it("creates pendingUpdates when gouvernorat differs", async () => {
    await updateMeAccount(userId, { gouvernorat: "tunis" });
    const company = await CompanyModel.findById(companyId).lean();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.gouvernorat");
    expect(f).toBeDefined();
    expect(f.currentValue).toBe("sousse");
    expect(f.newValue).toBe("tunis");
    expect(company.liveData.gouvernorat).toBe("sousse");
  });

  it("handles displayName + gouvernorat together → 2 fields", async () => {
    await updateMeAccount(userId, { displayName: "TechnoFab International", gouvernorat: "tunis" });
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(2);
    const keys = company.pendingUpdates.fields.map((f: any) => f.key).sort();
    expect(keys).toEqual(["data.displayName", "liveData.gouvernorat"]);
  });
});

describe("updateMeAccount — ville + address hard change", () => {
  it("creates pendingUpdates when ville differs", async () => {
    await updateMeAccount(userId, { ville: "Monastir" });
    const company = await CompanyModel.findById(companyId).lean();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.ville");
    expect(f).toBeDefined();
    expect(f.newValue).toBe("Monastir");
    expect(company.liveData.ville).toBe("Sousse");
  });

  it("creates pendingUpdates when address differs", async () => {
    await updateMeAccount(userId, { address: "Rue de la Liberté, Sousse" });
    const company = await CompanyModel.findById(companyId).lean();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "liveData.address");
    expect(f).toBeDefined();
    expect(f.newValue).toBe("Rue de la Liberté, Sousse");
  });

  it("no-op when address is same as current (both null → empty string)", async () => {
    // Set address to null explicitly
    await CompanyModel.findByIdAndUpdate(companyId, { "liveData.address": null });
    await updateMeAccount(userId, { address: "" });
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });

  it("gouvernorat + ville + address → 3 separate fields", async () => {
    await updateMeAccount(userId, {
      gouvernorat: "tunis",
      ville: "Ariana",
      address: "Avenue de la République",
    });
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates.fields).toHaveLength(3);
    const keys = company.pendingUpdates.fields.map((f: any) => f.key).sort();
    expect(keys).toEqual(["liveData.address", "liveData.gouvernorat", "liveData.ville"]);
  });
});

// ---------------------------------------------------------------------------
// gpsPosition stays live (instant, no pendingUpdates)
// ---------------------------------------------------------------------------

describe("updateMeAccount — gpsPosition stays live", () => {
  it("PATCH gpsPosition → liveData updated, NO pendingUpdates", async () => {
    await updateMeAccount(userId, {
      gpsPosition: { type: "Point", coordinates: [10.7148, 35.7628] },
    });
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.gpsPosition).toEqual({ type: "Point", coordinates: [10.7148, 35.7628] });
    expect(company.pendingUpdates).toBeNull();
  });

  it("PATCH gpsPosition + phone → gps live, phone pending", async () => {
    await updateMeAccount(userId, {
      gpsPosition: { type: "Point", coordinates: [10.1, 36.8] },
      phone: "+21699888888",
    });
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.liveData.gpsPosition.coordinates).toEqual([10.1, 36.8]);
    expect(company.pendingUpdates).not.toBeNull();
    expect(company.liveData.phone).toBe("+21698000001"); // unchanged
  });
});

// ---------------------------------------------------------------------------
// C3 lockdown: Zod .strict() rejects unknown keys
// ---------------------------------------------------------------------------

describe("AccountLiveUpdateSchema — C3 lockdown (.strict())", () => {
  it("rejects unknown key gerantFirstName (not a valid patch key)", () => {
    const result = AccountLiveUpdateSchema.safeParse({ gerantFirstName: "Hacker" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("rejects unknown key gerantLastName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ gerantLastName: "Hacker" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown key ownerFullName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ ownerFullName: "Hack" });
    expect(result.success).toBe(false);
  });

  it("accepts valid known keys", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "Mohamed" });
    expect(result.success).toBe(true);
  });

  it("rejects empty firstName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects firstName > 60 chars", () => {
    const result = AccountLiveUpdateSchema.safeParse({ firstName: "A".repeat(61) });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zod validation for existing fields (unchanged)
// ---------------------------------------------------------------------------

describe("AccountLiveUpdateSchema — validation", () => {
  it("rejects empty displayName", () => {
    const result = AccountLiveUpdateSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid gouvernorat slug", () => {
    const result = AccountLiveUpdateSchema.safeParse({ gouvernorat: "sousse" });
    expect(result.success).toBe(true);
  });

  it("rejects coordinates out of bounds", () => {
    const result = AccountLiveUpdateSchema.safeParse({
      gpsPosition: { type: "Point", coordinates: [200, 35] },
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid GeoJSON Point", () => {
    const result = AccountLiveUpdateSchema.safeParse({
      gpsPosition: { type: "Point", coordinates: [10.7148, 35.7628] },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// syncOwnerFullName
// ---------------------------------------------------------------------------

describe("syncOwnerFullName", () => {
  it("updates Company.ownerFullName", async () => {
    await syncOwnerFullName(companyId, "Youssef", "Trabelsi");
    const company = await CompanyModel.findById(companyId).lean();
    expect(company.ownerFullName).toBe("Youssef Trabelsi");
  });
});

// ---------------------------------------------------------------------------
// MeResponse exposes Company.gerant* (not User.firstName)
// ---------------------------------------------------------------------------

describe("updateMeAccount — MeResponse shape", () => {
  it("MeResponse exposes company.gerantFirstName from liveData", async () => {
    const me = await updateMeAccount(userId, {
      gpsPosition: { type: "Point", coordinates: [10.5, 35.5] },
    });

    // Company fields
    expect(me.company.gerantFirstName).toBe("Ahmed");
    expect(me.company.gerantLastName).toBe("Mrabet");
    // User fields still present (audit-only)
    expect(me.user.firstName).toBe("Ahmed");
    expect(me.user.lastName).toBe("Mrabet");
  });
});

// ---------------------------------------------------------------------------
// FB-7b: identityDocumentUrl goes through pendingUpdates
// ---------------------------------------------------------------------------

describe("updateMeAccount — identityDocumentUrl (FB-7b)", () => {
  it("PATCH identityDocumentUrl → creates pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, { identityDocumentUrl: "https://old-doc.pdf" });
    await updateMeAccount(userId, { identityDocumentUrl: "https://new-doc.pdf" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).not.toBeNull();
    const f = company.pendingUpdates.fields.find((x: any) => x.key === "identityDocumentUrl");
    expect(f).toBeDefined();
    expect(f.currentValue).toBe("https://old-doc.pdf");
    expect(f.newValue).toBe("https://new-doc.pdf");
    // identityDocumentUrl NOT changed yet
    expect(company.identityDocumentUrl).toBe("https://old-doc.pdf");
  });

  it("no-op when identityDocumentUrl same as current", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, { identityDocumentUrl: "https://same.pdf" });
    await updateMeAccount(userId, { identityDocumentUrl: "https://same.pdf" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FB-7b: lastPendingRejection cleared on new submission
// ---------------------------------------------------------------------------

describe("updateMeAccount — lastPendingRejection cleared (FB-7b)", () => {
  it("clears lastPendingRejection when new pendingUpdates are submitted", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, {
      lastPendingRejection: { note: "Refusé", rejectedAt: new Date() },
    });

    await updateMeAccount(userId, { displayName: "New Name" });

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.lastPendingRejection).toBeNull();
    expect(company.pendingUpdates).not.toBeNull();
  });
});

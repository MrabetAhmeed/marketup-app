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

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.dev",
    NOMINATIM_USER_AGENT: "TEST/1.0",
  },
}));
vi.mock("@/lib/geocoding/nominatim", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
}));

import { approvePendingUpdates, rejectPendingUpdates } from "@/services/admin-company.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;

let replSet: MongoMemoryReplSet;
let companyId: string;
const adminId = new mongoose.Types.ObjectId().toString();

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

  await SectorModel.create({ slug: "mecanique", kind: "B2B", name: { fr: "Mécanique" }, order: 1 });
  await GouvernoratModel.create({ slug: "sousse", name: { fr: "Sousse" }, order: 1 });

  const user = await UserModel.create({
    email: "ahmed@technofab.tn",
    firstName: "Ahmed",
    lastName: "Mrabet",
    passwordHash: "hashedpw",
    role: "OWNER",
    emailVerifiedAt: new Date(),
    languages: ["fr"],
  });

  const company = await CompanyModel.create({
    slug: "technofab-industries",
    type: "B2B",
    legalId: "TN-RNE-001",
    accountEmail: "ahmed@technofab.tn",
    country: "TN",
    data: {
      displayName: { fr: "TechnoFab Industries", ar: "", en: "" },
    },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      contactEmail: "ahmed@technofab.tn",
      languages: ["fr"],
    },
    status: "active",
    ownerUserId: user._id,
    pendingUpdates: {
      submittedAt: new Date(),
      fields: [{
        key: "data.displayName",
        label: "Nom de l'entreprise",
        currentValue: { fr: "TechnoFab Industries", ar: "", en: "" },
        newValue: { fr: "TechnoFab International", ar: "", en: "" },
      }],
    },
  });

  await UserModel.findByIdAndUpdate(user._id, { companyId: company._id });
  companyId = company._id.toString();
});

describe("approvePendingUpdates", () => {
  it("merges data.displayName and clears pendingUpdates", async () => {
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.data.displayName).toEqual({ fr: "TechnoFab International", ar: "", en: "" });
    expect(company.pendingUpdates).toBeNull();
  });

  it("adds audit trail entry", async () => {
    await approvePendingUpdates(companyId, adminId);

    const company = await CompanyModel.findById(companyId).lean();
    const lastAudit = company.auditTrail[company.auditTrail.length - 1];
    expect(lastAudit.action).toBe("approve_pending_updates");
    expect(lastAudit.byRole).toBe("SUPER_ADMIN");
    expect(lastAudit.details.fields).toContain("data.displayName");
  });

  it("throws when no pendingUpdates", async () => {
    await CompanyModel.findByIdAndUpdate(companyId, { pendingUpdates: null });

    await expect(approvePendingUpdates(companyId, adminId)).rejects.toThrow("Aucune modification en attente");
  });
});

describe("rejectPendingUpdates", () => {
  it("clears pendingUpdates but keeps data unchanged", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    expect(company.pendingUpdates).toBeNull();
    expect(company.data.displayName.fr).toBe("TechnoFab Industries");
  });

  it("adds audit trail entry with note", async () => {
    await rejectPendingUpdates(companyId, adminId, "Nom non conforme");

    const company = await CompanyModel.findById(companyId).lean();
    const lastAudit = company.auditTrail[company.auditTrail.length - 1];
    expect(lastAudit.action).toBe("reject_pending_updates");
    expect(lastAudit.details.note).toBe("Nom non conforme");
  });
});

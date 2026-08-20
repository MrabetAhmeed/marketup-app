/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { SignupCompanySchema } from "@/schemas/auth.schema";
import { AccountLiveUpdateSchema } from "@/schemas/account.schema";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";

vi.mock("@/lib/db", () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyUpdatesApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCompanyUpdatesRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "http://localhost:3000", RESEND_API_KEY: "", EMAIL_FROM: "t@t.dev" },
}));

import { updateMeAccount } from "@/services/account.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;

let replSet: MongoMemoryReplSet;
let userId: string;
let companyId: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
});
afterAll(async () => { await mongoose.disconnect(); await replSet.stop(); });

beforeEach(async () => {
  for (const key of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[key]!.deleteMany({});
  }
  vi.clearAllMocks();
  await SectorModel.create({ slug: "meca", kind: "B2B", name: { fr: "Meca" }, order: 1 });
  await GouvernoratModel.create({ slug: "sousse", name: { fr: "Sousse" }, order: 1 });
  const user = await UserModel.create({ email: "a@b.tn", passwordHash: "x", role: "OWNER" });
  userId = String(user._id);
  const company = await CompanyModel.create({
    slug: "test-co", type: "B2B", legalId: "1234567A", accountEmail: "a@b.tn", country: "TN",
    data: { displayName: { fr: "Test" }, logoUrl: null, bannerUrl: null, color: "#0078D4" },
    liveData: { sectorId: "meca", gouvernorat: "sousse", ville: "Sousse", contactEmail: "a@b.tn", postalCode: "4000", languages: ["fr"] },
    ownerUserId: user._id, status: "active", registeredAt: new Date(), validatedAt: new Date(),
  });
  companyId = String(company._id);
  await UserModel.findByIdAndUpdate(userId, { companyId });
});

const VALID_BASE = {
  type: "B2B" as const, displayName: "X", legalId: "1234567A", vatNumber: null,
  accountEmail: "a@b.tn", sectorId: "meca", gouvernorat: "sousse", ville: "Sousse",
  address: "Rue X", identityDocumentUrl: "https://cdn.x.com/d.pdf",
};

describe("postalCode — Zod validation", () => {
  it("accepts valid 4-digit code", () => {
    const r = SignupCompanySchema.safeParse({ ...VALID_BASE, postalCode: "4000" });
    expect(r.success).toBe(true);
  });

  it("rejects 3-digit code", () => {
    const r = SignupCompanySchema.safeParse({ ...VALID_BASE, postalCode: "400" });
    expect(r.success).toBe(false);
  });

  it("rejects 5-digit code", () => {
    const r = SignupCompanySchema.safeParse({ ...VALID_BASE, postalCode: "40000" });
    expect(r.success).toBe(false);
  });

  it("rejects alphanumeric code", () => {
    const r = SignupCompanySchema.safeParse({ ...VALID_BASE, postalCode: "4a00" });
    expect(r.success).toBe(false);
  });

  it("rejects missing postalCode at signup", () => {
    const r = SignupCompanySchema.safeParse({ ...VALID_BASE });
    expect(r.success).toBe(false);
  });

  it("accepts postalCode in AccountLiveUpdateSchema", () => {
    const r = AccountLiveUpdateSchema.safeParse({ postalCode: "1000" });
    expect(r.success).toBe(true);
  });
});

describe("postalCode — pendingUpdates", () => {
  it("enters pendingUpdates with correct label", async () => {
    await updateMeAccount(userId, { postalCode: "1000" }, "fr");
    const company = await CompanyModel.findById(companyId).lean() as any;
    expect(company.pendingUpdates).not.toBeNull();
    const field = company.pendingUpdates.fields.find((f: any) => f.key === "liveData.postalCode");
    expect(field).toBeDefined();
    expect(field.label).toBe("Code postal");
    expect(field.newValue).toBe("1000");
    expect(field.currentValue).toBe("4000");
  });
});

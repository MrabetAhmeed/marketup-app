/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import { LinkUp } from "@/models/profile-linkup.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email/sender", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendProfileSubmittedEmail: vi.fn().mockResolvedValue(undefined),
  sendProfileValidatedEmail: vi.fn().mockResolvedValue(undefined),
  sendProfileRejectedEmail: vi.fn().mockResolvedValue(undefined),
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
    ADMIN_NOTIFICATION_EMAIL: "admin@test.dev",
  },
}));
vi.mock("@/lib/geocoding/nominatim", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
}));

import { submitProfile, cancelPendingSubmission } from "@/services/profile-hard.service";
import { validateProfileByAdmin, rejectProfileByAdmin } from "@/services/admin-profile.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const LinkUpModel = LinkUp as any;

let replSet: MongoMemoryReplSet;
let userId: string;
let companyId: string;
let linkupProfileId: string;
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

  const company = await CompanyModel.create({
    slug: "technofab-industries",
    type: "B2B",
    legalId: "TN-RNE-001",
    accountEmail: "ahmed@technofab.tn",
    country: "TN",
    data: { displayName: { fr: "TechnoFab Industries", ar: "", en: "" } },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      contactEmail: "ahmed@technofab.tn",
      languages: ["fr"],
    },
    status: "active",
    ownerUserId: new mongoose.Types.ObjectId(),
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

  await CompanyModel.findByIdAndUpdate(company._id, { ownerUserId: user._id });

  const linkup = await LinkUpModel.create({
    companyId: company._id,
    status: "active",
    isPublic: true,
    data: {
      socials: [
        { platform: "website", url: "" },
        { platform: "linkedin", url: "https://linkedin.com/old" },
        { platform: "facebook", url: "" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    },
    publishedAt: new Date(),
    stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
  });

  userId = user._id.toString();
  companyId = company._id.toString();
  linkupProfileId = linkup._id.toString();
});

describe("LinkUP hard submit — socials", () => {
  it("submit creates pendingData with socials snapshot", async () => {
    await submitProfile(linkupProfileId, userId, {
      socials: [
        { platform: "website", url: "" },
        { platform: "linkedin", url: "https://linkedin.com/new" },
        { platform: "facebook", url: "https://facebook.com/test" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    });

    const profile = await ProfileModel.findById(linkupProfileId).lean();
    expect(profile.status).toBe("pending");
    expect(profile.pendingData).not.toBeNull();
    expect(profile.pendingData.fields).toHaveLength(1);
    expect(profile.pendingData.fields[0].key).toBe("socials");
    expect(profile.pendingData.fields[0].newValue).toEqual([
      { platform: "website", url: "" },
      { platform: "linkedin", url: "https://linkedin.com/new" },
      { platform: "facebook", url: "https://facebook.com/test" },
      { platform: "instagram", url: "" },
      { platform: "youtube", url: "" },
    ]);
    expect(profile.pendingData.previousStatus).toBe("active");
  });

  it("re-submit while pending throws ALREADY_PENDING", async () => {
    await submitProfile(linkupProfileId, userId, {
      socials: [
        { platform: "website", url: "" },
        { platform: "linkedin", url: "https://linkedin.com/new" },
        { platform: "facebook", url: "" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    });

    await expect(
      submitProfile(linkupProfileId, userId, {
        socials: [
          { platform: "website", url: "https://test.com" },
          { platform: "linkedin", url: "" },
          { platform: "facebook", url: "" },
          { platform: "instagram", url: "" },
          { platform: "youtube", url: "" },
        ],
      }),
    ).rejects.toThrow("en attente de validation");
  });

  it("cancel restores previousStatus and clears pendingData", async () => {
    await submitProfile(linkupProfileId, userId, {
      socials: [
        { platform: "website", url: "" },
        { platform: "linkedin", url: "https://linkedin.com/new" },
        { platform: "facebook", url: "" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    });

    await cancelPendingSubmission(linkupProfileId, userId);

    const profile = await ProfileModel.findById(linkupProfileId).lean();
    expect(profile.status).toBe("active");
    expect(profile.pendingData).toBeNull();
  });

  it("admin validate merges socials into data", async () => {
    await submitProfile(linkupProfileId, userId, {
      socials: [
        { platform: "website", url: "https://technofab.tn" },
        { platform: "linkedin", url: "https://linkedin.com/new" },
        { platform: "facebook", url: "https://facebook.com/tf" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    });

    await validateProfileByAdmin(linkupProfileId, adminId);

    const profile = await ProfileModel.findById(linkupProfileId).lean();
    expect(profile.status).toBe("active");
    expect(profile.pendingData).toBeNull();

    const linkedinSocial = profile.data.socials.find((s: any) => s.platform === "linkedin");
    expect(linkedinSocial.url).toBe("https://linkedin.com/new");

    const facebookSocial = profile.data.socials.find((s: any) => s.platform === "facebook");
    expect(facebookSocial.url).toBe("https://facebook.com/tf");
  });

  it("admin reject clears pendingData and sets status=rejected", async () => {
    await submitProfile(linkupProfileId, userId, {
      socials: [
        { platform: "website", url: "" },
        { platform: "linkedin", url: "https://linkedin.com/new" },
        { platform: "facebook", url: "" },
        { platform: "instagram", url: "" },
        { platform: "youtube", url: "" },
      ],
    });

    await rejectProfileByAdmin(linkupProfileId, adminId, "Liens suspects");

    const profile = await ProfileModel.findById(linkupProfileId).lean();
    expect(profile.status).toBe("rejected");
    expect(profile.pendingData).toBeNull();
    expect(profile.rejectionReason).toBe("Liens suspects");

    // Original socials unchanged
    const linkedinSocial = profile.data.socials.find((s: any) => s.platform === "linkedin");
    expect(linkedinSocial.url).toBe("https://linkedin.com/old");
  });

  it("LinkupHardSubmitSchema rejects invalid URL", async () => {
    await expect(
      submitProfile(linkupProfileId, userId, {
        socials: [
          { platform: "website", url: "not-a-url" },
          { platform: "linkedin", url: "" },
          { platform: "facebook", url: "" },
          { platform: "instagram", url: "" },
          { platform: "youtube", url: "" },
        ],
      }),
    ).rejects.toThrow();
  });

  it("LinkupHardSubmitSchema rejects duplicate platforms", async () => {
    await expect(
      submitProfile(linkupProfileId, userId, {
        socials: [
          { platform: "linkedin", url: "" },
          { platform: "linkedin", url: "https://test.com" },
        ],
      }),
    ).rejects.toThrow();
  });
});

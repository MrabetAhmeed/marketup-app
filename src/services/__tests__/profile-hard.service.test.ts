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
import { TraceUp } from "@/models/profile-traceup.model";
import "@/models/profile-brandup.model";

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
vi.mock("@/lib/video/parsers", () => ({
  extractVideoId: vi.fn().mockImplementation((_p: string, url: string) => url.split("v=")[1] ?? url.split("/").pop() ?? "mockId"),
  buildVideoUrl: vi.fn().mockImplementation((_p: string, id: string) => `https://youtube.com/watch?v=${id}`),
  isValidVideoUrl: vi.fn().mockReturnValue(true),
}));
vi.mock("@/lib/video/oembed", () => ({
  fetchVideoMetadata: vi.fn().mockResolvedValue({ thumbnailUrl: "https://thumb.test/img.jpg" }),
}));

import { submitProfile, cancelPendingSubmission } from "@/services/profile-hard.service";
import { validateProfileByAdmin, rejectProfileByAdmin } from "@/services/admin-profile.service";
import { createVideo, deleteVideo, removeVideoFromPending } from "@/services/profile-video.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const LinkUpModel = LinkUp as any;
const TraceUpModel = TraceUp as any;

let replSet: MongoMemoryReplSet;
let userId: string;
let _companyId: string;
let linkupProfileId: string;
let traceupProfileId: string;
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

  const traceup = await TraceUpModel.create({
    companyId: company._id,
    status: "active",
    isPublic: true,
    data: {
      videos: [
        { id: "v1", source: "youtube", videoId: "abc123", videoUrl: "https://youtube.com/watch?v=abc123", thumbnailUrl: null, category: "actualite", title: { fr: "Video 1" }, description: { fr: "" }, status: "active", publishedAt: new Date() },
        { id: "v2", source: "youtube", videoId: "def456", videoUrl: "https://youtube.com/watch?v=def456", thumbnailUrl: null, category: "offres", title: { fr: "Video 2" }, description: { fr: "" }, status: "active", publishedAt: new Date() },
      ],
    },
    publishedAt: new Date(),
    stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
  });

  userId = user._id.toString();
  _companyId = company._id.toString();
  linkupProfileId = linkup._id.toString();
  traceupProfileId = traceup._id.toString();
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

// ---------------------------------------------------------------------------
// TraceUP videos hard change (PP-11)
// ---------------------------------------------------------------------------

describe("TraceUP hard change — createVideo → pendingData", () => {
  it("createVideo writes to pendingData and transitions to pending", async () => {
    await createVideo(traceupProfileId, userId, {
      platform: "youtube",
      url: "https://youtube.com/watch?v=newVid1",
      title: "New Video",
      description: "Desc",
      category: "actualite",
    });

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    expect(profile.status).toBe("pending");
    expect(profile.pendingData).not.toBeNull();
    expect(profile.pendingData.fields[0].key).toBe("videos");
    // Snapshot = data videos (v1, v2) + new video
    const snapshot = profile.pendingData.fields[0].newValue;
    expect(snapshot.length).toBe(3);
    // data.videos unchanged (still 2)
    expect(profile.data.videos.length).toBe(2);
  });

  it("second createVideo during pending updates snapshot", async () => {
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=vid3",
      title: "V3", description: "", category: "offres",
    });
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=vid4",
      title: "V4", description: "", category: "astuces",
    });

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    const snapshot = profile.pendingData.fields[0].newValue;
    expect(snapshot.length).toBe(4); // v1 + v2 + vid3 + vid4
  });
});

describe("TraceUP hard change — deleteVideo guard", () => {
  it("deleteVideo blocked during pending", async () => {
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid",
      title: "New", description: "", category: "actualite",
    });

    await expect(
      deleteVideo(traceupProfileId, userId, "v1"),
    ).rejects.toThrow("validation en cours");
  });

  it("deleteVideo works during active", async () => {
    await deleteVideo(traceupProfileId, userId, "v1");
    const profile = await ProfileModel.findById(traceupProfileId).lean();
    expect(profile.data.videos.length).toBe(1);
    expect(profile.data.videos[0].id).toBe("v2");
  });
});

describe("TraceUP hard change — removeVideoFromPending + auto-recovery", () => {
  it("removeVideoFromPending removes from snapshot", async () => {
    const _result = await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid",
      title: "New", description: "", category: "actualite",
    });

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    const snapshot = profile.pendingData.fields[0].newValue;
    const newVideoId = snapshot[snapshot.length - 1].id;

    await removeVideoFromPending(traceupProfileId, userId, newVideoId);

    // Auto-recovery: snapshot (v1,v2) == data (v1,v2) → pending cleared
    const p2 = await ProfileModel.findById(traceupProfileId).lean();
    expect(p2.pendingData).toBeNull();
    expect(p2.status).toBe("active");
  });
});

describe("TraceUP hard change — admin validate/reject", () => {
  it("validate merges pending videos into data.videos", async () => {
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid",
      title: "New Vid", description: "", category: "actualite",
    });

    await validateProfileByAdmin(traceupProfileId, adminId);

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    expect(profile.status).toBe("active");
    expect(profile.pendingData).toBeNull();
    expect(profile.data.videos.length).toBe(3);
  });

  it("reject keeps pendingData with note, status=rejected", async () => {
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid",
      title: "New Vid", description: "", category: "actualite",
    });

    await rejectProfileByAdmin(traceupProfileId, adminId, "Contenu inapproprié");

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    expect(profile.status).toBe("rejected");
    expect(profile.rejectionReason).toBe("Contenu inapproprié");
    expect(profile.data.videos.length).toBe(2); // unchanged
  });

  it("re-submit from rejected: createVideo auto-transitions rejected → pending (fix α)", async () => {
    // Setup: add video, get rejected (reject clears pendingData)
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid",
      title: "New", description: "", category: "actualite",
    });
    await rejectProfileByAdmin(traceupProfileId, adminId, "bad");

    const rejected = await ProfileModel.findById(traceupProfileId).lean();
    expect(rejected.status).toBe("rejected");

    // Owner adds a new video after rejection → auto-transitions to pending (fix α PP-11.5)
    await createVideo(traceupProfileId, userId, {
      platform: "youtube", url: "https://youtube.com/watch?v=newVid2",
      title: "New V2", description: "", category: "offres",
    });

    const profile = await ProfileModel.findById(traceupProfileId).lean();
    expect(profile.status).toBe("pending");
    expect(profile.pendingData.fields[0].key).toBe("videos");
    // data (v1,v2) + new video added after reject
    expect(profile.pendingData.fields[0].newValue.length).toBe(3);
  });
});

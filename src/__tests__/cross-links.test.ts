/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";

vi.mock("@/lib/db", () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email/sender", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "http://localhost:3000", RESEND_API_KEY: "", EMAIL_FROM: "t@t.dev" },
}));

import { getPublicProfileBySlug } from "@/services/public-profile.service";
import type { PublicBrandUpProfile, PublicTraceUpProfile, PublicLinkUpProfile } from "@/services/public-profile.service";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const UserModel = User as any;
const CompanyModel = Company as any;
const ProfileModel = Profile as any;

let replSet: MongoMemoryReplSet;

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
});

async function createCompanyWithProfiles(opts: {
  brandup?: { status: string; isPublic: boolean; publishedAt?: Date | null };
  traceup?: { status: string; isPublic: boolean; publishedAt?: Date | null };
  linkup?: { status: string; isPublic: boolean; publishedAt?: Date | null };
}): Promise<string> {
  const user = await UserModel.create({ email: `u${Date.now()}@t.tn`, passwordHash: "x", role: "OWNER" });
  const company = await CompanyModel.create({
    slug: `co-${Date.now()}`, type: "B2B", legalId: `${Date.now()}`.slice(-7) + "A",
    accountEmail: user.email, country: "TN",
    data: { displayName: { fr: "Test" }, logoUrl: null, bannerUrl: null, color: "#0078D4" },
    liveData: { sectorId: "meca", gouvernorat: "sousse", ville: "Sousse", contactEmail: user.email, languages: ["fr"] },
    ownerUserId: user._id, status: "active", registeredAt: new Date(), validatedAt: new Date(),
  });
  await UserModel.findByIdAndUpdate(user._id, { companyId: company._id });

  for (const kind of ["brandup", "traceup", "linkup"] as const) {
    const cfg = opts[kind];
    if (cfg) {
      await ProfileModel.create({
        companyId: company._id,
        kind,
        status: cfg.status,
        isPublic: cfg.isPublic,
        publishedAt: cfg.publishedAt ?? null,
        data: kind === "brandup"
          ? { pitch: { fr: "" }, about: { fr: "" }, color: "#0078D4", links: [], gallery: [], projects: [], certifications: [], services: [] }
          : kind === "traceup"
            ? { videos: [] }
            : { socials: [], qrConfig: { style: "rounded", colorForeground: "#000", colorBackground: "#FFF", logoOverlay: false } },
      });
    }
  }

  return company.slug as string;
}

describe("resolveSiblingProfiles / cross-links", () => {
  it("returns visible siblings for brandup profile", async () => {
    const now = new Date();
    const slug = await createCompanyWithProfiles({
      brandup: { status: "active", isPublic: true, publishedAt: now },
      traceup: { status: "active", isPublic: true, publishedAt: now },
      linkup: { status: "active", isPublic: true, publishedAt: now },
    });

    const result = await getPublicProfileBySlug("brandup", slug) as PublicBrandUpProfile;
    expect(result.siblingProfiles.traceup).toBe(true);
    expect(result.siblingProfiles.linkup).toBe(true);
    expect(result.siblingProfiles.brandup).toBe(false); // current profile excluded
  });

  it("hides non-existent sibling profiles", async () => {
    const now = new Date();
    const slug = await createCompanyWithProfiles({
      brandup: { status: "active", isPublic: true, publishedAt: now },
      // traceup and linkup not created
    });

    const result = await getPublicProfileBySlug("brandup", slug) as PublicBrandUpProfile;
    expect(result.siblingProfiles.traceup).toBe(false);
    expect(result.siblingProfiles.linkup).toBe(false);
  });

  it("hides sibling that is not publicly visible (isPublic=false)", async () => {
    const now = new Date();
    const slug = await createCompanyWithProfiles({
      traceup: { status: "active", isPublic: true, publishedAt: now },
      brandup: { status: "active", isPublic: false, publishedAt: now }, // hidden by owner
      linkup: { status: "active", isPublic: true, publishedAt: now },
    });

    const result = await getPublicProfileBySlug("traceup", slug) as PublicTraceUpProfile;
    expect(result.siblingProfiles.brandup).toBe(false); // hidden
    expect(result.siblingProfiles.linkup).toBe(true);
  });

  it("hides sibling with incomplete status", async () => {
    const now = new Date();
    const slug = await createCompanyWithProfiles({
      linkup: { status: "active", isPublic: true, publishedAt: now },
      brandup: { status: "incomplete", isPublic: true },
      traceup: { status: "active", isPublic: true, publishedAt: now },
    });

    const result = await getPublicProfileBySlug("linkup", slug) as PublicLinkUpProfile;
    expect(result.siblingProfiles.brandup).toBe(false); // incomplete
    expect(result.siblingProfiles.traceup).toBe(true);
  });

  it("covers all 3 kinds — linkup visible from traceup perspective", async () => {
    const now = new Date();
    const slug = await createCompanyWithProfiles({
      traceup: { status: "active", isPublic: true, publishedAt: now },
      linkup: { status: "active", isPublic: true, publishedAt: now },
    });

    const result = await getPublicProfileBySlug("traceup", slug) as PublicTraceUpProfile;
    expect(result.siblingProfiles.linkup).toBe(true);
    expect(result.siblingProfiles.brandup).toBe(false); // not created
  });
});

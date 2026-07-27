/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "",
    EMAIL_FROM: "test@test.com",
    MONGODB_URI: "mongodb://localhost",
  },
}));
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { ProfileStatsMonthlyModel } from "@/models/profile-stats-monthly.model";
import {
  recordTrackEvent,
  isBot,
  getCurrentMonth,
  getPreviousMonth,
  computeTrend,
  getProfileMonthlyStats,
} from "@/services/track.service";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
}, 30_000);

// Helpers
async function createCompanyAndProfile(
  status: string = "active",
  companyStatus: string = "active",
): Promise<{ companyId: string; profileId: string }> {
  const uid = new mongoose.Types.ObjectId();
  const company = await (Company as any).create({
    type: "B2B",
    status: companyStatus,
    slug: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    legalId: `RNE${Date.now()}`,
    accountEmail: `test${Date.now()}@test.tn`,
    ownerUserId: uid,
    data: { displayName: { fr: "Test Co" } },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      contactEmail: "c@test.tn",
    },
    registeredAt: new Date(),
  });
  const profile = await (Profile as any).create({
    companyId: company._id,
    kind: "brandup",
    status,
    isPublic: true,
    stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
    data: {},
  });
  return { companyId: company._id.toString(), profileId: profile._id.toString() };
}

beforeEach(async () => {
  await ProfileStatsMonthlyModel.deleteMany({});
});

// =====================================================================
// Pure functions
// =====================================================================

describe("isBot", () => {
  it("returns true for bot user agents", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Lighthouse")).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it("returns false for normal user agents", () => {
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe(false);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS) Safari")).toBe(false);
  });
});

describe("getCurrentMonth", () => {
  it("returns YYYY-MM format", () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("getPreviousMonth", () => {
  it("returns previous month", () => {
    expect(getPreviousMonth("2026-07")).toBe("2026-06");
    expect(getPreviousMonth("2026-01")).toBe("2025-12");
    expect(getPreviousMonth("2026-03")).toBe("2026-02");
  });
});

describe("computeTrend", () => {
  it("returns null when previous is null", () => {
    expect(computeTrend(100, null)).toBeNull();
  });

  it("returns positive delta", () => {
    const trend = computeTrend(150, 100);
    expect(trend).toEqual({ value: 50, label: "+50" });
  });

  it("returns negative delta", () => {
    const trend = computeTrend(80, 100);
    expect(trend).toEqual({ value: -20, label: "-20" });
  });

  it("returns zero delta", () => {
    const trend = computeTrend(100, 100);
    expect(trend).toEqual({ value: 0, label: "0" });
  });
});

// =====================================================================
// recordTrackEvent
// =====================================================================

describe("recordTrackEvent", () => {
  it("increments view on ProfileStatsMonthly and Profile.stats.viewsTotal", async () => {
    const { profileId } = await createCompanyAndProfile();
    const month = getCurrentMonth();

    await recordTrackEvent({ profileId, event: "view" }, "Mozilla/5.0 Chrome");

    const stat = await (ProfileStatsMonthlyModel as any).findOne({ profileId, month }).lean() as any;
    expect(stat).not.toBeNull();
    expect(stat.views).toBe(1);
    expect(stat.clicks).toBe(0);

    const profile = await (Profile as any).findById(profileId).lean();
    expect(profile.stats.viewsTotal).toBe(1);
    expect(profile.stats.clicksTotal).toBe(0);
  });

  it("increments click on ProfileStatsMonthly and Profile.stats.clicksTotal", async () => {
    const { profileId } = await createCompanyAndProfile();

    await recordTrackEvent({ profileId, event: "click" }, "Mozilla/5.0 Chrome");

    const month = getCurrentMonth();
    const stat = await (ProfileStatsMonthlyModel as any).findOne({ profileId, month }).lean() as any;
    expect(stat.clicks).toBe(1);
    expect(stat.views).toBe(0);

    const profile = await (Profile as any).findById(profileId).lean();
    expect(profile.stats.clicksTotal).toBe(1);
  });

  it("upserts same (profileId, month) — 2 events = counter 2", async () => {
    const { profileId } = await createCompanyAndProfile();

    await recordTrackEvent({ profileId, event: "view" }, "Chrome");
    await recordTrackEvent({ profileId, event: "view" }, "Chrome");

    const month = getCurrentMonth();
    const docs = await (ProfileStatsMonthlyModel as any).find({ profileId, month }).lean();
    expect(docs).toHaveLength(1);
    expect((docs[0] as any).views).toBe(2);
  });

  it("no-op for unknown profileId", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await recordTrackEvent({ profileId: fakeId, event: "view" }, "Chrome");

    const docs = await (ProfileStatsMonthlyModel as any).find({ profileId: fakeId }).lean();
    expect(docs).toHaveLength(0);
  });

  it("no-op when company is suspended", async () => {
    const { profileId } = await createCompanyAndProfile("active", "suspended");
    await recordTrackEvent({ profileId, event: "view" }, "Chrome");

    const docs = await (ProfileStatsMonthlyModel as any).find({ profileId }).lean();
    expect(docs).toHaveLength(0);
  });

  it("no-op when company is deleted", async () => {
    const { profileId } = await createCompanyAndProfile("active", "deleted");
    await recordTrackEvent({ profileId, event: "view" }, "Chrome");

    const docs = await (ProfileStatsMonthlyModel as any).find({ profileId }).lean();
    expect(docs).toHaveLength(0);
  });

  it("no-op for bot user agent", async () => {
    const { profileId } = await createCompanyAndProfile();
    await recordTrackEvent({ profileId, event: "view" }, "Googlebot/2.1");

    const docs = await (ProfileStatsMonthlyModel as any).find({ profileId }).lean();
    expect(docs).toHaveLength(0);
  });
});

// =====================================================================
// B3: viewsAdded/clicksAdded on active boost
// =====================================================================

describe("boost viewsAdded/clicksAdded (B3)", () => {
  it("increments viewsAdded on active boost when view event fires", async () => {
    const { companyId, profileId } = await createCompanyAndProfile();
    const { Boost } = await import("@/models/boost.model");
    await (Boost as any).create({
      companyId,
      profileKind: "brandup",
      from: new Date(Date.now() - 5 * 86_400_000),
      to: new Date(Date.now() + 25 * 86_400_000),
      status: "active",
      viewsAdded: 0,
      clicksAdded: 0,
    });

    await recordTrackEvent({ profileId, event: "view" }, "Chrome/120");

    const boost = await (Boost as any).findOne({ companyId, profileKind: "brandup" }).lean();
    expect(boost.viewsAdded).toBe(1);
    expect(boost.clicksAdded).toBe(0);
  });

  it("increments clicksAdded on active boost when click event fires", async () => {
    const { companyId, profileId } = await createCompanyAndProfile();
    const { Boost } = await import("@/models/boost.model");
    await (Boost as any).create({
      companyId,
      profileKind: "brandup",
      from: new Date(Date.now() - 5 * 86_400_000),
      to: new Date(Date.now() + 25 * 86_400_000),
      status: "active",
      viewsAdded: 0,
      clicksAdded: 0,
    });

    await recordTrackEvent({ profileId, event: "click" }, "Chrome/120");

    const boost = await (Boost as any).findOne({ companyId, profileKind: "brandup" }).lean();
    expect(boost.clicksAdded).toBe(1);
    expect(boost.viewsAdded).toBe(0);
  });

  it("does not increment if no active boost exists", async () => {
    const { profileId } = await createCompanyAndProfile();
    await recordTrackEvent({ profileId, event: "view" }, "Chrome/120");
    // No boost to check — just verify no crash and profile stats still work
    const profile = await (Profile as any).findById(profileId).lean();
    expect(profile.stats.viewsTotal).toBe(1);
  });

  it("does not increment expired boost", async () => {
    const { companyId, profileId } = await createCompanyAndProfile();
    const { Boost } = await import("@/models/boost.model");
    await (Boost as any).create({
      companyId,
      profileKind: "brandup",
      from: new Date(Date.now() - 35 * 86_400_000),
      to: new Date(Date.now() - 5 * 86_400_000),
      status: "expired",
      viewsAdded: 10,
      clicksAdded: 3,
    });

    await recordTrackEvent({ profileId, event: "view" }, "Chrome/120");

    const boost = await (Boost as any).findOne({ companyId, profileKind: "brandup" }).lean();
    expect(boost.viewsAdded).toBe(10); // unchanged
  });
});

// =====================================================================
// getProfileMonthlyStats
// =====================================================================

describe("getProfileMonthlyStats", () => {
  it("returns zeros when no doc exists", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const stats = await getProfileMonthlyStats(fakeId, "2026-07");
    expect(stats).toEqual({ views: 0, clicks: 0 });
  });

  it("returns stored values", async () => {
    const pid = new mongoose.Types.ObjectId();
    await (ProfileStatsMonthlyModel as any).create({
      profileId: pid,
      month: "2026-07",
      views: 42,
      clicks: 5,
    });
    const stats = await getProfileMonthlyStats(pid.toString(), "2026-07");
    expect(stats).toEqual({ views: 42, clicks: 5 });
  });
});

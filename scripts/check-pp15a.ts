/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PP-15a Autonomous Audit Script
 * Verifies tracking implementation against sprint requirements.
 * Run: npx tsx scripts/check-pp15a.ts
 */

import * as dotenv from "dotenv";
import * as path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { Company } from "../src/models/company.model";
import { Profile } from "../src/models/profile.model";
import "../src/models/profile-brandup.model";
import "../src/models/profile-traceup.model";
import "../src/models/profile-linkup.model";
import { ProfileStatsMonthlyModel } from "../src/models/profile-stats-monthly.model";
import { recordTrackEvent, isBot, getCurrentMonth, getProfileMonthlyStats, computeTrend, getPreviousMonth } from "../src/services/track.service";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet;
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function createFixture(companyStatus = "active"): Promise<{ profileId: string }> {
  const uid = new mongoose.Types.ObjectId();
  const company = await (Company as any).create({
    type: "B2B",
    status: companyStatus,
    slug: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    legalId: `RNE${Date.now()}`,
    accountEmail: `audit${Date.now()}@test.tn`,
    ownerUserId: uid,
    data: { displayName: { fr: "Audit Co" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "a@t.tn" },
    registeredAt: new Date(),
  });
  const profile = await (Profile as any).create({
    companyId: company._id,
    kind: "brandup",
    status: "active",
    isPublic: true,
    stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
    data: {},
  });
  return { profileId: profile._id.toString() };
}

async function run(): Promise<void> {
  console.log("PP-15a Autonomous Audit\n");

  // Setup — connect to MemoryServer and set the global promise
  // so connectDb() in track.service becomes a no-op
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  // Pre-set the global promise so connectDb() skips re-connecting
  (globalThis as any)._mongoosePromise = Promise.resolve(mongoose);

  // 1. POST view → $inc verified
  console.log("1. View tracking $inc:");
  const { profileId: pid1 } = await createFixture();
  await recordTrackEvent({ profileId: pid1, event: "view" }, "Chrome/120");
  const month = getCurrentMonth();
  const stat1 = await (ProfileStatsMonthlyModel as any).findOne({ profileId: pid1, month }).lean() as any;
  assert("Monthly doc created with views=1", stat1?.views === 1);
  const p1 = await (Profile as any).findById(pid1).lean();
  assert("Profile.stats.viewsTotal incremented to 1", p1.stats.viewsTotal === 1);

  // 2. Click → clicks+1
  console.log("\n2. Click tracking:");
  await recordTrackEvent({ profileId: pid1, event: "click" }, "Chrome/120");
  const stat2 = await (ProfileStatsMonthlyModel as any).findOne({ profileId: pid1, month }).lean() as any;
  assert("Monthly doc clicks=1 after click event", stat2?.clicks === 1);
  const p2 = await (Profile as any).findById(pid1).lean();
  assert("Profile.stats.clicksTotal incremented to 1", p2.stats.clicksTotal === 1);

  // 3. Fake profileId → 204 + zero write
  console.log("\n3. Unknown profileId:");
  const fakeId = new mongoose.Types.ObjectId().toString();
  await recordTrackEvent({ profileId: fakeId, event: "view" }, "Chrome");
  const fakeDocs = await (ProfileStatsMonthlyModel as any).find({ profileId: fakeId }).lean();
  assert("No doc created for unknown profileId", fakeDocs.length === 0);

  // 4. Bot UA → zero write
  console.log("\n4. Bot filter:");
  const { profileId: pid4 } = await createFixture();
  await recordTrackEvent({ profileId: pid4, event: "view" }, "Googlebot/2.1");
  const botDocs = await (ProfileStatsMonthlyModel as any).find({ profileId: pid4 }).lean();
  assert("No doc created for bot UA", botDocs.length === 0);
  assert("isBot detects crawler", isBot("Mozilla/5.0 (compatible; bingbot/2.0)"));
  assert("isBot allows real browser", !isBot("Mozilla/5.0 (Windows NT 10.0) Chrome/120"));

  // 5. Company suspended → zero write
  console.log("\n5. Suspended company:");
  const { profileId: pid5 } = await createFixture("suspended");
  await recordTrackEvent({ profileId: pid5, event: "view" }, "Chrome");
  const suspDocs = await (ProfileStatsMonthlyModel as any).find({ profileId: pid5 }).lean();
  assert("No doc created for suspended company", suspDocs.length === 0);

  // 6. Unique (profileId, month)
  console.log("\n6. Upsert uniqueness:");
  const { profileId: pid6 } = await createFixture();
  await recordTrackEvent({ profileId: pid6, event: "view" }, "Chrome");
  await recordTrackEvent({ profileId: pid6, event: "view" }, "Chrome");
  await recordTrackEvent({ profileId: pid6, event: "view" }, "Chrome");
  const uniqueDocs = await (ProfileStatsMonthlyModel as any).find({ profileId: pid6, month }).lean();
  assert("Only 1 doc for 3 events same month", uniqueDocs.length === 1);
  assert("Views count = 3", (uniqueDocs[0] as any).views === 3);

  // 7. getProfileMonthlyStats
  console.log("\n7. Monthly stats read:");
  const stats7 = await getProfileMonthlyStats(pid6, month);
  assert("getProfileMonthlyStats returns views=3", stats7.views === 3);

  // 8. computeTrend
  console.log("\n8. Trend computation:");
  const trend1 = computeTrend(100, 80);
  assert("Positive trend: +20", trend1?.label === "+20");
  const trend2 = computeTrend(50, null);
  assert("Null previous → null trend", trend2 === null);
  const trend3 = computeTrend(50, 70);
  assert("Negative trend: -20", trend3?.label === "-20");

  // 9. getPreviousMonth
  console.log("\n9. Previous month:");
  assert("2026-07 → 2026-06", getPreviousMonth("2026-07") === "2026-06");
  assert("2026-01 → 2025-12", getPreviousMonth("2026-01") === "2025-12");

  // Cleanup
  await mongoose.disconnect();
  await replSet.stop();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`PP-15a Audit: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

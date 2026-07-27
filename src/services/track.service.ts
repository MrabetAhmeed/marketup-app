import { connectDb } from "@/lib/db";
import { ProfileStatsMonthlyModel } from "@/models/profile-stats-monthly.model";
import { Profile } from "@/models/profile.model";
import { Company } from "@/models/company.model";
import { Boost } from "@/models/boost.model";
import type { TrackEventInput } from "@/schemas/track.schema";

// ---------------------------------------------------------------------------
// Bot detection (minimal V1)
// ---------------------------------------------------------------------------

const BOT_UA_PATTERN =
  /bot|crawler|spider|preview|lighthouse|slurp|mediapartners|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|pingdom|uptimerobot/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA → treat as bot
  return BOT_UA_PATTERN.test(userAgent);
}

// ---------------------------------------------------------------------------
// Current month key (UTC)
// ---------------------------------------------------------------------------

export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// Record a tracking event
// ---------------------------------------------------------------------------

export async function recordTrackEvent(
  input: TrackEventInput,
  userAgent: string | null,
): Promise<void> {
  // 1. Bot filter
  if (isBot(userAgent)) return;

  await connectDb();

  // 2. Silent validation: profile exists + not deleted + company active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ProfileModel = Profile as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CompanyModel = Company as any;

  const profile = await ProfileModel.findOne({
    _id: input.profileId,
    deletedAt: null,
  })
    .select("companyId kind")
    .lean();

  if (!profile) return;

  const company = await CompanyModel.findOne({
    _id: (profile as Record<string, unknown>).companyId,
    status: "active",
    deletedAt: null,
  })
    .select("_id")
    .lean();

  if (!company) return;

  // 3. Determine increment fields
  const month = getCurrentMonth();
  const incMonthly: Record<string, number> =
    input.event === "view" ? { views: 1 } : { clicks: 1 };
  const incProfile: Record<string, number> =
    input.event === "view"
      ? { "stats.viewsTotal": 1 }
      : { "stats.clicksTotal": 1 };

  // 4. Atomic $inc — two best-effort writes (no transaction needed)
  await ProfileStatsMonthlyModel.updateOne(
    { profileId: input.profileId, month },
    { $inc: incMonthly },
    { upsert: true },
  );

  await ProfileModel.updateOne({ _id: input.profileId }, { $inc: incProfile });

  // 5. Boost viewsAdded/clicksAdded — fail-silent, no find prerequisite
  const boostInc: Record<string, number> =
    input.event === "view" ? { viewsAdded: 1 } : { clicksAdded: 1 };
  const profileData = profile as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BoostModel = Boost as any;
  try {
    await BoostModel.updateOne(
      {
        companyId: profileData.companyId,
        profileKind: profileData.kind,
        status: "active",
        to: { $gte: new Date() },
        deletedAt: null,
      },
      { $inc: boostInc },
    );
  } catch {
    // fail-silent: never break the beacon if boost update fails
  }
}

// ---------------------------------------------------------------------------
// Read monthly stats for dashboard
// ---------------------------------------------------------------------------

export interface MonthlyStats {
  views: number;
  clicks: number;
}

export async function getProfileMonthlyStats(
  profileId: string,
  month: string,
): Promise<MonthlyStats> {
  await connectDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StatsModel = ProfileStatsMonthlyModel as any;
  const doc = await StatsModel.findOne({
    profileId,
    month,
  }).lean();
  if (!doc) return { views: 0, clicks: 0 };
  const d = doc as Record<string, unknown>;
  return {
    views: (d.views as number) ?? 0,
    clicks: (d.clicks as number) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Compute trend (current month vs previous month)
// ---------------------------------------------------------------------------

export function computeTrend(
  current: number,
  previous: number | null,
): { value: number; label: string } | null {
  if (previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return { value: 0, label: "0" };
  const sign = delta > 0 ? "+" : "";
  return { value: delta, label: `${sign}${delta}` };
}

export function getPreviousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

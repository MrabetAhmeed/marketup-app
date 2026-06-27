/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Boost } from "@/models/boost.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { pickLocale } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";

// Mongoose 9 strict types require casts for dynamic queries
const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const BoostModel = Boost as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchFilters {
  type?: "B2B" | "B2C";
  q?: string;
  gouvernorat?: string;
  sectorId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResultCard {
  companyId: string;
  slug: string;
  displayName: string;
  bannerUrl: string | null;
  color: string;
  type: string;
  sectorName: string;
  gouvernoratName: string;
  pitch: string;
  rseBadgeStatus: string;
  boosted: boolean;
}

export interface SearchResponse {
  items: SearchResultCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Remove diacritics and lowercase for accent-insensitive matching.
 */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Build a regex that matches ALL tokens (AND logic).
 * Each token is accent-insensitive via character class expansion.
 */
function buildAndRegex(q: string): RegExp[] {
  const tokens = normalize(q).split(/\s+/).filter(Boolean);
  return tokens.map((t) => new RegExp(t, "i"));
}

// Cache sector/gouvernorat names to avoid N+1 in loops
async function buildLookups(lang: SupportedLang): Promise<{
  sectorMap: Map<string, string>;
  gouvMap: Map<string, string>;
}> {
  const [sectors, gouvs] = await Promise.all([
    SectorModel.find({ active: true }).lean(),
    GouvernoratModel.find({}).lean(),
  ]);

  const sectorMap = new Map<string, string>();
  for (const s of sectors) {
    const sAny = s as Record<string, unknown>;
    sectorMap.set(sAny.slug as string, pickLocale(sAny.name as { fr: string; ar?: string; en?: string }, lang));
  }

  const gouvMap = new Map<string, string>();
  for (const g of gouvs) {
    const gAny = g as Record<string, unknown>;
    gouvMap.set(gAny.slug as string, pickLocale(gAny.name as { fr: string; ar?: string; en?: string }, lang));
  }

  return { sectorMap, gouvMap };
}

// ---------------------------------------------------------------------------
// Core search logic
// ---------------------------------------------------------------------------

async function findVisibleCompaniesWithProfile(
  profileKind: "brandup" | "traceup" | "linkup",
  filters: SearchFilters,
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pairs: { company: any; profile: any; brandupProfile: any | null }[];
  total: number;
}> {
  await connectDb();

  // Step 1: Find active companies matching type/gouvernorat/sector
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyQuery: Record<string, any> = { status: "active" };
  if (filters.type) companyQuery.type = filters.type;
  if (filters.gouvernorat) companyQuery["liveData.gouvernorat"] = filters.gouvernorat;
  if (filters.sectorId) companyQuery["liveData.sectorId"] = filters.sectorId;

  const companies = await CompanyModel.find(companyQuery).lean();
  if (companies.length === 0) return { pairs: [], total: 0 };

  const companyIds = companies.map((c: Record<string, unknown>) => c._id);
  const companyMap = new Map(
    companies.map((c: Record<string, unknown>) => [String(c._id), c]),
  );

  // Step 2: Find visible profiles of the requested kind
  const profiles = await ProfileModel.find({
    companyId: { $in: companyIds },
    kind: profileKind,
    status: "active",
    isPublic: true,
    pendingData: null,
  }).lean();

  // Step 3: Also fetch BrandUP profiles for pitch (description fallback)
  let brandupProfiles: Record<string, unknown>[] = [];
  if (profileKind !== "brandup") {
    brandupProfiles = (await ProfileModel.find({
      companyId: { $in: companyIds },
      kind: "brandup",
      status: "active",
      isPublic: true,
      pendingData: null,
    }).lean()) as Record<string, unknown>[];
  }
  const brandupMap = new Map(
    brandupProfiles.map((p) => [String(p.companyId), p]),
  );

  // Step 4: Pair company + profile + optional brandupProfile
  const pairs = profiles
    .map((p: Record<string, unknown>) => {
      const company = companyMap.get(String(p.companyId));
      if (!company) return null;
      const brandupProfile = profileKind === "brandup"
        ? p
        : brandupMap.get(String(p.companyId)) ?? null;
      return { company, profile: p, brandupProfile };
    })
    .filter(Boolean) as { company: Record<string, unknown>; profile: Record<string, unknown>; brandupProfile: Record<string, unknown> | null }[];

  return { pairs, total: pairs.length };
}

// ---------------------------------------------------------------------------
// BrandUP Search
// ---------------------------------------------------------------------------

export async function searchBrandUp(
  filters: SearchFilters,
  lang: SupportedLang = "fr",
): Promise<SearchResponse> {
  const { pairs } = await findVisibleCompaniesWithProfile("brandup", filters);
  const { sectorMap, gouvMap } = await buildLookups(lang);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  // Text matching on BrandUP-specific fields
  let filtered = pairs;
  if (filters.q && filters.q.trim()) {
    const regexes = buildAndRegex(filters.q);
    filtered = pairs.filter(({ company, profile }) => {
      const cAny = company as Record<string, unknown>;
      const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;
      const sectorName = sectorMap.get((cAny.liveData as Record<string, unknown>).sectorId as string) ?? "";

      const haystack = normalize([
        pickLocale((cAny.data as Record<string, unknown>)?.displayName as { fr: string } | undefined, lang),
        pickLocale(pData?.pitch as { fr: string } | undefined, lang),
        pickLocale(pData?.about as { fr: string } | undefined, lang),
        sectorName,
      ].join(" "));

      return regexes.every((r) => r.test(haystack));
    });
  }

  // Sort: boosted first, then by registeredAt desc
  const now = new Date();
  const boostedCompanyIds = new Set<string>();
  const boosts = await BoostModel.find({
    companyId: { $in: filtered.map((p) => (p.company as Record<string, unknown>)._id) },
    profileKind: "brandup",
    status: "active",
    to: { $gte: now },
  }).lean();
  for (const b of boosts) {
    boostedCompanyIds.add(String((b as Record<string, unknown>).companyId));
  }

  filtered.sort((a, b) => {
    const aBoosted = boostedCompanyIds.has(String((a.company as Record<string, unknown>)._id)) ? 1 : 0;
    const bBoosted = boostedCompanyIds.has(String((b.company as Record<string, unknown>)._id)) ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    const aDate = new Date(((a.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    const bDate = new Date(((b.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    return bDate - aDate;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const items: SearchResultCard[] = paginated.map(({ company, profile }) => {
    const cAny = company as Record<string, unknown>;
    const cData = cAny.data as Record<string, unknown>;
    const liveData = cAny.liveData as Record<string, unknown>;
    const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;

    return {
      companyId: String(cAny._id),
      slug: cAny.slug as string,
      displayName: pickLocale(cData?.displayName as { fr: string } | undefined, lang),
      bannerUrl: (cData?.bannerUrl as string) ?? null,
      color: (cData?.color as string) ?? "#0078D4",
      type: cAny.type as string,
      sectorName: sectorMap.get(liveData.sectorId as string) ?? (liveData.sectorId as string),
      gouvernoratName: gouvMap.get(liveData.gouvernorat as string) ?? (liveData.gouvernorat as string),
      pitch: pickLocale(pData?.pitch as { fr: string } | undefined, lang),
      rseBadgeStatus: (cAny.rseBadgeStatus as string) ?? "none",
      boosted: boostedCompanyIds.has(String(cAny._id)),
    };
  });

  return { items, total, page, limit, totalPages };
}

// ---------------------------------------------------------------------------
// TraceUP Search
// ---------------------------------------------------------------------------

export async function searchTraceUp(
  filters: SearchFilters,
  lang: SupportedLang = "fr",
): Promise<SearchResponse> {
  const { pairs } = await findVisibleCompaniesWithProfile("traceup", filters);
  const { sectorMap, gouvMap } = await buildLookups(lang);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  let filtered = pairs;
  if (filters.q && filters.q.trim()) {
    const regexes = buildAndRegex(filters.q);
    filtered = pairs.filter(({ company, profile }) => {
      const cAny = company as Record<string, unknown>;
      const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;
      const sectorName = sectorMap.get((cAny.liveData as Record<string, unknown>).sectorId as string) ?? "";

      // TraceUP search: displayName + sectorName + video titles + descriptions
      const videos = (pData?.videos as Array<Record<string, unknown>>) ?? [];
      const activeVideos = videos.filter((v) => v.status === "active");
      const videoText = activeVideos
        .map((v) => [
          pickLocale(v.title as { fr: string } | undefined, lang),
          pickLocale(v.description as { fr: string } | undefined, lang),
        ].join(" "))
        .join(" ");

      const haystack = normalize([
        pickLocale((cAny.data as Record<string, unknown>)?.displayName as { fr: string } | undefined, lang),
        sectorName,
        videoText,
      ].join(" "));

      return regexes.every((r) => r.test(haystack));
    });
  }

  // Sort: boosted first, then registeredAt desc
  const now = new Date();
  const boostedCompanyIds = new Set<string>();
  const boosts = await BoostModel.find({
    companyId: { $in: filtered.map((p) => (p.company as Record<string, unknown>)._id) },
    profileKind: "traceup",
    status: "active",
    to: { $gte: now },
  }).lean();
  for (const b of boosts) {
    boostedCompanyIds.add(String((b as Record<string, unknown>).companyId));
  }

  filtered.sort((a, b) => {
    const aBoosted = boostedCompanyIds.has(String((a.company as Record<string, unknown>)._id)) ? 1 : 0;
    const bBoosted = boostedCompanyIds.has(String((b.company as Record<string, unknown>)._id)) ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    const aDate = new Date(((a.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    const bDate = new Date(((b.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    return bDate - aDate;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const items: SearchResultCard[] = paginated.map(({ company, profile, brandupProfile }) => {
    const cAny = company as Record<string, unknown>;
    const cData = cAny.data as Record<string, unknown>;
    const liveData = cAny.liveData as Record<string, unknown>;
    const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;

    // Description: BrandUP pitch fallback, then video count
    let pitch = "";
    if (brandupProfile) {
      const bpData = brandupProfile.data as Record<string, unknown>;
      pitch = pickLocale(bpData?.pitch as { fr: string } | undefined, lang);
    }
    if (!pitch) {
      const videos = ((pData?.videos as Array<Record<string, unknown>>) ?? []).filter((v) => v.status === "active");
      pitch = videos.length > 0 ? `${videos.length} vidéo${videos.length !== 1 ? "s" : ""}` : "";
    }

    return {
      companyId: String(cAny._id),
      slug: cAny.slug as string,
      displayName: pickLocale(cData?.displayName as { fr: string } | undefined, lang),
      bannerUrl: (cData?.bannerUrl as string) ?? null,
      color: (cData?.color as string) ?? "#8764B8",
      type: cAny.type as string,
      sectorName: sectorMap.get(liveData.sectorId as string) ?? (liveData.sectorId as string),
      gouvernoratName: gouvMap.get(liveData.gouvernorat as string) ?? (liveData.gouvernorat as string),
      pitch,
      rseBadgeStatus: (cAny.rseBadgeStatus as string) ?? "none",
      boosted: boostedCompanyIds.has(String(cAny._id)),
    };
  });

  return { items, total, page, limit, totalPages };
}

// ---------------------------------------------------------------------------
// LinkUP Search
// ---------------------------------------------------------------------------

export async function searchLinkUp(
  filters: SearchFilters,
  lang: SupportedLang = "fr",
): Promise<SearchResponse> {
  const { pairs } = await findVisibleCompaniesWithProfile("linkup", filters);
  const { sectorMap, gouvMap } = await buildLookups(lang);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  let filtered = pairs;
  if (filters.q && filters.q.trim()) {
    const regexes = buildAndRegex(filters.q);
    filtered = pairs.filter(({ company, profile }) => {
      const cAny = company as Record<string, unknown>;
      const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;
      const sectorName = sectorMap.get((cAny.liveData as Record<string, unknown>).sectorId as string) ?? "";
      const card = (pData?.contactCard as Record<string, unknown>) ?? {};

      const haystack = normalize([
        pickLocale((cAny.data as Record<string, unknown>)?.displayName as { fr: string } | undefined, lang),
        sectorName,
        card.fullName as string ?? "",
        pickLocale(card.title as { fr: string } | undefined, lang),
        pickLocale(card.bio as { fr: string } | undefined, lang),
        pickLocale(card.company as { fr: string } | undefined, lang),
      ].join(" "));

      return regexes.every((r) => r.test(haystack));
    });
  }

  // Sort
  const now = new Date();
  const boostedCompanyIds = new Set<string>();
  const boosts = await BoostModel.find({
    companyId: { $in: filtered.map((p) => (p.company as Record<string, unknown>)._id) },
    profileKind: "linkup",
    status: "active",
    to: { $gte: now },
  }).lean();
  for (const b of boosts) {
    boostedCompanyIds.add(String((b as Record<string, unknown>).companyId));
  }

  filtered.sort((a, b) => {
    const aBoosted = boostedCompanyIds.has(String((a.company as Record<string, unknown>)._id)) ? 1 : 0;
    const bBoosted = boostedCompanyIds.has(String((b.company as Record<string, unknown>)._id)) ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    const aDate = new Date(((a.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    const bDate = new Date(((b.company as Record<string, unknown>).registeredAt as string) ?? 0).getTime();
    return bDate - aDate;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const items: SearchResultCard[] = paginated.map(({ company, profile, brandupProfile }) => {
    const cAny = company as Record<string, unknown>;
    const cData = cAny.data as Record<string, unknown>;
    const liveData = cAny.liveData as Record<string, unknown>;
    const pData = (profile as Record<string, unknown>).data as Record<string, unknown>;
    const card = (pData?.contactCard as Record<string, unknown>) ?? {};

    // Description: BrandUP pitch fallback, then "Carte de contact — fullName"
    let pitch = "";
    if (brandupProfile) {
      const bpData = brandupProfile.data as Record<string, unknown>;
      pitch = pickLocale(bpData?.pitch as { fr: string } | undefined, lang);
    }
    if (!pitch && card.fullName) {
      pitch = `Carte de contact — ${card.fullName as string}`;
    }

    return {
      companyId: String(cAny._id),
      slug: cAny.slug as string,
      displayName: pickLocale(cData?.displayName as { fr: string } | undefined, lang),
      bannerUrl: (cData?.bannerUrl as string) ?? null,
      color: (cData?.color as string) ?? "#000000",
      type: cAny.type as string,
      sectorName: sectorMap.get(liveData.sectorId as string) ?? (liveData.sectorId as string),
      gouvernoratName: gouvMap.get(liveData.gouvernorat as string) ?? (liveData.gouvernorat as string),
      pitch,
      rseBadgeStatus: (cAny.rseBadgeStatus as string) ?? "none",
      boosted: boostedCompanyIds.has(String(cAny._id)),
    };
  });

  return { items, total, page, limit, totalPages };
}

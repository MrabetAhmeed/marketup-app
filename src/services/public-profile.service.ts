/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import "@/models/profile-brandup.model";
import "@/models/profile-traceup.model";
import "@/models/profile-linkup.model";
import { Boost } from "@/models/boost.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Association } from "@/models/association.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { isProfileVisible } from "@/lib/visibility";
import { pickLocale } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";
import { NotFoundError, SlugRedirectError } from "@/lib/api-error";

// Mongoose 9 strict types require casts for dynamic queries
const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const BoostModel = Boost as any;
const RseReceiptModel = RseReceipt as any;
const AssociationModel = Association as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicCompanyBase {
  slug: string;
  type: string;
  displayName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  color: string;
  legalId: string;
  sectorId: string;
  sectorName: string;
  gouvernorat: string;
  gouvernoratName: string;
  ville: string;
  postalCode: string | null;
  contactEmail: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  gpsPosition: { type: string; coordinates: number[] } | null;
  rseBadgeStatus: string;
  boosted: boolean;
}

interface PublicRseReceipt {
  associationName: string;
  amount: number;
  donationDate: string;
  receiptNumber: string | null;
  receiptDocumentUrl: string | null;
}

export interface SiblingProfiles {
  brandup: boolean;
  traceup: boolean;
  linkup: boolean;
}

export interface PublicBrandUpProfile {
  profileId: string;
  company: PublicCompanyBase;
  kind: "brandup";
  pitch: string;
  about: string;
  color: string;
  links: { label: string; url: string; icon: string | null }[];
  gallery: { id: string; url: string; caption: string; order: number }[];
  projects: { id: string; name: string; image: string | null; description: string; order: number }[];
  certifications: { id: string; name: string; label: string; icon: string | null; image: string | null }[];
  services: { name: string }[];
  rseReceipts: PublicRseReceipt[];
  siblingProfiles: SiblingProfiles;
}

export interface PublicTraceUpProfile {
  profileId: string;
  company: PublicCompanyBase;
  kind: "traceup";
  videos: {
    id: string;
    source: string;
    videoId: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    category: string;
    title: string;
    description: string;
    publishedAt: string | null;
  }[];
  rseReceipts: PublicRseReceipt[];
  siblingProfiles: SiblingProfiles;
}

export interface PublicLinkUpProfile {
  profileId: string;
  company: PublicCompanyBase;
  kind: "linkup";
  socials: { platform: string; url: string | null }[];
  rseReceipts: PublicRseReceipt[];
  siblingProfiles: SiblingProfiles;
}

export interface PublicPlaceholderProfile {
  kind: "brandup" | "traceup" | "linkup";
  placeholder: true;
  company: { displayName: string; logoUrl: string | null; slug: string };
}

export type PublicProfile = PublicBrandUpProfile | PublicTraceUpProfile | PublicLinkUpProfile;
export type PublicProfileOrPlaceholder = PublicProfile | PublicPlaceholderProfile;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveCompanyBase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company: any,
  lang: SupportedLang,
  profileKind?: "brandup" | "traceup" | "linkup",
): Promise<PublicCompanyBase> {
  const sectorDoc = await SectorModel.findOne({ slug: company.liveData.sectorId }).lean();
  const gouvDoc = await GouvernoratModel.findOne({ slug: company.liveData.gouvernorat }).lean();

  const now = new Date();
  const boostQuery: Record<string, unknown> = {
    companyId: company._id,
    status: "active",
    to: { $gte: now },
  };
  if (profileKind) boostQuery.profileKind = profileKind;
  const activeBoost = await BoostModel.findOne(boostQuery).lean();

  return {
    slug: company.slug,
    type: company.type,
    displayName: pickLocale(company.data?.displayName, lang),
    logoUrl: company.data?.logoUrl ?? null,
    bannerUrl: company.data?.bannerUrl ?? null,
    color: company.data?.color ?? "#0078D4",
    legalId: company.legalId,
    sectorId: company.liveData.sectorId,
    sectorName: sectorDoc ? pickLocale((sectorDoc as Record<string, unknown>).name as { fr: string; ar?: string; en?: string }, lang) : company.liveData.sectorId,
    gouvernorat: company.liveData.gouvernorat,
    gouvernoratName: gouvDoc ? pickLocale((gouvDoc as Record<string, unknown>).name as { fr: string; ar?: string; en?: string }, lang) : company.liveData.gouvernorat,
    ville: company.liveData.ville,
    postalCode: company.liveData.postalCode ?? null,
    contactEmail: company.liveData.contactEmail ?? company.accountEmail,
    phone: company.liveData.phone ?? null,
    whatsapp: company.liveData.whatsapp ?? null,
    address: company.liveData.address ?? null,
    gpsPosition: company.liveData.gpsPosition ?? null,
    rseBadgeStatus: company.rseBadgeStatus ?? "none",
    boosted: activeBoost != null,
  };
}

async function getValidatedReceipts(
  companyId: unknown,
  lang: SupportedLang,
): Promise<PublicRseReceipt[]> {
  const receipts = await RseReceiptModel.find({
    companyId,
    status: "validated",
  })
    .sort({ donationDate: -1 })
    .lean();

  const assocIds = Array.from(new Set(receipts.map((r: Record<string, unknown>) => String(r.associationId))));
  const associations = await AssociationModel.find({ _id: { $in: assocIds } }).lean();
  const assocMap = new Map(
    associations.map((a: Record<string, unknown>) => [String(a._id), a]),
  );

  return receipts.slice(0, 2).map((r: Record<string, unknown>) => {
    const assoc = assocMap.get(String(r.associationId));
    return {
      associationName: assoc
        ? pickLocale((assoc as Record<string, unknown>).name as { fr: string; ar?: string; en?: string }, lang)
        : "—",
      amount: r.amount as number,
      donationDate: r.donationDate ? new Date(r.donationDate as string).toISOString() : "",
      receiptNumber: (r.receiptNumber as string) ?? null,
      receiptDocumentUrl: (r.receiptDocumentUrl as string) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getPublicProfileBySlug(
  type: "brandup" | "traceup" | "linkup",
  slug: string,
  lang: SupportedLang = "fr",
): Promise<PublicProfileOrPlaceholder> {
  await connectDb();

  let company = await CompanyModel.findOne({ slug }).lean();
  if (!company) {
    // Fallback: check slugHistory for 301 redirect
    company = await CompanyModel.findOne({ slugHistory: slug }).lean();
    if (company) {
      throw new SlugRedirectError(type, (company as Record<string, unknown>).slug as string);
    }
    throw new NotFoundError("Entreprise");
  }

  const companyAny = company as Record<string, unknown>;
  const profile = await ProfileModel.findOne({
    companyId: companyAny._id,
    kind: type,
  }).lean();
  if (!profile) throw new NotFoundError("Profil");

  const profileAny = profile as Record<string, unknown>;
  const companyStatus = companyAny.status as string;
  const profileStatus = profileAny.status as string;
  const isPublic = profileAny.isPublic as boolean;
  const publishedAt = profileAny.publishedAt as Date | null;
  const placeholderMode = (profileAny.placeholderMode as string) ?? "hidden";

  // --- Cause-based visibility (order matters) ---
  // 1. Company not active → always 404 (sanctions, pending signup)
  if (companyStatus !== "active") throw new NotFoundError("Profil");
  // 2. Profile disabled/incomplete → always 404
  if (profileStatus === "disabled" || profileStatus === "incomplete") throw new NotFoundError("Profil");
  // 3. Profile never published (publishedAt null) + not active → 404
  if (publishedAt == null && profileStatus !== "active") throw new NotFoundError("Profil");
  // 4. isPublic false → placeholder or 404 (owner voluntary hide)
  if (!isPublic) {
    if (placeholderMode === "coming_soon" && publishedAt != null) {
      // Minimal DTO — no data, no socials, no coordinates
      const compData = companyAny.data as Record<string, unknown> | undefined;
      return {
        kind: type,
        placeholder: true,
        company: {
          displayName: pickLocale(compData?.displayName as { fr: string; ar?: string; en?: string } | undefined, lang),
          logoUrl: (compData?.logoUrl as string) ?? null,
          slug: companyAny.slug as string,
        },
      };
    }
    throw new NotFoundError("Profil");
  }
  // 5. isPublic true but never published + not active → 404 (Cas 4 from visibility)
  if (publishedAt == null && profileStatus !== "active") throw new NotFoundError("Profil");

  const companyBase = await resolveCompanyBase(companyAny, lang, type);
  const rseReceipts = await getValidatedReceipts(companyAny._id, lang);

  const data = profileAny.data as Record<string, unknown>;

  if (type === "brandup") {
    return {
      profileId: String(profileAny._id),
      company: companyBase,
      kind: "brandup",
      pitch: pickLocale(data.pitch as { fr: string; ar?: string; en?: string } | undefined, lang),
      about: pickLocale(data.about as { fr: string; ar?: string; en?: string } | undefined, lang),
      color: (data.color as string) ?? "#0078D4",
      links: ((data.links as Array<Record<string, unknown>>) ?? []).map((l) => ({
        label: pickLocale(l.label as { fr: string; ar?: string; en?: string }, lang),
        url: l.url as string,
        icon: (l.icon as string) ?? null,
      })),
      gallery: ((data.gallery as Array<Record<string, unknown>>) ?? [])
        .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
        .map((g) => ({
          id: g.id as string,
          url: g.url as string,
          caption: pickLocale(g.caption as { fr: string; ar?: string; en?: string }, lang),
          order: (g.order as number) ?? 0,
        })),
      projects: ((data.projects as Array<Record<string, unknown>>) ?? [])
        .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
        .map((p) => ({
          id: p.id as string,
          name: pickLocale(p.name as { fr: string; ar?: string; en?: string }, lang),
          image: (p.image as string) ?? null,
          description: pickLocale(p.description as { fr: string; ar?: string; en?: string }, lang),
          order: (p.order as number) ?? 0,
        })),
      certifications: ((data.certifications as Array<Record<string, unknown>>) ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        label: pickLocale(c.label as { fr: string; ar?: string; en?: string }, lang),
        icon: (c.icon as string) ?? null,
        image: (c.image as string) ?? null,
      })),
      services: ((data.services as Array<Record<string, unknown>>) ?? []).map((s) => ({
        name: pickLocale(s.name as { fr: string; ar?: string; en?: string }, lang),
      })),
      rseReceipts,
      siblingProfiles: await resolveSiblingProfiles(companyAny, type),
    };
  }

  if (type === "traceup") {
    const videos = ((data.videos as Array<Record<string, unknown>>) ?? [])
      .filter((v) => v.status === "active")
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt as string).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt as string).getTime() : 0;
        return dateB - dateA;
      });

    return {
      profileId: String(profileAny._id),
      company: companyBase,
      kind: "traceup",
      videos: videos.map((v) => ({
        id: v.id as string,
        source: v.source as string,
        videoId: v.videoId as string,
        videoUrl: (v.videoUrl as string) ?? null,
        thumbnailUrl: (v.thumbnailUrl as string) ?? null,
        category: v.category as string,
        title: pickLocale(v.title as { fr: string; ar?: string; en?: string }, lang),
        description: pickLocale(v.description as { fr: string; ar?: string; en?: string }, lang),
        publishedAt: v.publishedAt ? new Date(v.publishedAt as string).toISOString() : null,
      })),
      rseReceipts,
      siblingProfiles: await resolveSiblingProfiles(companyAny, type),
    };
  }

  // linkup
  const socials = (data.socials as Array<Record<string, unknown>>) ?? [];

  return {
    profileId: String(profileAny._id),
    company: companyBase,
    kind: "linkup",
    socials: socials.map((s) => ({
      platform: s.platform as string,
      url: (s.url as string) || null,
    })),
    rseReceipts,
    siblingProfiles: await resolveSiblingProfiles(companyAny, type),
  };
}

// ---------------------------------------------------------------------------
// resolveSiblingProfiles — check visibility of the 3 sibling profiles
// ---------------------------------------------------------------------------

async function resolveSiblingProfiles(
  companyAny: Record<string, unknown>,
  currentKind: "brandup" | "traceup" | "linkup",
): Promise<SiblingProfiles> {
  const result: SiblingProfiles = { brandup: false, traceup: false, linkup: false };
  const otherKinds = (["brandup", "traceup", "linkup"] as const).filter((k) => k !== currentKind);
  const siblings = await ProfileModel.find({
    companyId: companyAny._id,
    kind: { $in: otherKinds },
  }).lean();
  for (const s of siblings) {
    const sAny = s as Record<string, unknown>;
    const sVisible = isProfileVisible(
      { status: sAny.status as "active", isPublic: sAny.isPublic as boolean, publishedAt: sAny.publishedAt as Date | null },
      { status: companyAny.status as "active" },
    );
    if (sVisible) result[sAny.kind as keyof SiblingProfiles] = true;
  }
  return result;
}

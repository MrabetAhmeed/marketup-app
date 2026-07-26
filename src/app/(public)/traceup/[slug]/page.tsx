import { notFound, permanentRedirect } from "next/navigation";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import { SlugRedirectError } from "@/lib/api-error";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import TraceUpPublic from "@/components/features/profiles/public/TraceUpPublic";
import ComingSoonPage from "@/components/shared/ComingSoonPage";
import TrackView from "@/components/shared/TrackView";
import type { PublicTraceUpProfile, PublicProfileOrPlaceholder } from "@/services/public-profile.service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("traceup", slug);
    if ("placeholder" in data && data.placeholder) {
      return {
        title: `${data.company.displayName} — Bientôt disponible`,
        robots: { index: false },
      };
    }
    const profile = data as PublicTraceUpProfile;
    const description = `${profile.videos.length} vidéo${profile.videos.length !== 1 ? "s" : ""} — ${profile.company.displayName} sur MARKET-UP`;
    return {
      title: `${profile.company.displayName} — MARKET-UP`,
      description,
      openGraph: {
        title: `${profile.company.displayName} — MARKET-UP`,
        description,
        images: profile.company.logoUrl ? [{ url: profile.company.logoUrl }] : [],
      },
    };
  } catch (e) {
    if (e instanceof SlugRedirectError) return {};
    return { title: "Profil introuvable — MARKET-UP" };
  }
}

export default async function TraceUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicProfileOrPlaceholder;
  let redirectTo: string | null = null;
  try {
    data = await getPublicProfileBySlug("traceup", slug);
  } catch (e) {
    if (e instanceof SlugRedirectError) redirectTo = e.newSlug;
    else notFound();
  }
  if (redirectTo) permanentRedirect(`/traceup/${redirectTo}`);

  if ("placeholder" in data! && data!.placeholder) {
    return (
      <div className="min-h-screen bg-[#fbf9f8]">
        <PublicProfileHeader product="traceup" />
        <ComingSoonPage kind="traceup" displayName={data!.company.displayName} logoUrl={data!.company.logoUrl} />
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="traceup" />
      <TrackView profileId={(data! as PublicTraceUpProfile).profileId} />
      <TraceUpPublic data={data! as PublicTraceUpProfile} />
      <PublicFooter />
    </div>
  );
}

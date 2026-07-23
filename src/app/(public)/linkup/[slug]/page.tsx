import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import { SlugRedirectError } from "@/lib/api-error";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import LinkUpPublic from "@/components/features/profiles/public/LinkUpPublic";
import ComingSoonPage from "@/components/shared/ComingSoonPage";
import type { PublicLinkUpProfile, PublicProfileOrPlaceholder } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("linkup", slug);
    if ("placeholder" in data && data.placeholder) {
      return {
        title: `${data.company.displayName} — Bientôt disponible`,
        robots: { index: false },
      };
    }
    const profile = data as PublicLinkUpProfile;
    const description = `${profile.company.displayName} · ${profile.company.sectorName} · ${profile.company.ville} — MARKET-UP`;
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

export default async function LinkUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicProfileOrPlaceholder;
  let redirectTo: string | null = null;
  try {
    data = await getPublicProfileBySlug("linkup", slug);
  } catch (e) {
    if (e instanceof SlugRedirectError) redirectTo = e.newSlug;
    else notFound();
  }
  if (redirectTo) permanentRedirect(`/linkup/${redirectTo}`);

  if ("placeholder" in data! && data!.placeholder) {
    return (
      <div className="min-h-screen bg-[#fbf9f8]">
        <PublicProfileHeader product="linkup" />
        <ComingSoonPage kind="linkup" displayName={data!.company.displayName} logoUrl={data!.company.logoUrl} />
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="linkup" />
      <LinkUpPublic data={data! as PublicLinkUpProfile} />
      <PublicFooter />
    </div>
  );
}

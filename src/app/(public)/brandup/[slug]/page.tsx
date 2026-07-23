import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import { SlugRedirectError } from "@/lib/api-error";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import BrandUpPublic from "@/components/features/profiles/public/BrandUpPublic";
import ComingSoonPage from "@/components/shared/ComingSoonPage";
import type { PublicBrandUpProfile, PublicProfileOrPlaceholder } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("brandup", slug);
    if ("placeholder" in data && data.placeholder) {
      return {
        title: `${data.company.displayName} — Bientôt disponible`,
        robots: { index: false },
      };
    }
    const profile = data as PublicBrandUpProfile;
    const description = profile.pitch ? profile.pitch.substring(0, 160) : `${profile.company.displayName} sur MARKET-UP`;
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

export default async function BrandUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicProfileOrPlaceholder;
  let redirectTo: string | null = null;
  try {
    data = await getPublicProfileBySlug("brandup", slug);
  } catch (e) {
    if (e instanceof SlugRedirectError) redirectTo = e.newSlug;
    else notFound();
  }
  if (redirectTo) permanentRedirect(`/brandup/${redirectTo}`);

  if ("placeholder" in data! && data!.placeholder) {
    return (
      <div className="min-h-screen bg-[#fbf9f8]">
        <PublicProfileHeader product="brandup" />
        <ComingSoonPage kind="brandup" displayName={data!.company.displayName} logoUrl={data!.company.logoUrl} />
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="brandup" />
      <BrandUpPublic data={data! as PublicBrandUpProfile} />
      <PublicFooter />
    </div>
  );
}

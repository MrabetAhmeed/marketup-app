import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import { SlugRedirectError } from "@/lib/api-error";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import LinkUpPublic from "@/components/features/profiles/public/LinkUpPublic";
import type { PublicLinkUpProfile } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("linkup", slug) as PublicLinkUpProfile;
    const description = `${data.company.displayName} · ${data.company.sectorName} · ${data.company.ville} — MARKET-UP`;
    return {
      title: `${data.company.displayName} — MARKET-UP`,
      description,
      openGraph: {
        title: `${data.company.displayName} — MARKET-UP`,
        description,
        images: data.company.logoUrl ? [{ url: data.company.logoUrl }] : [],
      },
    };
  } catch (e) {
    if (e instanceof SlugRedirectError) return {};
    return { title: "Profil introuvable — MARKET-UP" };
  }
}

export default async function LinkUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicLinkUpProfile;
  let redirectTo: string | null = null;
  try {
    data = await getPublicProfileBySlug("linkup", slug) as PublicLinkUpProfile;
  } catch (e) {
    if (e instanceof SlugRedirectError) redirectTo = e.newSlug;
    else notFound();
  }
  if (redirectTo) permanentRedirect(`/linkup/${redirectTo}`);

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="linkup" />
      <LinkUpPublic data={data!} />
      <PublicFooter />
    </div>
  );
}

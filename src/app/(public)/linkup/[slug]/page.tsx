import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
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
    const description = data.contactCard.fullName
      ? `${data.contactCard.fullName} — ${data.company.displayName} sur MARKET-UP`
      : `${data.company.displayName} sur MARKET-UP`;
    return {
      title: `${data.company.displayName} — MARKET-UP`,
      description,
      openGraph: {
        title: `${data.company.displayName} — MARKET-UP`,
        description,
        images: data.company.logoUrl ? [{ url: data.company.logoUrl }] : [],
      },
    };
  } catch {
    return { title: "Profil introuvable — MARKET-UP" };
  }
}

export default async function LinkUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicLinkUpProfile;
  try {
    data = await getPublicProfileBySlug("linkup", slug) as PublicLinkUpProfile;
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="linkup" />
      <LinkUpPublic data={data} />
      <PublicFooter />
    </div>
  );
}

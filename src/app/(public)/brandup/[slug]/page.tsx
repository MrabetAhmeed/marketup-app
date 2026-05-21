import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import BrandUpPublic from "@/components/features/profiles/public/BrandUpPublic";
import type { PublicBrandUpProfile } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("brandup", slug) as PublicBrandUpProfile;
    const description = data.pitch ? data.pitch.substring(0, 160) : `${data.company.displayName} sur MARKET-UP`;
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

export default async function BrandUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicBrandUpProfile;
  try {
    data = await getPublicProfileBySlug("brandup", slug) as PublicBrandUpProfile;
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="brandup" />
      <BrandUpPublic data={data} />
      <PublicFooter />
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfileBySlug } from "@/services/public-profile.service";
import PublicProfileHeader from "@/components/shared/PublicProfileHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import TraceUpPublic from "@/components/features/profiles/public/TraceUpPublic";
import type { PublicTraceUpProfile } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getPublicProfileBySlug("traceup", slug) as PublicTraceUpProfile;
    const description = `${data.videos.length} vidéo${data.videos.length !== 1 ? "s" : ""} — ${data.company.displayName} sur MARKET-UP`;
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

export default async function TraceUpProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let data: PublicTraceUpProfile;
  try {
    data = await getPublicProfileBySlug("traceup", slug) as PublicTraceUpProfile;
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicProfileHeader product="traceup" />
      <TraceUpPublic data={data} />
      <PublicFooter />
    </div>
  );
}

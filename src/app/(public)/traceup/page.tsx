import { Suspense } from "react";
import SearchPageClient from "@/components/features/search/SearchPageClient";
import { getSectorsB2B, getCategoriesB2C, getGouvernorats } from "@/lib/referentials";
import { getActiveSponsoringsForKind } from "@/services/sponsoring.service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TraceUP — Moteur de recherche vivasky.media",
  description: "Les vidéos des entreprises tunisiennes. Découvrez les contenus médias des professionnels en Tunisie.",
};

async function TraceUpSearchInner(): Promise<JSX.Element> {
  const [sectors, categories, gouvernorats, sponsors] = await Promise.all([
    getSectorsB2B(),
    getCategoriesB2C(),
    getGouvernorats(),
    getActiveSponsoringsForKind("traceup"),
  ]);

  return (
    <SearchPageClient
      product="traceup"
      sectors={sectors}
      categories={categories}
      gouvernorats={gouvernorats}
      sponsors={sponsors}
    />
  );
}

export default function TraceUpSearchPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf9f8]" />}>
      <TraceUpSearchInner />
    </Suspense>
  );
}

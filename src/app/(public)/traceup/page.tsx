import { Suspense } from "react";
import SearchPageClient from "@/components/features/search/SearchPageClient";
import { getSectorsB2B, getCategoriesB2C, getGouvernorats } from "@/lib/referentials";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TraceUP — Moteur de recherche MARKET-UP",
  description: "Les vidéos des entreprises tunisiennes. Découvrez les contenus médias des professionnels en Tunisie.",
};

async function TraceUpSearchInner(): Promise<JSX.Element> {
  const [sectors, categories, gouvernorats] = await Promise.all([
    getSectorsB2B(),
    getCategoriesB2C(),
    getGouvernorats(),
  ]);

  return (
    <SearchPageClient
      product="traceup"
      sectors={sectors}
      categories={categories}
      gouvernorats={gouvernorats}
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

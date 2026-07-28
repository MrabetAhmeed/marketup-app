import { Suspense } from "react";
import SearchPageClient from "@/components/features/search/SearchPageClient";
import { getSectorsB2B, getCategoriesB2C, getGouvernorats } from "@/lib/referentials";
import { getActiveSponsoringsForKind } from "@/services/sponsoring.service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BrandUP — Moteur de recherche MARKET-UP",
  description: "Trouvez les entreprises tunisiennes. Base de données complète des professionnels B2B en Tunisie.",
};

async function BrandUpSearchInner(): Promise<JSX.Element> {
  const [sectors, categories, gouvernorats, sponsors] = await Promise.all([
    getSectorsB2B(),
    getCategoriesB2C(),
    getGouvernorats(),
    getActiveSponsoringsForKind("brandup"),
  ]);

  return (
    <SearchPageClient
      product="brandup"
      sectors={sectors}
      categories={categories}
      gouvernorats={gouvernorats}
      sponsors={sponsors}
    />
  );
}

export default function BrandUpSearchPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf9f8]" />}>
      <BrandUpSearchInner />
    </Suspense>
  );
}

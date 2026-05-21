import { Suspense } from "react";
import SearchPageClient from "@/components/features/search/SearchPageClient";
import { getSectorsB2B, getCategoriesB2C, getGouvernorats } from "@/lib/referentials";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LinkUP — Moteur de recherche MARKET-UP",
  description: "Le carnet de contacts des entreprises tunisiennes. Trouvez les coordonnées des professionnels en Tunisie.",
};

async function LinkUpSearchInner(): Promise<JSX.Element> {
  const [sectors, categories, gouvernorats] = await Promise.all([
    getSectorsB2B(),
    getCategoriesB2C(),
    getGouvernorats(),
  ]);

  return (
    <SearchPageClient
      product="linkup"
      sectors={sectors}
      categories={categories}
      gouvernorats={gouvernorats}
    />
  );
}

export default function LinkUpSearchPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf9f8]" />}>
      <LinkUpSearchInner />
    </Suspense>
  );
}

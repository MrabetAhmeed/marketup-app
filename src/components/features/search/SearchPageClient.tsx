"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import PublicSearchHeader from "@/components/shared/PublicSearchHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import SponsorBanner from "./SponsorBanner";
import SearchResultCard from "./SearchResultCard";
import SearchEmptyState from "./SearchEmptyState";
import ProfilePopup from "./ProfilePopup";
import type { SearchResultCard as CardType } from "@/services/public-search.service";

type ProductKey = "brandup" | "traceup" | "linkup";

const PRODUCT_ACCENT: Record<ProductKey, string> = {
  brandup: "#0078D4",
  traceup: "#8764B8",
  linkup: "#000000",
};

const PRODUCT_PLACEHOLDER: Record<ProductKey, string> = {
  brandup: "Entreprise, secteur, produit, ville\u2026",
  traceup: "Mots-cl\u00e9s, secteur, ville, vid\u00e9o\u2026",
  linkup: "Nom, fonction, entreprise, ville\u2026",
};

const PRODUCT_SUBTITLE: Record<ProductKey, string> = {
  brandup: "Base de donn\u00e9es compl\u00e8te des professionnels en Tunisie",
  traceup: "Les vid\u00e9os des entreprises tunisiennes",
  linkup: "Le carnet de contacts des entreprises tunisiennes",
};

interface Sector { slug: string; name: string }
interface Gouvernorat { slug: string; name: string }

interface SearchPageClientProps {
  product: ProductKey;
  sectors: Sector[];
  categories: Sector[];
  gouvernorats: Gouvernorat[];
}

export default function SearchPageClient({ product, sectors, categories, gouvernorats }: SearchPageClientProps): JSX.Element {
  const accent = PRODUCT_ACCENT[product];
  const [activeType, setActiveType] = useState<"B2B" | "B2C">("B2B");
  const [query, setQuery] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [results, setResults] = useState<CardType[]>([]);
  const [searchState, setSearchState] = useState<"initial" | "results" | "empty">("initial");
  const [loading, setLoading] = useState(false);

  // Bug 6 fix: read ?type= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type")?.toUpperCase();
    if (t === "B2C") setActiveType("B2C");
  }, []);
  const [resultCount, setResultCount] = useState(0);
  const hasSearchedRef = useRef(false);
  const [popupSlug, setPopupSlug] = useState<string | null>(null);

  const sectorList = activeType === "B2B" ? sectors : categories;

  const performSearch = useCallback(async () => {
    setLoading(true);
    hasSearchedRef.current = true;
    try {
      const params = new URLSearchParams();
      params.set("type", activeType);
      if (query.trim()) params.set("q", query.trim());
      if (gouvernorat) params.set("gouvernorat", gouvernorat);
      if (sectorId) params.set("sectorId", sectorId);
      params.set("limit", "40");

      const res = await fetch(`/api/v1/search/${product}?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const items: CardType[] = data.items ?? [];
      setResults(items);
      setResultCount(items.length);
      setSearchState(items.length > 0 ? "results" : "empty");
    } catch {
      setResults([]);
      setResultCount(0);
      setSearchState("empty");
    } finally {
      setLoading(false);
    }
  }, [activeType, query, gouvernorat, sectorId, product]);

  const handleTypeChange = useCallback((t: "B2B" | "B2C") => {
    setActiveType(t);
    setQuery("");
    setGouvernorat("");
    setSectorId("");
    setResults([]);
    setSearchState("initial");
    hasSearchedRef.current = false;
    setResultCount(0);
  }, []);

  // Sector dropdown change re-triggers search if already searched
  useEffect(() => {
    if (hasSearchedRef.current) {
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") performSearch();
  }, [performSearch]);

  const countLabel = resultCount === 0
    ? (searchState === "initial" ? "\u2014 r\u00e9sultats" : "Aucun r\u00e9sultat")
    : resultCount === 1 ? "1 r\u00e9sultat" : `${resultCount} r\u00e9sultats`;

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicSearchHeader product={product} activeType={activeType} onTypeChange={handleTypeChange} />

      {/* Spacer for fixed navbar */}
      <div className="pt-[64px] md:pt-[72px]">
        {/* Hero */}
        <section className="bg-white py-12 lg:py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl lg:text-[42px] leading-tight font-bold text-[#242424] mb-4">
              Trouvez les entreprises tunisiennes
            </h1>
            <p className="text-[#616161] text-base lg:text-lg mb-10">
              {PRODUCT_SUBTITLE[product]}
            </p>

            {/* Search bar */}
            <div className="max-w-[860px] mx-auto bg-white border border-[#D1D1D1] rounded-lg flex flex-col md:flex-row items-stretch p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all gap-1 md:gap-0">
              <div className="flex items-center flex-1 px-4 md:border-r border-[#D1D1D1]">
                <span className="material-symbols-outlined text-[#616161] mr-3">search</span>
                <input
                  className="w-full border-none focus:ring-0 focus:outline-none text-on-surface placeholder-[#616161] py-3 lg:py-4 bg-transparent"
                  placeholder={PRODUCT_PLACEHOLDER[product]}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="flex items-center px-4 w-full md:w-56 bg-transparent rounded-none">
                <span className="material-symbols-outlined text-[#616161] mr-2">location_on</span>
                <select
                  className="w-full border-none focus:ring-0 focus:outline-none text-on-surface text-sm bg-transparent appearance-none py-3"
                  value={gouvernorat}
                  onChange={(e) => setGouvernorat(e.target.value)}
                >
                  <option value="">Toute la Tunisie</option>
                  {gouvernorats.map((g) => (
                    <option key={g.slug} value={g.slug}>{g.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={performSearch}
                disabled={loading}
                className="text-white px-8 py-3 lg:py-4 rounded-lg font-semibold transition-colors w-full md:w-auto disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {loading ? "Recherche\u2026" : "Rechercher"}
              </button>
            </div>

            {/* Popular tags */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <span className="text-[#616161]">Populaire :</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                {["Agro-Industrie", "Textile", "IT", "BTP"].map((tag, i) => (
                  <span key={tag} className="flex items-center gap-3">
                    {i > 0 && <span className="hidden sm:inline text-[#D1D1D1]">&middot;</span>}
                    <button
                      type="button"
                      className="hover:underline"
                      style={{ color: accent }}
                      onClick={() => { setQuery(tag); }}
                    >
                      {tag}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sponsor banner */}
        <SponsorBanner />

        {/* Sticky filters bar */}
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-[#F5F5F5] border-y border-[#E0E0E0] px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-[#242424]">{countLabel}</span>
            <span className="hidden md:inline text-[#D1D1D1]">&middot;</span>
            <select
              className="bg-white border border-[#D1D1D1] rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-[#242424] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              <option value="">{activeType === "B2B" ? "Tous secteurs" : "Toutes cat\u00e9gories"}</option>
              {sectorList.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results area */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          {searchState === "initial" && <SearchEmptyState variant="initial" accentColor={accent} />}
          {searchState === "empty" && <SearchEmptyState variant="empty" accentColor={accent} />}
          {searchState === "results" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {results.map((r) => (
                <SearchResultCard
                  key={r.slug}
                  slug={r.slug}
                  displayName={r.displayName}
                  bannerUrl={r.bannerUrl}
                  color={r.color}
                  pitch={r.pitch}
                  sectorName={r.sectorName}
                  gouvernoratName={r.gouvernoratName}
                  rseBadgeStatus={r.rseBadgeStatus}
                  accentColor={accent}
                  onClick={() => setPopupSlug(r.slug)}
                />
              ))}
            </div>
          )}
        </section>

        <PublicFooter />
      </div>

      {/* Profile popup modal */}
      {popupSlug && (
        <ProfilePopup
          product={product}
          slug={popupSlug}
          onClose={() => setPopupSlug(null)}
        />
      )}
    </div>
  );
}

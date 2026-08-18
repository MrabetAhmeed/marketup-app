"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import PublicSearchHeader from "@/components/shared/PublicSearchHeader";
import PublicFooter from "@/components/shared/PublicFooter";
import type { SearchResultCard as CardType } from "@/services/public-search.service";
import type { SponsorBannerData } from "@/services/sponsoring.service";
import SponsorBanner from "./SponsorBanner";
import SearchResultCard from "./SearchResultCard";
import SearchEmptyState from "./SearchEmptyState";
import ProfilePopup from "./ProfilePopup";

type ProductKey = "brandup" | "traceup" | "linkup";

const PRODUCT_ACCENT: Record<ProductKey, string> = {
  brandup: "#0078D4",
  traceup: "#8764B8",
  linkup: "#000000",
};

const PRODUCT_PLACEHOLDER: Record<ProductKey, string> = {
  brandup: "Entreprise, secteur, activit\u00e9\u2026",
  traceup: "Entreprise, secteur, titre de vid\u00e9o\u2026",
  linkup: "Entreprise, contact, secteur\u2026",
};

const PRODUCT_TITLES: Record<ProductKey, Record<"B2B" | "B2C", { title: string; subtitle: string }>> = {
  brandup: {
    B2B: { title: "La référence des acteurs économiques tunisiens", subtitle: "Au cœur des marques" },
    B2C: { title: "La référence des marques en Tunisie", subtitle: "Au cœur des marques" },
  },
  traceup: {
    B2B: { title: "Le flux vidéo de l'économie tunisienne", subtitle: "L'actualité des entreprises près de chez vous" },
    B2C: { title: "Le flux vidéo de l'économie tunisienne", subtitle: "L'actualité des entreprises près de chez vous" },
  },
  linkup: {
    B2B: { title: "L'accès direct à l'économie tunisienne", subtitle: "S'interconnecter et échanger" },
    B2C: { title: "L'accès direct à l'économie tunisienne", subtitle: "S'interconnecter et échanger" },
  },
};

const PAGE_SIZE = 8;

interface SectorItem { slug: string; name: string; group?: string; groupOrder?: number }
interface Gouvernorat { slug: string; name: string }

interface SearchPageClientProps {
  product: ProductKey;
  sectors: SectorItem[];
  categories: SectorItem[];
  gouvernorats: Gouvernorat[];
  sponsors?: SponsorBannerData[];
}

export default function SearchPageClient({ product, sectors, categories, gouvernorats, sponsors }: SearchPageClientProps): JSX.Element {
  const accent = PRODUCT_ACCENT[product];
  const [activeType, setActiveType] = useState<"B2B" | "B2C">("B2B");
  const [query, setQuery] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [results, setResults] = useState<CardType[]>([]);
  const [searchState, setSearchState] = useState<"initial" | "results" | "empty">("initial");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [popupSlug, setPopupSlug] = useState<string | null>(null);
  const [appliedSectorId, setAppliedSectorId] = useState("");
  const mountedRef = useRef(false);

  // Bug 6 fix: read ?type= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type")?.toUpperCase();
    if (t === "B2C") setActiveType("B2C");
  }, []);

  const sectorList = activeType === "B2B" ? sectors : categories;

  const performSearch = useCallback(async (overrideType?: "B2B" | "B2C") => {
    setLoading(true);
    try {
      const type = overrideType ?? activeType;
      const params = new URLSearchParams();
      params.set("type", type);
      if (query.trim()) params.set("q", query.trim());
      if (gouvernorat) params.set("gouvernorat", gouvernorat);
      if (sectorId) params.set("sectorId", sectorId);
      params.set("limit", "200");

      const res = await fetch(`/api/v1/search/${product}?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const items: CardType[] = data.items ?? [];
      setResults(items);
      setSearchState(items.length > 0 ? "results" : "empty");
      setPage(1);
      setAppliedSectorId(sectorId);
    } catch {
      setResults([]);
      setSearchState("empty");
    } finally {
      setLoading(false);
    }
  }, [activeType, query, gouvernorat, sectorId, product]);

  // Auto-load on mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = useCallback((t: "B2B" | "B2C") => {
    setActiveType(t);
    setQuery("");
    setGouvernorat("");
    setSectorId("");
    setAppliedSectorId("");
    setResults([]);
    setSearchState("initial");
    setPage(1);
    // Fetch with the new type immediately
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set("type", t);
      params.set("limit", "200");
      setLoading(true);
      fetch(`/api/v1/search/${product}?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          const items: CardType[] = data.items ?? [];
          setResults(items);
          setSearchState(items.length > 0 ? "results" : "empty");
        })
        .catch(() => { setResults([]); setSearchState("empty"); })
        .finally(() => setLoading(false));
    }, 0);
  }, [product]);

  // A4: no auto-search on filter change — search only on button click / Enter

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") performSearch();
  }, [performSearch]);

  // Client-side pagination
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const paginated = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countLabel = results.length === 0
    ? (searchState === "initial" ? "\u2014 r\u00e9sultats" : "Aucun r\u00e9sultat")
    : results.length === 1 ? "1 r\u00e9sultat" : `${results.length} r\u00e9sultats`;

  // Filter sponsors by selected sector (client-side)
  // Sponsors filtered by the APPLIED sector (after search), not the live dropdown
  const filteredSponsors = useMemo(() => {
    const all = sponsors ?? [];
    if (!appliedSectorId) return all;
    const matching = all.filter((s) => s.companySectorId === appliedSectorId);
    return matching.length > 0 ? matching : [];
  }, [sponsors, appliedSectorId]);

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PublicSearchHeader product={product} activeType={activeType} onTypeChange={handleTypeChange} />

      {/* Spacer for fixed navbar */}
      <div className="pt-[64px] md:pt-[72px]">
        {/* Hero — reduced padding */}
        <section className="bg-white pt-12 lg:pt-20 pb-5 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl lg:text-[42px] leading-tight font-bold text-[#242424] mb-3">
              {PRODUCT_TITLES[product][activeType].title}
            </h1>
            <p className="text-[#616161] text-base lg:text-lg mb-6">
              {PRODUCT_TITLES[product][activeType].subtitle}
            </p>

            {/* Search bar — sector integrated, stronger border */}
            <div className="max-w-[860px] mx-auto bg-white border-2 border-[#C0C0C0] rounded-lg shadow-sm flex flex-col md:flex-row items-stretch p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all gap-1 md:gap-0">
              {/* Text input */}
              <div className="flex items-center flex-1 px-4 md:border-r border-[#D1D1D1]">
                <span className="material-symbols-outlined text-[#616161] mr-3">search</span>
                <input
                  className="w-full border-none focus:ring-0 focus:outline-none text-on-surface placeholder-[#616161] py-3 bg-transparent text-sm"
                  placeholder={PRODUCT_PLACEHOLDER[product]}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {/* Sector dropdown */}
              <div className="flex items-center px-3 w-full md:w-48 md:border-r border-[#D1D1D1]">
                <span className="material-symbols-outlined text-[#616161] mr-2" style={{ fontSize: 18 }}>category</span>
                <select
                  className="w-full border-none focus:ring-0 focus:outline-none text-on-surface text-sm bg-transparent appearance-none py-3 truncate"
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                >
                  <option value="">{activeType === "B2B" ? "Tous secteurs" : "Toutes cat\u00e9gories"}</option>
                  {sectorList.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>
              {/* Gouvernorat dropdown */}
              <div className="flex items-center px-3 w-full md:w-44">
                <span className="material-symbols-outlined text-[#616161] mr-2" style={{ fontSize: 18 }}>location_on</span>
                <select
                  className="w-full border-none focus:ring-0 focus:outline-none text-on-surface text-sm bg-transparent appearance-none py-3 truncate"
                  value={gouvernorat}
                  onChange={(e) => setGouvernorat(e.target.value)}
                >
                  <option value="">Toute la Tunisie</option>
                  {gouvernorats.map((g) => (
                    <option key={g.slug} value={g.slug}>{g.name}</option>
                  ))}
                </select>
              </div>
              {/* Search button */}
              <button
                type="button"
                onClick={() => performSearch()}
                disabled={loading}
                className="text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full md:w-auto disabled:opacity-60 text-sm"
                style={{ backgroundColor: accent }}
              >
                {loading ? "Recherche\u2026" : "Rechercher"}
              </button>
            </div>
          </div>
        </section>

        {/* Sponsor banner */}
        <SponsorBanner sponsors={filteredSponsors} accent={accent} product={product} />

        {/* Sticky results count bar */}
        <div className="sticky top-[64px] md:top-[72px] z-40 bg-[#F5F5F5] border-y border-[#E0E0E0] px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-[#242424]">{countLabel}</span>
          </div>
        </div>

        {/* Results area */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          {searchState === "empty" && <SearchEmptyState variant="empty" accentColor={accent} />}
          {searchState === "initial" && loading && (
            <div className="py-16 text-center text-ink-tertiary text-sm">Chargement…</div>
          )}
          {searchState === "results" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {paginated.map((r) => (
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
                    boosted={r.boosted}
                    onClick={() => setPopupSlug(r.slug)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-surface-border"
                    aria-label="Page précédente"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] ?? 0) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-ink-tertiary text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className={`w-9 h-9 rounded-lg text-[13px] font-semibold transition-colors border ${
                            p === page
                              ? "text-white border-transparent"
                              : "text-ink-secondary border-surface-border hover:bg-surface-muted"
                          }`}
                          style={p === page ? { backgroundColor: accent } : undefined}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-surface-border"
                    aria-label="Page suivante"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                  <span className="text-[11px] text-ink-tertiary ml-2">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, results.length)} sur {results.length}
                  </span>
                </div>
              )}
            </>
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

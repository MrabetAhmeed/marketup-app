"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRODUCTS = {
  brandup: {
    name: "BrandUP",
    logo: "/shared/logos/logos-brandup.png",
    searchUrl: "/brandup",
    color: "#0078D4",
    accentBg: "#EFF6FC",
  },
  traceup: {
    name: "TraceUP",
    logo: "/shared/logos/logos-traceup.png",
    searchUrl: "/traceup",
    color: "#8764B8",
    accentBg: "#F3EEFB",
  },
  linkup: {
    name: "LinkUP",
    logo: "/shared/logos/logos-linkup.png",
    searchUrl: "/linkup",
    color: "#C5A059",
    accentBg: "#FAF6EC",
  },
} as const;

type ProductKey = keyof typeof PRODUCTS;

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const [productKey, setProductKey] = useState<ProductKey>("brandup");
  const [countryOpen, setCountryOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  const product = PRODUCTS[productKey];

  // Read ?product= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = (params.get("product") || "brandup").toLowerCase() as ProductKey;
    if (p in PRODUCTS) setProductKey(p);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
      if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) setLauncherOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCountryOpen(false);
        setLauncherOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeAll = useCallback(() => {
    setCountryOpen(false);
    setLauncherOpen(false);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: "#000" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-2 md:gap-3 px-3 md:px-6 min-h-[64px] md:h-[72px] bg-gradient-to-b from-black/70 to-black/30 border-b border-white/10">
        {/* Left — Country */}
        <div className="shrink-0 md:w-1/3 flex items-center">
          <div className="relative" ref={countryRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCountryOpen(!countryOpen); setLauncherOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-sm text-white text-sm rounded-lg border border-white/10 hover:bg-black/60 transition-colors"
            >
              <span className="text-base">🇹🇳</span>
              <span className="font-medium hidden sm:inline">Tunisie</span>
              <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
            </button>
            {countryOpen && (
              <div className="absolute left-0 mt-2 w-60 bg-white rounded-xl border border-[#E0E0E0] overflow-hidden z-50" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
                <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#EFF6FC] transition-colors">
                  <span className="text-lg">🇹🇳</span>
                  <span className="flex-1 text-sm font-semibold text-[#242424]">Tunisie</span>
                  <span className="material-symbols-outlined text-[#0078D4] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </button>
                <div className="border-t border-[#F0F0F0]" />
                {[
                  { flag: "🇫🇷", name: "France" },
                  { flag: "🇲🇦", name: "Maroc" },
                  { flag: "🇩🇿", name: "Algérie" },
                ].map((c) => (
                  <button key={c.name} type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-50 cursor-not-allowed" disabled>
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#242424]">{c.name}</div>
                      <div className="text-xs text-[#616161]">Bientôt disponible</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center — Product logo */}
        <div className="flex-1 md:w-1/3 flex items-center justify-center min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.logo}
            alt={product.name}
            className="h-7 md:h-10 w-auto object-contain brightness-0 invert max-w-full"
          />
        </div>

        {/* Right — Launcher + Connexion + CTA */}
        <div className="shrink-0 md:w-1/3 flex items-center justify-end gap-1 md:gap-3">
          {/* App launcher */}
          <div className="relative" ref={launcherRef}>
            <button
              type="button"
              aria-label="Produits MARKET-UP"
              onClick={(e) => { e.stopPropagation(); setLauncherOpen(!launcherOpen); setCountryOpen(false); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <span className="material-symbols-outlined">apps</span>
            </button>
            {launcherOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E0E0E0] p-3 z-50" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#616161] px-2 pt-1 pb-2">
                  Produits MARKET-UP
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["brandup", "traceup", "linkup"] as const).map((key) => {
                    const p = PRODUCTS[key];
                    const isActive = key === productKey;
                    const icons = { brandup: "storefront", traceup: "play_circle", linkup: "qr_code_2" } as const;
                    const tileBg = key === "linkup" ? "#1A1A1A" : p.color;
                    const tileBorder = key === "linkup" ? `1px solid ${p.color}50` : "none";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setProductKey(key); closeAll(); }}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg text-center hover:bg-[#F5F5F5] transition-colors"
                        style={isActive ? { backgroundColor: p.accentBg, border: `1px solid ${p.color}33` } : {}}
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ background: tileBg, border: tileBorder }}
                        >
                          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", color: key === "linkup" ? p.color : "white" }}>
                            {icons[key]}
                          </span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: isActive ? p.color : "#242424" }}>
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/login"
            className="hidden md:inline-block px-3 py-2 text-sm font-medium text-white hover:text-[#d3e3ff] transition-colors whitespace-nowrap"
          >
            Connexion
          </Link>
          <Link
            href="/signup/company"
            className="px-3 py-2 md:px-5 md:py-2.5 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded-lg text-xs md:text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <span className="hidden md:inline">Inscrire une marque</span>
            <span className="md:hidden">S&apos;inscrire</span>
          </Link>
        </div>
      </header>

      {/* Central pivot "OU" — desktop only */}
      <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex-col items-center" style={{ animation: "float 4s ease-in-out infinite" }}>
        <div className="w-16 h-16 rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl flex items-center justify-center">
          <span className="text-white font-extrabold text-sm tracking-widest">OU</span>
        </div>
      </div>

      {/* Main — Split B2B / B2C */}
      <main className="split-container group/split flex flex-col md:flex-row flex-grow w-full overflow-hidden">
        {/* B2B Panel */}
        <section
          className="split-panel group relative w-full md:w-1/2 h-1/2 md:h-full cursor-pointer overflow-hidden"
          onClick={() => router.push(`${product.searchUrl}?type=B2B`)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="B2B" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" src="/shared/onboarding-images/onboarding-images-b2b_img.jpg" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 z-[6]" />
          <div className="relative z-10 h-full flex flex-col justify-end p-8 pt-24 md:p-16 lg:p-24">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-4 bg-black/40 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="w-8 h-[2px] bg-[#0078D4]" />
                <span className="font-bold text-xs uppercase tracking-widest text-white">Espace Professionnel</span>
              </div>
              <h2 className="text-white text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">B2B</h2>
              <p className="text-white/80 text-base md:text-lg font-medium leading-relaxed mb-8 md:opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                Connectez votre entreprise aux fournisseurs, partenaires et services industriels. Développez votre réseau professionnel.
              </p>
              <Link
                href={`${product.searchUrl}?type=B2B`}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto inline-flex py-4 px-8 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded-lg font-bold items-center justify-center gap-3 transition-colors"
              >
                Choisir B2B
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* B2C Panel */}
        <section
          className="split-panel group relative w-full md:w-1/2 h-1/2 md:h-full cursor-pointer overflow-hidden border-t md:border-t-0 md:border-l border-white/10"
          onClick={() => router.push(`${product.searchUrl}?type=B2C`)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="B2C" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" src="/shared/onboarding-images/onboarding-images-b2c_img.jpg" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 z-[6]" />
          <div className="relative z-10 h-full flex flex-col justify-end p-8 pt-24 md:p-16 lg:p-24">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-4 bg-black/40 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="w-8 h-[2px] bg-white" />
                <span className="font-bold text-xs uppercase tracking-widest text-white">Espace Grand Public</span>
              </div>
              <h2 className="text-white text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">B2C</h2>
              <p className="text-white/80 text-base md:text-lg font-medium leading-relaxed mb-8 md:opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                Présentez vos produits aux particuliers et consommateurs. Boostez votre visibilité directe.
              </p>
              <Link
                href={`${product.searchUrl}?type=B2C`}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto inline-flex py-4 px-8 border border-white text-white rounded-lg font-bold items-center justify-center gap-3 transition-colors hover:bg-white hover:text-[#242424]"
              >
                Choisir B2C
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Float animation + split-panel hover behavior */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        .split-panel {
          transition: all 0.7s cubic-bezier(0.23, 1, 0.32, 1);
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) {
          .split-container:hover .split-panel {
            width: 45%;
            filter: grayscale(0.2) brightness(0.7);
          }
          .split-container .split-panel:hover {
            width: 55%;
            filter: grayscale(0) brightness(1.1);
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}

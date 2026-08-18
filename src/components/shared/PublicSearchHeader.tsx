"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import AppLauncher from "./AppLauncher";

type ProductKey = "brandup" | "traceup" | "linkup";

const PRODUCT_CONFIG = {
  brandup: { name: "BrandUP", logo: "/shared/logos/logos-brandup.png", color: "#0078D4" },
  traceup: { name: "TraceUP", logo: "/shared/logos/logos-traceup.png", color: "#8764B8" },
  linkup: { name: "LinkUP", logo: "/shared/logos/logos-linkup.png", color: "#C5A059" },
} as const;

interface PublicSearchHeaderProps {
  product: ProductKey;
  activeType: "B2B" | "B2C";
  onTypeChange: (type: "B2B" | "B2C") => void;
}

export default function PublicSearchHeader({ product, activeType, onTypeChange }: PublicSearchHeaderProps): JSX.Element {
  const config = PRODUCT_CONFIG[product];
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === "Escape") { setCountryOpen(false); setMobileOpen(false); }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm px-3 md:px-8 flex items-center justify-between border-b border-outline-variant min-h-[64px] md:h-[72px]">
        {/* Left: Country + B2B/B2C toggle */}
        <div className="shrink-0 md:w-1/3 flex items-center gap-3">
          {/* Country dropdown — desktop only */}
          <div className="relative hidden md:block" ref={countryRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCountryOpen(!countryOpen); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-on-surface-variant font-medium hover:bg-surface-container transition-colors"
            >
              <span className="text-base">🇹🇳</span>
              <span>Tunisie</span>
              <span className="material-symbols-outlined text-lg">expand_more</span>
            </button>
            {countryOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg border border-outline-variant py-1.5 z-[60]" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#EFF6FC] transition-colors">
                  <span className="text-lg">🇹🇳</span>
                  <span className="flex-1 text-sm font-semibold text-[#242424]">Tunisie</span>
                  <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </button>
                <div className="my-1 h-px bg-outline-variant" />
                <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bient&ocirc;t disponible</p>
                {["🇫🇷 France", "🇲🇦 Maroc", "🇩🇿 Algérie"].map((c) => (
                  <button key={c} type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-left opacity-50 cursor-not-allowed" disabled>
                    <span className="text-lg">{c.split(" ")[0]}</span>
                    <span className="text-sm text-[#242424]">{c.split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* B2B/B2C toggle */}
          <div className="flex bg-surface-container rounded-full p-1 h-8 items-center">
            {(["B2B", "B2C"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={`px-3 h-6 rounded-full text-[11px] font-bold transition-all ${
                  activeType === t
                    ? "bg-white shadow text-primary cursor-default"
                    : "text-[#64748b] hover:text-primary cursor-pointer"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Logo */}
        <div className="flex items-center justify-center w-1/3">
          <Link className="flex items-center gap-2 hover:opacity-80 transition-opacity" href={`/${product}`}>
            <img alt={config.name} className="h-8 md:h-10 w-auto object-contain" src={config.logo} />
          </Link>
        </div>

        {/* Right: App launcher + Auth */}
        <div className="flex items-center justify-end md:w-1/3 gap-2">
          <AppLauncher current={product} />
          <div className="hidden md:flex items-center gap-4 ml-2">
            <Link href="/login" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Connexion
            </Link>
            <Link
              href="/signup/company"
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#106EBE] transition-colors whitespace-nowrap"
            >
              Référencer une marque
            </Link>
          </div>
          <button
            type="button"
            className="md:hidden flex items-center p-2 text-on-surface-variant"
            onClick={() => setMobileOpen(true)}
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] bg-white md:hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-end mb-6">
              <button type="button" onClick={() => setMobileOpen(false)}>
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="text-lg">🇹🇳</span>
                <span className="text-sm font-medium">Tunisie</span>
              </div>
              <Link href="/login" className="text-base font-semibold text-on-surface hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>
                Connexion
              </Link>
              <Link
                href="/signup/company"
                className="text-center px-5 py-3 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#106EBE] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Référencer une marque
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

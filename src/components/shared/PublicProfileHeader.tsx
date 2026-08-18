"use client";

import { useState } from "react";
import Link from "next/link";

type ProductKey = "brandup" | "traceup" | "linkup";

const PRODUCT_CONFIG = {
  brandup: { name: "BrandUP", logo: "/shared/logos/logos-brandup.png", searchHref: "/brandup" },
  traceup: { name: "TraceUP", logo: "/shared/logos/logos-traceup.png", searchHref: "/traceup" },
  linkup: { name: "LinkUP", logo: "/shared/logos/logos-linkup.png", searchHref: "/linkup" },
} as const;

interface PublicProfileHeaderProps {
  product: ProductKey;
}

export default function PublicProfileHeader({ product }: PublicProfileHeaderProps): JSX.Element {
  const config = PRODUCT_CONFIG[product];
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm px-4 md:px-8 flex items-center justify-between border-b border-outline-variant min-h-[64px] md:h-[72px]">
        {/* Left: Back */}
        <div className="w-1/3 flex items-center">
          <Link
            href={config.searchHref}
            className="flex items-center gap-1 md:gap-2 text-primary hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="hidden md:inline text-sm font-semibold">Retour</span>
          </Link>
        </div>

        {/* Center: Logo */}
        <div className="w-1/3 flex items-center justify-center">
          <Link href={config.searchHref} className="hover:opacity-80 transition-opacity">
            <img alt={config.name} className="h-8 md:h-10 w-auto object-contain" src={config.logo} />
          </Link>
        </div>

        {/* Right: Auth */}
        <div className="w-1/3 flex items-center justify-end gap-4">
          <div className="hidden md:flex items-center gap-4">
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
              <Link href={config.searchHref} className="flex items-center gap-2 text-primary font-semibold" onClick={() => setMobileOpen(false)}>
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Retour
              </Link>
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

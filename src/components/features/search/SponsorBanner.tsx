"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SponsorBannerData } from "@/services/sponsoring.service";

type ProductKey = "brandup" | "traceup" | "linkup";

interface SponsorBannerProps {
  sponsors: SponsorBannerData[];
  accent: string;
  product: ProductKey;
}

const ROTATION_INTERVAL_MS = 10_000;

const DEFAULT_BANNER_IMAGES: Record<ProductKey, string> = {
  brandup: "/banners/default-brandup.jpg",
  traceup: "/banners/default-traceup.jpg",
  linkup: "/banners/default-linkup.jpg",
};

/** Beacon impression tracking — fire-and-forget, never blocks UI. */
function trackImpression(sponsoringId: string): void {
  try {
    const body = JSON.stringify({ sponsoringId, event: "sponsor_impression" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/public/track", new Blob([body], { type: "application/json" }));
    }
  } catch {
    // fail-silent
  }
}

/** Beacon click tracking — never delays link opening. */
function trackClick(sponsoringId: string): void {
  try {
    const body = JSON.stringify({ sponsoringId, event: "sponsor_click" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/public/track", new Blob([body], { type: "application/json" }));
    }
  } catch {
    // fail-silent
  }
}

// Accent config per engine for default banner fallback
const ACCENT_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  "#0078D4": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "BrandUP" },
  "#8764B8": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", label: "TraceUP" },
  "#000000": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "LinkUP" },
};

export default function SponsorBanner({ sponsors, accent, product }: SponsorBannerProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const impressedRef = useRef<Set<string>>(new Set());
  const [imgError, setImgError] = useState(false);

  // Track impression for the current banner (dedup per page mount cycle)
  const trackCurrentImpression = useCallback((sponsor: SponsorBannerData) => {
    if (impressedRef.current.has(sponsor.id)) return;
    impressedRef.current.add(sponsor.id);
    trackImpression(sponsor.id);
  }, []);

  // Track initial banner impression on mount
  useEffect(() => {
    if (sponsors.length > 0) {
      trackCurrentImpression(sponsors[0]!);
    }
  }, [sponsors, trackCurrentImpression]);

  // Carousel rotation (only when 2+ sponsors)
  useEffect(() => {
    if (sponsors.length < 2) return;

    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % sponsors.length;
          const nextSponsor = sponsors[next]!;
          trackCurrentImpression(nextSponsor);
          return next;
        });
        setFade(true);
      }, 300);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [sponsors, trackCurrentImpression]);

  // Default banner (no active sponsoring)
  if (sponsors.length === 0) {
    const cfg = ACCENT_CONFIG[accent] ?? ACCENT_CONFIG["#0078D4"]!;
    const defaultImg = DEFAULT_BANNER_IMAGES[product];

    // Image-based default banner (with HTML button overlay)
    if (!imgError) {
      return (
        <section className="px-6 pt-6 pb-2 max-w-7xl mx-auto">
          <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "4/1" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaultImg}
              alt={`Bannière ${cfg.label}`}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <a
              href="/dashboard/sponsoring"
              className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10 inline-flex items-center px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-[13px] font-semibold text-white bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              En savoir plus
              <span className="material-symbols-outlined ml-1 sm:ml-1.5 text-sm sm:text-base">arrow_forward</span>
            </a>
          </div>
        </section>
      );
    }

    // Fallback HTML/CSS banner (if image file is missing)
    return (
      <section className="px-6 pt-6 pb-2 max-w-7xl mx-auto">
        <div className={`w-full rounded-lg overflow-hidden ${cfg.bg} border ${cfg.border} px-6 md:px-10 flex flex-col md:flex-row items-center justify-center gap-4`} style={{ aspectRatio: "4/1" }}>
          <div>
            <p className={`text-base font-semibold ${cfg.text}`}>
              Votre bannière ici — Sponsorisez votre entreprise sur vivasky.media
            </p>
            <p className="text-sm text-[#616161] mt-1">
              Affichez votre entreprise en tête des résultats de recherche {cfg.label}.
            </p>
          </div>
          <a
            href="/dashboard/sponsoring"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: accent === "#000000" ? "#C5A059" : accent }}
          >
            En savoir plus
            <span className="material-symbols-outlined ml-1.5 text-base">arrow_forward</span>
          </a>
        </div>
      </section>
    );
  }

  // Real sponsored banner (single or carousel)
  const sponsor = sponsors[currentIndex % sponsors.length]!;

  return (
    <section className="px-6 pt-6 pb-2 max-w-7xl mx-auto">
      <a
        href={sponsor.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(sponsor.id)}
        className="block relative w-full rounded-lg overflow-hidden bg-slate-900 group"
        style={{ aspectRatio: "4/1" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={sponsor.id}
          alt={`Sponsorisé — ${sponsor.companyName}`}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-all duration-500"
          style={{ opacity: fade ? 1 : 0, transition: "opacity 300ms ease-in-out" }}
          src={sponsor.bannerUrl}
        />
        <span className="absolute top-3 left-3 z-10 text-[10px] font-bold tracking-widest uppercase text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
          Sponsorisé
        </span>
      </a>
    </section>
  );
}

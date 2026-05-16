"use client";

import Link from "next/link";
import type { RsePageData } from "@/types/rse";

interface RseBadgeHeroProps {
  data: RsePageData;
  companySlug: string;
  onOpenDonation: () => void;
}

export function RseBadgeHero({ data, companySlug, onOpenDonation }: RseBadgeHeroProps): JSX.Element {
  if (data.badgeStatus === "validated") {
    return (
      <section className="border border-[#E8C96A] bg-gradient-to-br from-[#FEFCE8] to-[#FFF8E1] rounded-lg p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-6">
          {/* Badge medallion */}
          <div className="w-16 h-16 rounded-full bg-[#FEFCE8] border-2 border-[#E8C96A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 32 }}>
              workspace_premium
            </span>
          </div>
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded bg-[#FEFCE8] text-[#8A6A1F] border-[#E8C96A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                Engagement Social Attesté
              </span>
              {data.badgeValidatedAt && (
                <span className="text-[11px] text-[#8A6A1F]">
                  Validé le {formatDate(data.badgeValidatedAt)}
                </span>
              )}
            </div>
            <h2 className="font-heading font-bold text-[22px] text-[#5D4201] leading-tight mb-1">
              Votre badge RSE est actif
            </h2>
            <p className="text-[13.5px] text-[#8A6A1F] leading-relaxed max-w-2xl mb-4">
              Le badge « Engagement Social Attesté » est visible sur vos profils BrandUP,
              TraceUP et LinkUP. Il témoigne de votre contribution auprès des associations
              tunisiennes reconnues.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenDonation}
                className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#C5A059] hover:bg-[#8A6A1F] rounded transition-colors"
              >
                <span className="material-symbols-outlined icon-fill" style={{ fontSize: 16 }}>add_circle</span>
                Soumettre un nouveau reçu
              </button>
              <Link
                href={`/brandup/${companySlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                Voir sur BrandUP
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // No badge (none status)
  return (
    <section className="border border-surface-border bg-surface-subtle rounded-lg p-5 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-6">
        <div className="w-16 h-16 rounded-full bg-surface-muted border-2 border-surface-border flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>
            volunteer_activism
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-bold text-[22px] text-ink-primary leading-tight mb-1">
            Démarrez votre engagement RSE
          </h2>
          <p className="text-[13.5px] text-ink-secondary leading-relaxed max-w-2xl mb-4">
            Faites un don auprès d&apos;une association tunisienne reconnue et soumettez votre reçu.
            Après validation, le badge « Engagement Social Attesté » sera affiché sur vos 3 profils publics.
          </p>
          <button
            type="button"
            onClick={onOpenDonation}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#C5A059] hover:bg-[#8A6A1F] rounded transition-colors"
          >
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 16 }}>add_circle</span>
            Faire un premier don
          </button>
        </div>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

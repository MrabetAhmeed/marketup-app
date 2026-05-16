"use client";

import Link from "next/link";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { StubKey } from "@/lib/stub-messages";

type FeatureKind = "boost" | "sponsoring" | "billing";

const KIND_CONFIG: Record<FeatureKind, { icon: string; title: string; description: string; stubKey: StubKey }> = {
  boost: {
    icon: "trending_up",
    title: "Boost — Bientôt disponible",
    description: "Boostez la visibilité de vos profils dans les moteurs de recherche MARKET-UP. Mettez en avant votre entreprise pendant 30 jours et générez plus de vues. Module en développement final.",
    stubKey: "FEATURE_COMING_SOON_BOOST",
  },
  sponsoring: {
    icon: "campaign",
    title: "Sponsoring — Bientôt disponible",
    description: "Lancez des campagnes ciblées sur les profils MARKET-UP. Bannières sponsorisées dans les résultats de recherche pour toucher votre audience B2B. Module en développement final.",
    stubKey: "FEATURE_COMING_SOON_SPONSORING",
  },
  billing: {
    icon: "receipt_long",
    title: "Facturation — Bientôt disponible",
    description: "Consultez votre historique de paiements, téléchargez vos factures et suivez vos dépenses sur MARKET-UP. Module en développement final.",
    stubKey: "FEATURE_COMING_SOON_BILLING",
  },
};

interface FeatureComingSoonPageProps {
  kind: FeatureKind;
}

export function FeatureComingSoonPage({ kind }: FeatureComingSoonPageProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const config = KIND_CONFIG[kind];

  return (
    <div className="max-w-[640px] mx-auto py-8">
      <div className="card p-6 md:p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-xl bg-primary-light flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
            {config.icon}
          </span>
        </div>

        {/* Title */}
        <h2 className="font-heading font-bold text-[22px] text-ink-primary mb-3">
          {config.title}
        </h2>

        {/* Description */}
        <p className="text-[14px] text-ink-secondary leading-relaxed max-w-md mx-auto mb-6">
          {config.description}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => toast(config.stubKey)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications_active</span>
            Être informé du lancement
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-ink-secondary hover:text-ink-primary hover:bg-surface-muted rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { ProfileKind } from "@/types";

const KIND_CONFIG: Record<ProfileKind, { icon: string; title: string; description: string; cta: string }> = {
  brandup: {
    icon: "storefront",
    title: "Créer votre profil BrandUP",
    description: "Votre vitrine institutionnelle : identité, secteur, coordonnées, galerie. Créez votre profil pour apparaître dans le moteur BrandUP.",
    cta: "Créer mon profil BrandUP",
  },
  traceup: {
    icon: "play_circle",
    title: "Créer votre profil TraceUP",
    description: "Votre chaîne média : actualités, offres, astuces, emplois — vidéos YouTube, Dailymotion et Vimeo intégrées.",
    cta: "Créer mon profil TraceUP",
  },
  linkup: {
    icon: "qr_code_2",
    title: "Créer votre profil LinkUP",
    description: "Votre carte de contact numérique : QR code, liens réseaux sociaux, partage rapide.",
    cta: "Créer mon profil LinkUP",
  },
};

interface ProfileEmptyStateProps {
  kind: ProfileKind;
}

export function ProfileEmptyState({ kind }: ProfileEmptyStateProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const config = KIND_CONFIG[kind];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-xl bg-primary-light flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
          {config.icon}
        </span>
      </div>
      <h2 className="font-heading font-bold text-[20px] text-ink-primary mb-2">
        {config.title}
      </h2>
      <p className="text-[13px] text-ink-secondary max-w-[400px] leading-relaxed mb-6">
        {config.description}
      </p>
      <button
        type="button"
        onClick={() => toast("FEATURE_COMING_SOON_CREATE")}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        {config.cta}
      </button>
    </div>
  );
}

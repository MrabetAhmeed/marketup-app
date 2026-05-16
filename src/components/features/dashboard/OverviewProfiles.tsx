"use client";

import Link from "next/link";
import { StatusPill } from "@/components/shared/StatusPill";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import type { ProfileSummary, MeResponse } from "@/types/dashboard";
import type { ProfileKind, ProfileStatus } from "@/types";

// ---------------------------------------------------------------------------
// Profile card configuration
// ---------------------------------------------------------------------------

interface ProfileCardConfig {
  kind: ProfileKind;
  label: string;
  icon: string;
  editorHref: string;
  description: string;
}

const PROFILE_CONFIGS: ProfileCardConfig[] = [
  {
    kind: "brandup",
    label: "BrandUP",
    icon: "storefront",
    editorHref: "/dashboard/brandup",
    description: "Votre vitrine institutionnelle\u00A0: identité, secteur, coordonnées, galerie.",
  },
  {
    kind: "traceup",
    label: "TraceUP",
    icon: "play_circle",
    editorHref: "/dashboard/traceup",
    description: "Votre chaîne média\u00A0: actualités, offres, astuces, emplois — vidéos YouTube intégrées.",
  },
  {
    kind: "linkup",
    label: "LinkUP",
    icon: "qr_code_2",
    editorHref: "/dashboard/linkup",
    description: "Votre carte de contact numérique\u00A0: QR code, liens réseaux sociaux, partage rapide.",
  },
];

// ---------------------------------------------------------------------------
// Status-driven CTA logic
// ---------------------------------------------------------------------------

interface CtaButton {
  label: string;
  href: string;
  variant: "primary" | "danger" | "outline";
  icon?: string;
}

function getCtaButtons(
  config: ProfileCardConfig,
  profile: ProfileSummary | null,
): CtaButton[] {
  const status = profile?.status ?? "incomplete";

  switch (status) {
    case "incomplete":
      return [
        { label: "Commencer", href: config.editorHref, variant: "primary", icon: "add" },
      ];
    case "pending":
      if (profile?.hasPendingData) {
        // Submitted, waiting for admin
        return [];
      }
      // First submission incomplete
      return [
        { label: "Continuer l'édition", href: config.editorHref, variant: "primary", icon: "edit" },
      ];
    case "rejected":
      return [
        { label: "Corriger", href: config.editorHref, variant: "danger", icon: "error" },
      ];
    case "active":
      if (profile?.boosted) {
        return [
          { label: "Modifier", href: config.editorHref, variant: "outline" },
          { label: "Renouveler", href: "/dashboard/boost", variant: "primary", icon: "bolt" },
        ];
      }
      return [
        { label: "Modifier", href: config.editorHref, variant: "outline" },
      ];
    case "disabled":
      return [
        { label: "Réactiver", href: config.editorHref, variant: "primary" },
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Status description suffix (mockup contextual text)
// ---------------------------------------------------------------------------

function getStatusSuffix(profile: ProfileSummary | null): JSX.Element | null {
  const status = profile?.status ?? "incomplete";

  switch (status) {
    case "rejected":
      return <strong className="text-[#B91C1C]">Motif de refus à consulter</strong>;
    case "pending":
      if (!profile?.hasPendingData) {
        return <strong className="text-[#475569]">Modifications non soumises</strong>;
      }
      return <strong className="text-[#475569]">En cours de validation</strong>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// CTA button renderer
// ---------------------------------------------------------------------------

const CTA_VARIANTS = {
  primary:
    "text-white bg-primary hover:bg-primary-hover",
  danger:
    "text-white bg-[#B91C1C] hover:bg-[#991B1B]",
  outline:
    "text-ink-primary bg-white border border-surface-border hover:bg-surface-muted",
} as const;

function CtaLink({ cta }: { cta: CtaButton }): JSX.Element {
  return (
    <Link
      href={cta.href}
      className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded text-center transition-colors flex items-center justify-center gap-1 ${CTA_VARIANTS[cta.variant]}`}
    >
      {cta.icon && (
        <span
          className={`material-symbols-outlined ${cta.icon === "bolt" ? "icon-fill" : ""}`}
          style={{ fontSize: 14 }}
        >
          {cta.icon}
        </span>
      )}
      {cta.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Single profile card
// ---------------------------------------------------------------------------

function ProfileCard({
  config,
  profile,
}: {
  config: ProfileCardConfig;
  profile: ProfileSummary | null;
}): JSX.Element {
  const toast = useFeatureSoonToast();
  const status = profile?.status ?? "incomplete";
  const isActive = status === "active";
  const switchDisabled = !isActive;
  const switchChecked = isActive && (profile?.isPublic ?? false);

  const ctas = getCtaButtons(config, profile);
  const suffix = getStatusSuffix(profile);

  // Map status to StatusPill kind
  // MOCKUP_FIX: dashboard_index.html (profile cards section, ~line 700)
  // The TraceUP "En attente" pill uses gray-blue in profile cards but
  // amber elsewhere in the same mockup (internal inconsistency). We
  // use the canonical amber pending pill consistently.
  const pillKind = status as ProfileStatus;

  return (
    <div className="card card--hover p-5 flex flex-col">
      {/* Header: icon + name + pill + switch */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
              {config.icon}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              {config.label}
            </h3>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <StatusPill kind={pillKind} />
              {profile?.boosted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary-light border border-[#C7DDF1] px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined icon-fill" style={{ fontSize: 11 }}>
                    bolt
                  </span>
                  Boosté
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Visibility switch */}
        <label className="relative inline-block w-9 h-5 shrink-0" aria-label={`Activer le profil ${config.label}`}>
          <input
            type="checkbox"
            className="sr-only peer"
            checked={switchChecked}
            disabled={switchDisabled}
            onChange={() => toast()}
          />
          <span className="absolute inset-0 cursor-pointer rounded-[10px] bg-[#C8C6C4] transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
          <span className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-ink-secondary leading-relaxed mb-5 flex-1">
        {config.description}
        {suffix && <> {suffix}.</>}
      </p>

      {/* CTAs */}
      {ctas.length > 0 && (
        <div className="flex gap-2">
          {ctas.map((cta) => (
            <CtaLink key={cta.label} cta={cta} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface OverviewProfilesProps {
  me: MeResponse;
}

export function OverviewProfiles({ me }: OverviewProfilesProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PROFILE_CONFIGS.map((config) => (
        <ProfileCard
          key={config.kind}
          config={config}
          profile={me.profiles[config.kind]}
        />
      ))}
    </div>
  );
}

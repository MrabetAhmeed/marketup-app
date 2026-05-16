import Link from "next/link";
import type { ProfileSummary, MeResponse } from "@/types/dashboard";
import type { ProfileKind } from "@/types";

// ---------------------------------------------------------------------------
// Stat card configuration per profile kind
// ---------------------------------------------------------------------------

interface StatCardConfig {
  label: string;
  icon: string;
  href: string;
  kind: ProfileKind;
}

const PROFILE_CARDS: StatCardConfig[] = [
  { label: "BrandUP", icon: "storefront", href: "/dashboard/brandup", kind: "brandup" },
  // MOCKUP_FIX (P3-R12): dashboard_index.html line 594 links TraceUP stat card to
  // dashboard_sponsoring.html (copy-paste bug). Fixed to /dashboard/traceup.
  { label: "TraceUP", icon: "play_circle", href: "/dashboard/traceup", kind: "traceup" },
  { label: "LinkUP", icon: "qr_code_2", href: "/dashboard/linkup", kind: "linkup" },
];

// Status labels for the status badge in stat cards
const STATUS_BADGE: Record<string, { label: string; dotColor: string; textColor: string }> = {
  rejected: { label: "Refusé", dotColor: "bg-[#DC2626]", textColor: "text-[#B91C1C]" },
  pending: { label: "En attente", dotColor: "bg-[#D97706]", textColor: "text-[#92400E]" },
  disabled: { label: "Désactivé", dotColor: "bg-[#8A8886]", textColor: "text-[#616161]" },
  incomplete: { label: "Incomplet", dotColor: "bg-[#64748B]", textColor: "text-[#475569]" },
};

// Sub-label for inactive profiles
const STATUS_SUBLABEL: Record<string, string> = {
  rejected: "Profil invisible",
  pending: "Validation en cours",
  disabled: "Profil désactivé",
  incomplete: "Profil non complété",
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TotalViewsCard({ stats }: { stats: MeResponse["stats"] }): JSX.Element {
  return (
    <div className="card card--hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
            visibility
          </span>
        </div>
        {stats.views30d > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-status-active-fg">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
            +{stats.views30d}
          </span>
        )}
      </div>
      <div className="text-[11px] text-ink-secondary font-medium uppercase tracking-wider mb-1">
        Vues totales
      </div>
      <div className="font-heading font-bold text-ink-primary text-[26px] leading-none">
        {stats.viewsTotal}
      </div>
      <div className="text-[11px] text-ink-secondary mt-1">Tout les profils · ce mois</div>
    </div>
  );
}

function ProfileStatCard({
  config,
  profile,
}: {
  config: StatCardConfig;
  profile: ProfileSummary | null;
}): JSX.Element {
  const status = profile?.status ?? "incomplete";
  const isActive = status === "active";
  const badge = !isActive ? STATUS_BADGE[status] : null;

  return (
    <Link href={config.href} className="card card--hover p-5 block">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isActive ? "bg-primary-light" : "bg-surface-muted"
          }`}
        >
          <span
            className={`material-symbols-outlined ${isActive ? "text-primary" : "text-ink-secondary"}`}
            style={{ fontSize: 20 }}
          >
            {config.icon}
          </span>
        </div>
        {isActive && profile && profile.stats.views30d > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-status-active-fg">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
            +{profile.stats.views30d}
          </span>
        ) : badge ? (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${badge.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="text-[11px] text-ink-secondary font-medium uppercase tracking-wider mb-1">
        {config.label}
      </div>
      {isActive && profile ? (
        <>
          <div className="font-heading font-bold text-ink-primary text-[26px] leading-none">
            {profile.stats.viewsTotal}
          </div>
          {profile.boosted && (
            <div className="text-[11px] text-primary font-semibold mt-1">
              <span className="material-symbols-outlined icon-fill align-middle" style={{ fontSize: 11 }}>
                bolt
              </span>{" "}
              Boost en cours
            </div>
          )}
          {!profile.boosted && (
            <div className="text-[11px] text-ink-secondary mt-1">Ce mois</div>
          )}
        </>
      ) : (
        <>
          <div className="font-heading font-bold text-ink-tertiary text-[26px] leading-none">—</div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            {STATUS_SUBLABEL[status] ?? "Profil invisible"}
          </div>
        </>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface OverviewStatsProps {
  me: MeResponse;
}

export function OverviewStats({ me }: OverviewStatsProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <TotalViewsCard stats={me.stats} />
      {PROFILE_CARDS.map((config) => (
        <ProfileStatCard
          key={config.kind}
          config={config}
          profile={me.profiles[config.kind]}
        />
      ))}
    </div>
  );
}

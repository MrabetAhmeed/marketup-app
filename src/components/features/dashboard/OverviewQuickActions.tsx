import Link from "next/link";

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  iconFill?: boolean;
  href: string;
  external?: boolean;
  /** Override icon bg/fg for non-primary accent (e.g. RSE gold) */
  accentBg?: string;
  accentFg?: string;
  accentHoverBg?: string;
}

interface OverviewQuickActionsProps {
  companySlug: string;
}

function getActions(companySlug: string): QuickAction[] {
  return [
    {
      label: "Modifier le logo",
      description: "Mettre à jour l'identité visuelle",
      icon: "image",
      href: "/dashboard/account",
    },
    {
      label: "Booster un profil",
      description: "Mettre en avant 30 jours",
      icon: "bolt",
      iconFill: true,
      href: "/dashboard/boost",
    },
    {
      label: "Soumettre un reçu RSE",
      description: "Ajouter un don attesté",
      icon: "volunteer_activism",
      href: "/dashboard/rse",
      accentBg: "bg-[#FEFCE8] border border-[#E8C96A]/40",
      accentFg: "text-[#C5A059]",
      accentHoverBg: "group-hover:bg-[#C5A059]",
    },
    {
      label: "Partager mon profil",
      description: "Voir la carte publique LinkUP",
      icon: "share",
      href: `/linkup/${companySlug}`,
      external: true,
    },
  ];
}

export function OverviewQuickActions({ companySlug }: OverviewQuickActionsProps): JSX.Element {
  const actions = getActions(companySlug);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {actions.map((action) => {
        const isGold = !!action.accentBg;
        const iconBgBase = isGold ? action.accentBg : "bg-primary-light";
        const iconFgBase = isGold ? action.accentFg : "text-primary";
        const iconHoverBg = isGold
          ? action.accentHoverBg
          : "group-hover:bg-primary";

        const content = (
          <>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${iconBgBase} ${iconHoverBg}`}
            >
              <span
                className={`material-symbols-outlined ${iconFgBase} group-hover:text-white transition-colors ${action.iconFill ? "icon-fill" : ""}`}
                style={{ fontSize: 20 }}
              >
                {action.icon}
              </span>
            </div>
            <div className="font-heading font-semibold text-[13px] text-ink-primary leading-tight mt-1 flex items-center gap-1">
              {action.label}
              {action.external && (
                <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 12 }}>
                  open_in_new
                </span>
              )}
            </div>
            <div className="text-[11px] text-ink-tertiary leading-snug">
              {action.description}
            </div>
          </>
        );

        if (action.external) {
          return (
            <a
              key={action.label}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card card--hover p-4 flex flex-col gap-2 group"
            >
              {content}
            </a>
          );
        }

        return (
          <Link
            key={action.label}
            href={action.href}
            className="card card--hover p-4 flex flex-col gap-2 group"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

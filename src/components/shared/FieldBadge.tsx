type FieldBadgeKind = "locked" | "validation" | "live" | "verified";

const KIND_CONFIG: Record<FieldBadgeKind, { classes: string; icon: string; defaultLabel: string }> = {
  locked: {
    classes: "text-ink-secondary bg-surface-muted border border-surface-border",
    icon: "lock",
    defaultLabel: "Inscription",
  },
  validation: {
    classes: "text-status-pending-fg bg-[#FFFBEB] border border-[#FDE68A]",
    icon: "gavel",
    defaultLabel: "Validation admin si modifié",
  },
  live: {
    classes: "text-status-active-fg bg-status-active-bg border border-status-active-border",
    icon: "bolt",
    defaultLabel: "Mise à jour instantanée",
  },
  verified: {
    classes: "text-status-active-fg bg-status-active-bg border border-status-active-border",
    icon: "verified",
    defaultLabel: "Vérifié",
  },
};

interface FieldBadgeProps {
  kind: FieldBadgeKind;
  label?: string;
}

export function FieldBadge({ kind, label }: FieldBadgeProps): JSX.Element {
  const config = KIND_CONFIG[kind];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-[7px] py-0.5 rounded tracking-[0.02em] ${config.classes}`}
    >
      <span
        className={`material-symbols-outlined ${kind === "verified" ? "icon-fill" : ""}`}
        style={{ fontSize: 12 }}
      >
        {config.icon}
      </span>
      {displayLabel}
    </span>
  );
}

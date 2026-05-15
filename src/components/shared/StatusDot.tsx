import type { ProfileStatus } from "@/types";

type DotStatus = ProfileStatus | null;

const STATUS_TO_CLASSES: Record<ProfileStatus, string> = {
  active: "bg-status-active-dot",
  pending: "bg-status-pending-dot",
  rejected: "bg-status-rejected-dot",
  disabled: "bg-status-disabled-dot",
  incomplete: "bg-status-draft-dot",
};

const STATUS_TO_TITLE: Record<ProfileStatus, string> = {
  active: "Actif",
  pending: "En attente",
  rejected: "Refusé",
  disabled: "Désactivé",
  incomplete: "Incomplet",
};

interface StatusDotProps {
  status: DotStatus;
}

export function StatusDot({ status }: StatusDotProps): JSX.Element | null {
  if (status == null) return null;

  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_TO_CLASSES[status]}`}
      title={STATUS_TO_TITLE[status]}
      aria-label={STATUS_TO_TITLE[status]}
    />
  );
}

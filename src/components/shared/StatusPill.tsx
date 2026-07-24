import type { ReactNode } from "react";

type StatusPillKind = "active" | "pending" | "rejected" | "disabled" | "incomplete" | "gold" | "suspended";

// Full static class strings so Tailwind JIT can detect them.
// "incomplete" maps to the "draft" color tokens (gray-blue family).
const KIND_TO_CLASSES: Record<StatusPillKind, string> = {
  active: "bg-status-active-bg text-status-active-fg border-status-active-border",
  pending: "bg-status-pending-bg text-status-pending-fg border-status-pending-border",
  rejected: "bg-status-rejected-bg text-status-rejected-fg border-status-rejected-border",
  disabled: "bg-status-disabled-bg text-status-disabled-fg border-status-disabled-border",
  incomplete: "bg-status-draft-bg text-status-draft-fg border-status-draft-border",
  gold: "bg-status-gold-bg text-status-gold-fg border-status-gold-border",
  suspended: "bg-[#F5F5F5] text-[#616161] border-[#E0E0E0]",
};

const KIND_TO_DOT: Record<StatusPillKind, string> = {
  active: "bg-status-active-dot",
  pending: "bg-status-pending-dot",
  rejected: "bg-status-rejected-dot",
  disabled: "bg-status-disabled-dot",
  incomplete: "bg-status-draft-dot",
  gold: "bg-status-gold-dot",
  suspended: "bg-[#616161]",
};

const KIND_TO_LABEL: Record<StatusPillKind, string> = {
  active: "Actif",
  pending: "En attente",
  rejected: "Refusé",
  disabled: "Désactivé",
  incomplete: "Incomplet",
  gold: "Attesté",
  suspended: "Désactivé",
};

interface StatusPillProps {
  kind: StatusPillKind;
  children?: ReactNode;
}

export function StatusPill({ kind, children }: StatusPillProps): JSX.Element {
  const label = children ?? KIND_TO_LABEL[kind];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded ${KIND_TO_CLASSES[kind]}`}
      role="status"
      aria-label={`Statut : ${KIND_TO_LABEL[kind]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${KIND_TO_DOT[kind]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

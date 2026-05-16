interface LangChipProps {
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onChange?: (checked: boolean) => void;
}

export function LangChip({
  label,
  checked,
  disabled = false,
  comingSoon = false,
  onChange,
}: LangChipProps): JSX.Element {
  const baseClasses = "inline-flex items-center gap-2 px-3.5 py-2 border rounded text-[13px] font-medium select-none transition-all";

  const stateClasses = disabled
    ? "bg-surface-muted text-ink-tertiary border-surface-border cursor-not-allowed"
    : checked
      ? "bg-primary-light border-primary text-primary cursor-pointer"
      : "bg-white border-surface-border text-ink-primary cursor-pointer hover:border-primary";

  return (
    <label className={`${baseClasses} ${stateClasses}`}>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span
        className={`material-symbols-outlined ${checked ? "icon-fill" : ""}`}
        style={{ fontSize: 18 }}
      >
        {checked ? "check_circle" : "add_circle"}
      </span>
      {label}
      {comingSoon && (
        <span className="text-[10.5px] font-semibold uppercase text-ink-tertiary bg-white px-1.5 py-0.5 rounded-[3px] border border-surface-border tracking-wide">
          Bientôt
        </span>
      )}
    </label>
  );
}

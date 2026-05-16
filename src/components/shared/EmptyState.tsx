import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  headline: string;
  helper?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({ icon, headline, helper, ctaLabel, ctaHref }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-lg bg-surface-muted flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>
          {icon}
        </span>
      </div>
      <h3 className="font-heading font-semibold text-[15px] text-ink-primary mb-1">
        {headline}
      </h3>
      {helper && (
        <p className="text-[12px] text-ink-secondary max-w-[280px]">{helper}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-4 px-4 py-2 text-[12.5px] font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps): JSX.Element {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-heading font-semibold text-[14px] text-ink-primary uppercase tracking-wider">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12px] text-ink-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";

interface LogoUploadZoneProps {
  initials: string;
  logoUrl: string | null;
}

export function LogoUploadZone({ initials, logoUrl }: LogoUploadZoneProps): JSX.Element {
  const toast = useFeatureSoonToast();

  return (
    <div className="flex items-center gap-[18px] p-4 bg-surface-muted border border-dashed border-[#D1D1D1] rounded-lg hover:border-primary hover:bg-primary-light transition-colors">
      {/* Logo preview */}
      <div className="w-[88px] h-[88px] rounded-lg bg-white border border-surface-border flex items-center justify-center shrink-0 overflow-hidden">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="font-heading font-bold text-[28px] text-primary">
            {initials}
          </span>
        )}
      </div>
      {/* Actions */}
      <div className="min-w-0 flex-1">
        <div className="font-heading font-semibold text-[13.5px] text-ink-primary mb-1">
          Changer le logo
        </div>
        <div className="text-[12px] text-ink-secondary leading-snug mb-3">
          Glissez une image ici ou cliquez pour en sélectionner une · JPG/PNG · 5 Mo max · minimum 400 × 400 px
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => toast()}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted hover:border-ink-tertiary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
            Parcourir
          </button>
          <button
            type="button"
            onClick={() => toast()}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-transparent hover:bg-[#FEF2F2] rounded transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            Retirer
          </button>
        </div>
      </div>
    </div>
  );
}

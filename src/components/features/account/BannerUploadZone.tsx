"use client";

import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";

interface BannerUploadZoneProps {
  bannerUrl: string | null;
}

export function BannerUploadZone({ bannerUrl }: BannerUploadZoneProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const hasImage = !!bannerUrl;

  return (
    <div>
      <div
        className={`relative w-full aspect-[4/1] max-h-[180px] rounded-lg overflow-hidden transition-colors ${
          hasImage
            ? "border border-solid border-surface-border"
            : "border border-dashed border-[#D1D1D1] hover:border-primary"
        }`}
        style={hasImage ? { background: `#F5F5F5 center / cover no-repeat url(${bannerUrl})` } : { background: "#F5F5F5" }}
      >
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-tertiary text-[12px]">
            <span className="material-symbols-outlined text-[#D1D1D1]" style={{ fontSize: 28 }}>
              panorama
            </span>
            <span>Cliquez ou glissez une bannière</span>
          </div>
        )}
        {hasImage && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => toast()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
              Remplacer
            </button>
            <button
              type="button"
              onClick={() => toast()}
              className="inline-flex items-center px-3 py-1.5 text-[12px] font-semibold text-[#B91C1C] bg-transparent hover:bg-[#FEF2F2] rounded transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-ink-tertiary mt-1">
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
        Affichée en haut de votre profil BrandUP · format paysage 4:1 (ex : 1200×300) · JPG/PNG · 5 Mo max
      </div>
    </div>
  );
}

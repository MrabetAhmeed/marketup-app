"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";

interface BannerUploadZoneProps {
  bannerUrl: string | null;
}

export function BannerUploadZone({ bannerUrl }: BannerUploadZoneProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(bannerUrl);

  const hasImage = !!previewUrl;

  async function handleFileChange(file: File | undefined): Promise<void> {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/me/account/banner", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors de l'upload");
        return;
      }
      setPreviewUrl(json.url);
      showToast("Bannière mise à jour");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative w-full aspect-[4/1] max-h-[180px] rounded-lg overflow-hidden transition-colors cursor-pointer ${
          hasImage
            ? "border border-solid border-surface-border"
            : "border border-dashed border-[#D1D1D1] hover:border-primary"
        }`}
        style={hasImage ? { background: `#F5F5F5 center / cover no-repeat url(${previewUrl})` } : { background: "#F5F5F5" }}
      >
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-tertiary text-[12px]">
            {uploading ? (
              <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 28 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[#D1D1D1]" style={{ fontSize: 28 }}>panorama</span>
            )}
            <span>{uploading ? "Upload en cours…" : "Cliquez ou glissez une bannière"}</span>
          </div>
        )}
        {hasImage && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload</span>
              )}
              {uploading ? "Upload…" : "Remplacer"}
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

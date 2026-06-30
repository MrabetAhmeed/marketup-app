"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";

interface LogoUploadZoneProps {
  initials: string;
  logoUrl: string | null;
  pendingLogoUrl?: string | null;
}

export function LogoUploadZone({ initials, logoUrl, pendingLogoUrl }: LogoUploadZoneProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(logoUrl);

  async function handleFileChange(file: File | undefined): Promise<void> {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/me/account/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors de l'upload");
        return;
      }
      setPreviewUrl(json.url);
      showToast("Logo soumis · en attente de validation admin");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
    <div className="flex items-center gap-[18px] p-4 bg-surface-muted border border-dashed border-[#D1D1D1] rounded-lg hover:border-primary hover:bg-primary-light transition-colors">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />
      {/* Logo preview */}
      <div className="w-[88px] h-[88px] rounded-lg bg-white border border-surface-border flex items-center justify-center shrink-0 overflow-hidden">
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={previewUrl} alt="Logo" className="w-full h-full object-cover" />
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
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted hover:border-ink-tertiary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
            )}
            {uploading ? "Upload…" : "Parcourir"}
          </button>
        </div>
      </div>
    </div>
    {pendingLogoUrl && (
      <div className="mt-1.5 px-3 py-2 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[12px] text-[#92400E] flex items-start gap-2">
        <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>schedule</span>
        <span>Nouveau logo en attente de validation admin</span>
      </div>
    )}
    </>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Platform = "youtube" | "dailymotion" | "vimeo";
type VideoCategory = "actualite" | "offres" | "astuces" | "emplois";

const PLATFORMS: { id: Platform; label: string; color: string; icon: string }[] = [
  { id: "youtube", label: "YouTube", color: "#FF0000", icon: "smart_display" },
  { id: "dailymotion", label: "Dailymotion", color: "#0066DC", icon: "play_circle" },
  { id: "vimeo", label: "Vimeo", color: "#1AB7EA", icon: "movie" },
];

const CATEGORIES: { id: VideoCategory; label: string }[] = [
  { id: "actualite", label: "Actualité" },
  { id: "offres", label: "Offres" },
  { id: "astuces", label: "Astuces" },
  { id: "emplois", label: "Emplois" },
];

const URL_PATTERNS: Record<Platform, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  dailymotion: [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/,
  ],
  vimeo: [
    /vimeo\.com\/(\d+)/,
  ],
};

const URL_HELP: Record<Platform, string> = {
  youtube: "Ex : https://youtube.com/watch?v=... ou https://youtu.be/...",
  dailymotion: "Ex : https://dailymotion.com/video/... ou https://dai.ly/...",
  vimeo: "Ex : https://vimeo.com/123456789",
};

const URL_ERROR_EXAMPLES: Record<Platform, string> = {
  youtube: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  dailymotion: "https://www.dailymotion.com/video/x7tgad0",
  vimeo: "https://vimeo.com/76979871",
};

interface AddVideoModalProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
  defaultCategory?: VideoCategory;
}

export function AddVideoModal({ open, onClose, profileId, defaultCategory = "actualite" }: AddVideoModalProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [platform, setPlatform] = useState<Platform | null>(null);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<VideoCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const urlValid = platform ? URL_PATTERNS[platform].some((re) => re.test(url)) : false;
  const canSubmit = platform && urlValid && title.trim().length > 0 && !submitting;

  const handleClose = useCallback(() => {
    setPlatform(null);
    setUrl("");
    setCategory(defaultCategory);
    setTitle("");
    setDescription("");
    setUrlError(null);
    onClose();
  }, [onClose, defaultCategory]);

  async function handleSubmit(): Promise<void> {
    if (!platform || !urlValid) return;
    setSubmitting(true);
    setUrlError(null);
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url, title: title.trim(), description: description.trim(), category }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === "VALIDATION_FAILED") {
          const fields = json.error.fields as Record<string, string[]> | undefined;
          if (fields?.url) {
            setUrlError(fields.url[0] ?? "URL invalide.");
            return;
          }
          showToast(json.error.message || "Erreur de validation");
          return;
        }
        showToast(json.error?.message || "Erreur, veuillez réessayer");
        return;
      }
      showToast("Vidéo ajoutée");
      handleClose();
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>add</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Ajouter une vidéo
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">
              Collez le lien d&apos;une vidéo publique
            </p>
          </div>
          <button type="button" onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0" aria-label="Fermer">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Platform select */}
          <div>
            <label className="field-label">Plateforme <span className="text-[#B91C1C] font-bold ml-0.5">*</span></label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPlatform(p.id); setUrl(""); }}
                  className={`flex-1 py-2.5 px-3 rounded border text-center transition-colors ${
                    platform === p.id
                      ? "border-primary bg-primary-light"
                      : "border-surface-border bg-white hover:border-ink-tertiary"
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: platform === p.id ? p.color : "#8A8886" }}>
                    {p.icon}
                  </span>
                  <div className={`text-[11px] font-semibold mt-0.5 ${platform === p.id ? "text-primary" : "text-ink-secondary"}`}>
                    {p.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          <div>
            <label htmlFor="vid-url" className="field-label">URL vidéo <span className="text-[#B91C1C] font-bold ml-0.5">*</span></label>
            <input
              id="vid-url"
              type="url"
              disabled={!platform}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={platform ? "Collez l'URL ici" : "Sélectionnez d'abord une plateforme"}
              className="field-input"
            />
            {platform && url.length === 0 && (
              <div className="field-help">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                {URL_HELP[platform]}
              </div>
            )}
            {platform && url.length > 0 && urlValid && (
              <div className="field-help text-status-active-fg">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                URL valide
              </div>
            )}
            {platform && url.length > 0 && !urlValid && (
              <div className="field-help text-[#DC2626]">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>error</span>
                URL non reconnue. Exemple : {URL_ERROR_EXAMPLES[platform]}
              </div>
            )}
            {urlError && (
              <p className="text-[12px] text-[#B91C1C] mt-1">{urlError}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="vid-category" className="field-label">Catégorie <span className="text-[#B91C1C] font-bold ml-0.5">*</span></label>
            <select
              id="vid-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as VideoCategory)}
              className="field-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="vid-title" className="field-label">Titre <span className="text-[#B91C1C] font-bold ml-0.5">*</span></label>
            <input
              id="vid-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la vidéo"
              className="field-input"
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              <span className="font-semibold text-ink-secondary">{title.length}/120</span> caractères
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="vid-desc" className="field-label">
              Description <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
            </label>
            <textarea
              id="vid-desc"
              rows={3}
              maxLength={280}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description de la vidéo"
              className="field-input resize-y min-h-[72px]"
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              <span className="font-semibold text-ink-secondary">{description.length}/280</span> caractères
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 flex-wrap rounded-b-xl">
          <button type="button" onClick={handleClose} className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
            Annuler
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            )}
            {submitting ? "Ajout en cours…" : "Ajouter la vidéo"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

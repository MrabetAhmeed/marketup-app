"use client";

import { useState, useCallback } from "react";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AddGalleryImageModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddGalleryImageModal({ open, onClose }: AddGalleryImageModalProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const [title, setTitle] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");

  const canSubmit = fileSelected && title.trim().length > 0;

  const handleClose = useCallback(() => {
    setTitle("");
    setFileSelected(false);
    setFileName("");
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    toast("FEATURE_COMING_SOON_GALLERY_UPLOAD");
    handleClose();
  }, [toast, handleClose]);

  const handleFilePick = useCallback(() => {
    // Stub: simulate file selection
    toast("FEATURE_COMING_SOON_GALLERY_UPLOAD");
    setFileSelected(true);
    setFileName("image-selectionnee.jpg");
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>add_photo_alternate</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Ajouter une image
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">
              JPG ou PNG · 5 Mo max · min 800 × 600 px
            </p>
          </div>
          <button type="button" onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0" aria-label="Fermer">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* File picker zone */}
          <div>
            <label className="field-label">Image <span className="text-[#B91C1C] font-bold ml-0.5">*</span></label>
            <button
              type="button"
              onClick={handleFilePick}
              className="w-full py-6 border-2 border-dashed border-[#C8C6C4] hover:border-primary hover:bg-primary-light/30 rounded-lg transition-colors flex flex-col items-center gap-2 text-ink-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                {fileSelected ? "check_circle" : "cloud_upload"}
              </span>
              {fileSelected ? (
                <span className="text-[13px] font-semibold text-status-active-fg">{fileName}</span>
              ) : (
                <>
                  <span className="text-[13px] font-semibold">Choisir une image</span>
                  <span className="text-[11px] text-ink-tertiary">ou glissez-déposez ici</span>
                </>
              )}
            </button>
          </div>

          {/* Title input */}
          <div>
            <label htmlFor="gal-title" className="field-label">
              Titre de l&apos;image <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="gal-title"
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Atelier d'usinage Sousse"
              className="field-input"
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              <span className="font-semibold text-ink-secondary">{title.length}/80</span> caractères
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
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_photo_alternate</span>
            Ajouter l&apos;image
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

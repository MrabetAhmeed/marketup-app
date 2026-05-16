"use client";

import { useCallback } from "react";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryDeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  caption: string;
}

export function GalleryDeleteConfirm({ open, onClose, caption }: GalleryDeleteConfirmProps): JSX.Element {
  const toast = useFeatureSoonToast();

  const handleDelete = useCallback(() => {
    toast("FEATURE_COMING_SOON_GALLERY_DELETE");
    onClose();
  }, [toast, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>delete</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">
              Supprimer cette image ?
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5">
              Cette action ne peut pas être annulée
            </p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-ink-secondary leading-relaxed">
            L&apos;image «&nbsp;{caption || "Sans titre"}&nbsp;» sera retirée de votre galerie.
          </p>
        </div>
        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
            Annuler
          </button>
          <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            Supprimer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

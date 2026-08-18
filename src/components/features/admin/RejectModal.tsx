"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
  title?: string;
  subtitle?: string;
  minLength?: number;
}

export function RejectModal({ open, onClose, onConfirm, submitting, title, subtitle, minLength = 1 }: RejectModalProps): JSX.Element {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= minLength && reason.length <= 500 && !submitting;

  function handleClose(): void {
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>block</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">{title ?? "Refuser ce profil"}</h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5">{subtitle ?? "Le propriétaire recevra un email avec le motif"}</p>
          </div>
        </div>
        <div className="p-5">
          <label htmlFor="reject-reason" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-ink-secondary mb-1.5">
            Motif du refus <span className="text-[#B91C1C]">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Décrivez les points à corriger..."
            className="field-input resize-y min-h-[96px]"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-ink-tertiary">
            <span>Le motif sera envoyé par email au propriétaire</span>
            <span className="font-semibold">{reason.length}/500</span>
          </div>
        </div>
        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
          <button type="button" onClick={handleClose} className="px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors">
            Annuler
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(reason.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
            )}
            {submitting ? "Refus en cours…" : "Confirmer le refus"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

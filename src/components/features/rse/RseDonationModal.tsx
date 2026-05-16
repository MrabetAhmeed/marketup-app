"use client";

import { useState, useCallback } from "react";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AssociationOption {
  id: string;
  name: string;
}

interface RseDonationModalProps {
  open: boolean;
  onClose: () => void;
  associations: AssociationOption[];
}

export function RseDonationModal({ open, onClose, associations }: RseDonationModalProps): JSX.Element {
  const toast = useFeatureSoonToast();

  const [associationId, setAssociationId] = useState("");
  const [amount, setAmount] = useState("");
  const [donationDate, setDonationDate] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = associationId.length > 0 && Number(amount) >= 50 && donationDate.length > 0 && fileSelected;

  const handleClose = useCallback(() => {
    setAssociationId("");
    setAmount("");
    setDonationDate("");
    setFileSelected(false);
    setFileName("");
    setNotes("");
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    toast("FEATURE_COMING_SOON_RSE_DONATION");
    handleClose();
  }, [toast, handleClose]);

  // Max date = today
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#FEFCE8] border border-[#E8C96A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 22 }}>
              volunteer_activism
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Soumettre un reçu de don
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">
              Choisissez une association et renseignez les détails du don
            </p>
          </div>
          <button type="button" onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0" aria-label="Fermer">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Association */}
          <div>
            <label htmlFor="rse-assoc" className="field-label">
              Association <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <select
              id="rse-assoc"
              value={associationId}
              onChange={(e) => setAssociationId(e.target.value)}
              className="field-input"
            >
              <option value="">Sélectionner une association</option>
              {associations.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="rse-amount" className="field-label">
              Montant du don (DT) <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                payments
              </span>
              <input
                id="rse-amount"
                type="number"
                min={50}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Minimum 50 DT"
                className="field-input pl-9"
              />
            </div>
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              Montant minimum : 50 DT · hors champ TVA (associations exonérées)
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="rse-date" className="field-label">
              Date du don <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="rse-date"
              type="date"
              max={today}
              value={donationDate}
              onChange={(e) => setDonationDate(e.target.value)}
              className="field-input"
            />
          </div>

          {/* Receipt file */}
          <div>
            <label className="field-label">
              Reçu de don <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            {fileSelected ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-muted border border-surface-border rounded">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>description</span>
                <span className="flex-1 text-[13px] text-ink-primary truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={() => { setFileSelected(false); setFileName(""); }}
                  className="w-6 h-6 flex items-center justify-center rounded text-ink-tertiary hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                  aria-label="Retirer le fichier"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setFileSelected(true); setFileName("recu-don-2026.pdf"); }}
                className="w-full py-4 border-2 border-dashed border-[#C8C6C4] hover:border-primary hover:bg-primary-light/30 rounded-lg transition-colors flex flex-col items-center gap-1.5 text-ink-secondary hover:text-primary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>cloud_upload</span>
                <span className="text-[12px] font-semibold">Choisir un fichier</span>
              </button>
            )}
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              PDF, JPG ou PNG · 5 Mo max
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="rse-notes" className="field-label">
              Notes <span className="text-ink-tertiary font-normal normal-case tracking-normal ml-1">(optionnel)</span>
            </label>
            <textarea
              id="rse-notes"
              rows={3}
              maxLength={280}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Précisions sur le don (objet, contexte...)"
              className="field-input resize-y min-h-[72px]"
            />
            <div className="field-help">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
              <span className="font-semibold text-ink-secondary">{notes.length}/280</span> caractères
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
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#C5A059] hover:bg-[#8A6A1F] rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
            Soumettre le reçu
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

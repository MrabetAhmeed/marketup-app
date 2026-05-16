"use client";

import { useState, useCallback } from "react";
import { useFeatureSoonToast } from "@/hooks/useFeatureSoonToast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  accountEmail: string;
}

export function DeleteAccountModal({
  open,
  onClose,
  companyName,
  accountEmail,
}: DeleteAccountModalProps): JSX.Element {
  const toast = useFeatureSoonToast();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const canSubmit = confirmText.trim() === "SUPPRIMER" && password.length > 0;

  const handleSubmit = useCallback(() => {
    toast("FEATURE_COMING_SOON_DELETE");
    onClose();
  }, [toast, onClose]);

  const handleClose = useCallback(() => {
    setConfirmText("");
    setPassword("");
    setPasswordVisible(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-[500px] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>
              warning
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">
              Supprimer définitivement votre compte ?
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5 leading-snug">
              Cette action ne peut pas être annulée
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0 -mr-1 -mt-0.5"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning box */}
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded p-3.5">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined icon-fill text-[#DC2626] shrink-0 mt-[1px]" style={{ fontSize: 16 }}>
                info
              </span>
              <div className="text-[12.5px] text-[#991B1B] leading-snug">
                Votre compte <strong>{companyName}</strong> et l&apos;ensemble de vos données
                seront supprimés de nos serveurs dans les prochaines minutes.{" "}
                <strong>Aucune récupération ne sera possible.</strong>
              </div>
            </div>
          </div>

          {/* Confirm text input */}
          <div>
            <label htmlFor="del-confirm-text" className="field-label">
              Pour confirmer, tapez <strong className="text-[#DC2626] font-mono">SUPPRIMER</strong>{" "}
              ci-dessous <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <input
              id="del-confirm-text"
              type="text"
              autoComplete="off"
              placeholder="SUPPRIMER"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="field-input"
            />
          </div>

          {/* Password input */}
          <div>
            <label htmlFor="del-password" className="field-label">
              Mot de passe de votre compte <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-ink-tertiary pointer-events-none" style={{ fontSize: 16 }}>
                lock
              </span>
              <input
                id="del-password"
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-primary transition-colors"
                aria-label={passwordVisible ? "Masquer" : "Afficher"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {passwordVisible ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Email confirmation notice */}
          <div className="text-[11.5px] text-ink-secondary leading-snug flex items-start gap-2">
            <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 14 }}>mail</span>
            <span>
              Un email de confirmation vous sera envoyé à{" "}
              <strong className="text-[#424242]">{accountEmail}</strong>{" "}
              pour tracer l&apos;opération.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 flex-wrap rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
            Supprimer définitivement
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

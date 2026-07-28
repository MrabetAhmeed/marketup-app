"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { PendingSponsoringItem } from "@/services/sponsoring.service";

interface SponsoringValidationListProps {
  sponsorings: PendingSponsoringItem[];
}

const KIND_LABEL: Record<string, string> = {
  brandup: "BrandUP",
  traceup: "TraceUP",
  linkup: "LinkUP",
};

const KIND_COLOR: Record<string, string> = {
  brandup: "#0078D4",
  traceup: "#7C3AED",
  linkup: "#C5A059",
};

// ---------------------------------------------------------------------------
// ValidateSponsoringModal — simple confirmation (pattern ReactivateModal)
// ---------------------------------------------------------------------------

function ValidateSponsoringModal({
  open,
  onClose,
  companyName,
  profileKind,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  profileKind: string;
  onConfirm: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] border border-[#86EFAC] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#16A34A]" style={{ fontSize: 22 }}>check_circle</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Valider cette demande de sponsoring ?
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              {companyName} — {KIND_LABEL[profileKind] || profileKind}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0 -mr-1 -mt-0.5 disabled:opacity-60"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-5">
          <p className="text-[13px] text-ink-secondary leading-relaxed">
            La demande de campagne sponsorisée sera validée. L&apos;owner recevra une notification
            et pourra procéder au paiement pour lancer sa bannière.
          </p>
        </div>

        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                Validation...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Confirmer la validation
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// RejectSponsoringModal — textarea + reason required (pattern SuspendModal)
// ---------------------------------------------------------------------------

function RejectSponsoringModal({
  open,
  onClose,
  companyName,
  profileKind,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  profileKind: string;
  onConfirm: (reason: string) => void;
  loading: boolean;
}): JSX.Element {
  const [reason, setReason] = useState("");

  const handleClose = useCallback(() => {
    if (loading) return;
    setReason("");
    onClose();
  }, [onClose, loading]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>cancel</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">
              Refuser cette demande de sponsoring ?
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5 leading-snug">
              {companyName} — {KIND_LABEL[profileKind] || profileKind}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0 -mr-1 -mt-0.5 disabled:opacity-60"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded p-3.5">
            <div className="text-[12.5px] text-[#991B1B] leading-snug space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>cancel</span>
                La demande sera refusée et l&apos;owner notifié
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>refresh</span>
                L&apos;owner pourra soumettre une nouvelle demande
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="reject-reason" className="field-label">
              Motif du refus <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              placeholder="Décrivez le motif du refus..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className="field-input resize-y min-h-[80px]"
              maxLength={1000}
            />
            <div className="text-[11px] text-ink-tertiary mt-1">{reason.length}/1000</div>
          </div>
        </div>

        <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={reason.trim().length < 3 || loading}
            onClick={() => onConfirm(reason.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded transition-colors disabled:bg-[#E0E0E0] disabled:text-[#A8A8A8] disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                Refus...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                Confirmer le refus
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SponsoringValidationList
// ---------------------------------------------------------------------------

interface ValidateTarget { id: string; companyName: string; profileKind: string }
interface RejectTarget { id: string; companyName: string; profileKind: string }

export function SponsoringValidationList({ sponsorings }: SponsoringValidationListProps): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [validateTarget, setValidateTarget] = useState<ValidateTarget | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);

  async function handleValidateConfirm(): Promise<void> {
    if (!validateTarget) return;
    setLoading(true);
    try {
      await fetch(`/api/v1/admin/sponsorings/${validateTarget.id}/validate`, { method: "POST" });
      setValidateTarget(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRejectConfirm(reason: string): Promise<void> {
    if (!rejectTarget) return;
    setLoading(true);
    try {
      await fetch(`/api/v1/admin/sponsorings/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setRejectTarget(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (sponsorings.length === 0) {
    return (
      <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
          <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>campaign</span>
        </div>
        <h2 className="font-heading font-bold text-[16px] text-ink-primary mb-1">Aucun sponsoring en attente</h2>
        <p className="text-[13px] text-ink-secondary">Toutes les demandes ont été traitées.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sponsorings.map((s) => {
          const color = KIND_COLOR[s.profileKind] || "#0078D4";

          return (
            <div key={s.id} className="bg-white border border-surface-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>campaign</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{s.companyName}</div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${color}15`, color }}>
                      {KIND_LABEL[s.profileKind] || s.profileKind}
                    </span>
                    <span>Soumis le {new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              {/* Banner preview */}
              <div className="border border-surface-border rounded-lg overflow-hidden" style={{ maxWidth: 600 }}>
                <img
                  src={s.bannerUrl}
                  alt="Bannière sponsoring"
                  className="w-full h-auto"
                  style={{ aspectRatio: "6/1", objectFit: "cover" }}
                />
              </div>

              {/* Link */}
              <div className="text-[12px] text-ink-secondary">
                Lien :{" "}
                <a
                  href={s.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {s.linkUrl}
                </a>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setValidateTarget({ id: s.id, companyName: s.companyName, profileKind: s.profileKind })}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  Valider
                </button>
                <button
                  onClick={() => setRejectTarget({ id: s.id, companyName: s.companyName, profileKind: s.profileKind })}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                  Refuser
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ValidateSponsoringModal
        open={!!validateTarget}
        onClose={() => { if (!loading) setValidateTarget(null); }}
        companyName={validateTarget?.companyName || ""}
        profileKind={validateTarget?.profileKind || ""}
        onConfirm={handleValidateConfirm}
        loading={loading}
      />
      <RejectSponsoringModal
        open={!!rejectTarget}
        onClose={() => { if (!loading) setRejectTarget(null); }}
        companyName={rejectTarget?.companyName || ""}
        profileKind={rejectTarget?.profileKind || ""}
        onConfirm={handleRejectConfirm}
        loading={loading}
      />
    </>
  );
}

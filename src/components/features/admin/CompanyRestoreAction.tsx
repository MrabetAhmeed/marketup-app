"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CompanyRestoreActionProps {
  companyId: string;
  companyName: string;
}

export function CompanyRestoreAction({ companyId, companyName }: CompanyRestoreActionProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/companies/${companyId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json();
        showToast(j.error?.message || "Erreur lors de la restauration");
        return;
      }
      showToast("Compte restauré avec succès");
      setOpen(false);
      router.refresh();
    } catch {
      showToast("Erreur lors de la restauration");
    } finally {
      setLoading(false);
    }
  }, [companyId, router, showToast]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#16A34A] bg-white border border-[#86EFAC] rounded hover:bg-[#F0FDF4] transition-colors shrink-0"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restore</span>
        Restaurer
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) setOpen(v); }}>
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
          <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
            <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] border border-[#86EFAC] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#16A34A]" style={{ fontSize: 22 }}>restore</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
                Restaurer {companyName} ?
              </h3>
              <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
                Le compte et tous ses profils seront restaurés
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted transition-colors shrink-0 -mr-1 -mt-0.5 disabled:opacity-60"
              aria-label="Fermer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          <div className="p-5">
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              Le compte <strong>{companyName}</strong> sera restauré. L&apos;owner pourra se reconnecter
              et ses profils retrouveront leur état d&apos;avant la suppression. Un email de notification sera envoyé.
            </p>
          </div>

          <div className="px-5 py-4 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-2 rounded-b-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleRestore}
              className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                  Restauration...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restore</span>
                  Restaurer
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

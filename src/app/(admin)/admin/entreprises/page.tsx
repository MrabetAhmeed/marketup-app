"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import { StatusPill } from "@/components/shared/StatusPill";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  status: string;
  sector: string;
  ville: string;
  registeredAt: string;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
}

interface DeletedCompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  deletedAt: string;
  registeredAt: string;
}

type TabKey = "active" | "deleted";

// ---------------------------------------------------------------------------
// Suspend Modal
// ---------------------------------------------------------------------------

function SuspendModal({
  open,
  onClose,
  companyName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
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
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>block</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-[#991B1B] leading-tight">
              Désactiver {companyName} ?
            </h3>
            <p className="text-[12px] text-[#991B1B] mt-0.5 leading-snug">
              Cette action est réversible
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

        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded p-3.5">
            <div className="text-[12.5px] text-[#991B1B] leading-snug space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>visibility_off</span>
                Tous les profils publics seront masqués
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>logout</span>
                Le client sera déconnecté immédiatement
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>mail</span>
                Un email de notification sera envoyé
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="suspend-reason" className="field-label">
              Raison de la désactivation <span className="text-[#B91C1C] font-bold ml-0.5">*</span>
            </label>
            <textarea
              id="suspend-reason"
              rows={3}
              placeholder="Décrivez la raison de cette désactivation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className="field-input resize-y min-h-[80px]"
              maxLength={500}
            />
            <div className="text-[11px] text-ink-tertiary mt-1">{reason.length}/500</div>
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
                Désactivation...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
                Confirmer la désactivation
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Reactivate Modal
// ---------------------------------------------------------------------------

function ReactivateModal({
  open,
  onClose,
  companyName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  onConfirm: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] border border-[#86EFAC] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#16A34A]" style={{ fontSize: 22 }}>refresh</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Réactiver {companyName} ?
            </h3>
            <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
              Les profils publics seront de nouveau visibles
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
            Le compte <strong>{companyName}</strong> sera réactivé. Le client pourra se reconnecter
            et ses profils publics redeviendront visibles. Un email de notification sera envoyé.
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
                Réactivation...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                Réactiver
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EntreprisesPage(): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>("active");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<DeletedCompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedLoaded, setDeletedLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [suspendTarget, setSuspendTarget] = useState<CompanyItem | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<CompanyItem | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/companies")
      .then((r) => r.json())
      .then((data) => { setCompanies(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadDeleted = useCallback(() => {
    setDeletedLoading(true);
    fetch("/api/v1/admin/companies?deleted=true")
      .then((r) => r.json())
      .then((data) => {
        setDeletedCompanies(Array.isArray(data) ? data : []);
        setDeletedLoaded(true);
        setDeletedLoading(false);
      })
      .catch(() => {
        setDeletedLoaded(true);
        setDeletedLoading(false);
      });
  }, []);

  useEffect(() => {
    if (tab === "deleted" && !deletedLoaded && !deletedLoading) {
      loadDeleted();
    }
  }, [tab, deletedLoaded, deletedLoading, loadDeleted]);

  async function handleSuspendConfirm(reason: string): Promise<void> {
    if (!suspendTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/companies/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const j = await res.json(); showToast(j.error?.message || "Erreur"); return; }
      showToast("Compte désactivé");
      setCompanies((prev) => prev.map((c) =>
        c.id === suspendTarget.id
          ? { ...c, status: "suspended", suspendedReason: reason, suspendedAt: new Date().toISOString() }
          : c,
      ));
      setSuspendTarget(null);
      router.refresh();
    } catch { showToast("Erreur"); } finally { setActionLoading(false); }
  }

  async function handleReactivateConfirm(): Promise<void> {
    if (!reactivateTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/companies/${reactivateTarget.id}/reactivate`, {
        method: "POST",
      });
      if (!res.ok) { const j = await res.json(); showToast(j.error?.message || "Erreur"); return; }
      showToast("Compte réactivé");
      setCompanies((prev) => prev.map((c) =>
        c.id === reactivateTarget.id
          ? { ...c, status: "active", suspendedReason: null, suspendedAt: null }
          : c,
      ));
      setReactivateTarget(null);
      router.refresh();
    } catch { showToast("Erreur"); } finally { setActionLoading(false); }
  }

  const pillKind = (status: string) => {
    if (status === "active") return "active" as const;
    if (status === "suspended") return "suspended" as const;
    if (status === "deleted") return "deleted" as const;
    return "disabled" as const;
  };

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Entreprises</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Gestion des entreprises inscrites</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === "active" ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink-primary"}`}
        >
          Actives & Désactivées
          {companies.length > 0 && <span className="ml-1.5 text-[11px] text-ink-tertiary">({companies.length})</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("deleted")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === "deleted" ? "border-red-600 text-red-700" : "border-transparent text-ink-secondary hover:text-ink-primary"}`}
        >
          Supprimées
          {deletedCompanies.length > 0 && <span className="ml-1.5 text-[11px] text-red-500">({deletedCompanies.length})</span>}
        </button>
      </div>

      {/* Tab: Active/Suspended */}
      {tab === "active" && (loading ? (
        <div className="text-center py-16 text-ink-secondary">Chargement…</div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <p className="text-[13px] text-ink-secondary">Aucune entreprise trouvée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-surface-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.status === "active" ? "bg-[#16A34A]/10" : "bg-surface-muted"}`}>
                    <span className={`material-symbols-outlined ${c.status === "active" ? "text-[#16A34A]" : "text-ink-tertiary"}`} style={{ fontSize: 22 }}>business</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
                    <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
                      <StatusPill kind={pillKind(c.status)} />
                      <span>{c.type}</span>
                      <span>·</span>
                      <span>{c.sector}</span>
                      <span>·</span>
                      <span>{c.ville}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                  <Link
                    href={`/admin/validation/comptes/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                    Voir détails
                  </Link>
                  {c.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => setSuspendTarget(c)}
                      className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
                      Désactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReactivateTarget(c)}
                      className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#16A34A] bg-white border border-[#86EFAC] rounded hover:bg-[#F0FDF4] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                      Réactiver
                    </button>
                  )}
                </div>
              </div>

              {/* Suspended reason display */}
              {c.status === "suspended" && c.suspendedReason && (
                <div className="mt-3 ml-0 sm:ml-14 bg-[#FEF2F2] border border-[#FCA5A5] rounded p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#DC2626] shrink-0 mt-[1px]" style={{ fontSize: 14 }}>block</span>
                  <div className="text-[12px] text-[#991B1B] leading-snug">
                    <strong>Motif :</strong> {c.suspendedReason}
                    {c.suspendedAt && (
                      <span className="ml-2 text-[11px] text-[#B91C1C]/70">
                        — {new Date(c.suspendedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Tab: Deleted */}
      {tab === "deleted" && (deletedLoading ? (
        <div className="text-center py-16 text-ink-secondary">Chargement…</div>
      ) : deletedCompanies.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <span className="material-symbols-outlined text-ink-tertiary mb-2" style={{ fontSize: 32 }}>delete_sweep</span>
          <p className="text-[13px] text-ink-secondary">Aucune entreprise supprimée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deletedCompanies.map((c) => (
            <div key={c.id} className="bg-white border border-red-100 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-400" style={{ fontSize: 22 }}>business</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
                    <StatusPill kind="deleted" />
                    <span>{c.type}</span>
                    <span>·</span>
                    <span>Supprimé le {new Date(c.deletedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/validation/comptes/${c.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-ink-primary bg-white border border-[#D1D1D1] rounded hover:bg-surface-muted transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                  Voir détails
                </Link>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Modals */}
      <SuspendModal
        open={!!suspendTarget}
        onClose={() => { if (!actionLoading) setSuspendTarget(null); }}
        companyName={suspendTarget?.displayName || ""}
        onConfirm={handleSuspendConfirm}
        loading={actionLoading}
      />
      <ReactivateModal
        open={!!reactivateTarget}
        onClose={() => { if (!actionLoading) setReactivateTarget(null); }}
        companyName={reactivateTarget?.displayName || ""}
        onConfirm={handleReactivateConfirm}
        loading={actionLoading}
      />
    </div>
  );
}

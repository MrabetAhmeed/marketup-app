"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, BOOST_PRICE_HT, DEFAULT_VAT_RATE, computeTTC } from "@/lib/pricing";

interface BoostInfo {
  id: string;
  from: string;
  to: string;
  status: string;
  viewsAdded?: number;
  clicksAdded?: number;
}

export interface ProfileBoostData {
  kind: "brandup" | "traceup" | "linkup";
  exists: boolean;
  profileStatus: string | null;
  isPublic: boolean;
  activeBoost: BoostInfo | null;
}

const KIND_CONFIG: Record<string, { label: string; accent: string; icon: string }> = {
  brandup: { label: "BrandUP", accent: "#0078D4", icon: "storefront" },
  traceup: { label: "TraceUP", accent: "#7C3AED", icon: "play_circle" },
  linkup: { label: "LinkUP", accent: "#1A1A1A", icon: "qr_code_2" },
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  rejected: "Refusé",
  disabled: "Désactivé",
  incomplete: "Incomplet",
};

function daysRemaining(to: string): number {
  const diff = new Date(to).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function boostProgress(from: string, to: string): number {
  const total = new Date(to).getTime() - new Date(from).getTime();
  const elapsed = Date.now() - new Date(from).getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" });
}

function getBlockingReason(item: ProfileBoostData): { color: string; bgColor: string; borderColor: string; icon: string; message: string } | null {
  if (!item.exists) return {
    color: "#616161", bgColor: "#F5F5F5", borderColor: "#E0E0E0", icon: "add_circle",
    message: "Créez ce profil avant de pouvoir le booster.",
  };
  if (item.profileStatus === "incomplete") return {
    color: "#616161", bgColor: "#F5F5F5", borderColor: "#E0E0E0", icon: "edit_note",
    message: "Complétez et soumettez ce profil pour activer le boost.",
  };
  if (item.profileStatus === "rejected") return {
    color: "#7F1D1D", bgColor: "#FEF2F2", borderColor: "#FCA5A5", icon: "info",
    message: "Un profil refusé ne peut pas être boosté. Corrigez les points signalés et resoumettez-le.",
  };
  if (item.profileStatus === "pending") return {
    color: "#92400E", bgColor: "#FFFBEB", borderColor: "#FDE68A", icon: "schedule",
    message: "Profil en cours de validation. Vous pourrez le booster une fois publié (24-48 h).",
  };
  if (item.profileStatus === "disabled") return {
    color: "#616161", bgColor: "#F5F5F5", borderColor: "#E0E0E0", icon: "visibility_off",
    message: "Ce profil est désactivé. Réactivez-le pour pouvoir le booster.",
  };
  if (!item.isPublic) return {
    color: "#92400E", bgColor: "#FFFBEB", borderColor: "#FDE68A", icon: "visibility_off",
    message: "Profil masqué. Rendez-le public pour activer le boost.",
  };
  return null;
}

interface BoostCardsProps {
  data: ProfileBoostData[];
  activeBoostedCount?: number;
}

export function BoostCards({ data }: BoostCardsProps): JSX.Element {
  const router = useRouter();
  const [checkoutKind, setCheckoutKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successKind, setSuccessKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // B1: local override after successful checkout — card shows active immediately
  const [localBoosts, setLocalBoosts] = useState<Record<string, BoostInfo>>({});

  const { vatAmount, priceTTC } = computeTTC(BOOST_PRICE_HT, DEFAULT_VAT_RATE);

  async function handleCheckout(kind: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/boost/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileKind: kind,
          idempotencyKey: `boost-${kind}-${Date.now()}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Erreur lors du paiement");
      }
      const result = await res.json();
      // Update local state with returned boost data
      setLocalBoosts((prev) => ({
        ...prev,
        [kind]: {
          id: result.boost.id,
          from: result.boost.from,
          to: result.boost.to,
          status: result.boost.status,
        },
      }));
      setCheckoutKind(null);
      setSuccessKind(kind);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 3-column boost cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((item) => {
          const config = KIND_CONFIG[item.kind];
          if (!config) return null;
          const boost = localBoosts[item.kind] ?? item.activeBoost;
          const blocking = getBlockingReason(item);
          const canBoost = !blocking && !boost;

          return (
            <div
              key={item.kind}
              className={`card p-5 flex flex-col overflow-hidden ${
                boost ? "border-status-active-border bg-gradient-to-b from-status-active-bg to-white" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: blocking ? "#F5F5F5" : `${config.accent}14` }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 22, color: blocking ? "#616161" : config.accent }}
                    >
                      {config.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-[14px] text-ink-primary leading-tight">{config.label}</h3>
                    {item.exists ? (
                      boost ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-active-fg bg-white border border-status-active-border px-1.5 py-0.5 rounded mt-1">
                          <span className="material-symbols-outlined icon-fill" style={{ fontSize: 11 }}>bolt</span>
                          Boost actif
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
                          item.profileStatus === "active" ? "text-status-active-fg bg-status-active-bg border border-status-active-border"
                          : item.profileStatus === "pending" ? "text-status-pending-fg bg-status-pending-bg border border-status-pending-border"
                          : item.profileStatus === "rejected" ? "text-status-rejected-fg bg-status-rejected-bg border border-status-rejected-border"
                          : "text-ink-tertiary bg-surface-muted border border-surface-border"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
                          {STATUS_LABELS[item.profileStatus ?? ""] ?? item.profileStatus}
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-ink-tertiary mt-1 block">Profil non créé</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Blocking message */}
              {blocking && (
                <div
                  className="rounded p-3 mb-4 flex items-start gap-2"
                  style={{ backgroundColor: blocking.bgColor, border: `1px solid ${blocking.borderColor}` }}
                >
                  <span className="material-symbols-outlined shrink-0 mt-[1px]" style={{ fontSize: 16, color: blocking.color }}>{blocking.icon}</span>
                  <div className="text-[12px] leading-relaxed" style={{ color: blocking.color }}>{blocking.message}</div>
                </div>
              )}

              {/* Boost active: progress bar + stats */}
              {boost && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-ink-secondary">
                        Expire le <strong className="text-ink-primary">{formatDate(boost.to)}</strong>
                      </span>
                      <span className={`text-[11px] font-semibold ${daysRemaining(boost.to) <= 5 ? "text-status-pending-fg" : "text-status-active-fg"}`}>
                        {daysRemaining(boost.to)} j restant{daysRemaining(boost.to) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full bg-status-active-dot rounded-full" style={{ width: `${boostProgress(boost.from, boost.to)}%` }} />
                    </div>
                  </div>
                  {/* Stats viewsAdded */}
                  <div className="bg-white border border-surface-border rounded p-3 mb-4">
                    <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">Vues générées</div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading font-bold text-status-active-fg text-[24px] leading-none">
                        +{boost.viewsAdded ?? 0}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Pricing — always visible at bottom */}
              <div className="mt-auto pt-3 border-t border-surface-border/60">
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-heading font-bold text-ink-primary text-[15px]">{formatMoney(BOOST_PRICE_HT)} DT HT</span>
                  <span className="text-[11px] text-ink-secondary">/ 30 jours</span>
                </div>

                {boost ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 text-[12px] font-semibold text-ink-tertiary bg-surface-muted rounded cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                    Boost en cours
                  </button>
                ) : canBoost ? (
                  <button
                    type="button"
                    onClick={() => setCheckoutKind(item.kind)}
                    className="w-full py-2 text-[12px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined icon-fill" style={{ fontSize: 16 }}>bolt</span>
                    Booster ce profil
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 text-[12px] font-semibold text-ink-tertiary bg-surface-muted rounded cursor-not-allowed"
                  >
                    Boost indisponible
                  </button>
                )}

                {successKind === item.kind && (
                  <div className="mt-2 p-2 bg-status-active-bg border border-status-active-border rounded text-[11px] text-status-active-fg font-semibold text-center">
                    Boost activé avec succès !
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout confirmation modal */}
      {checkoutKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="font-heading font-bold text-[16px] text-ink-primary mb-4">
              Confirmer le boost {KIND_CONFIG[checkoutKind]?.label}
            </h3>
            <div className="space-y-2 mb-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Montant HT</span>
                <span className="font-semibold text-ink-primary">{formatMoney(BOOST_PRICE_HT)} DT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">TVA (19%)</span>
                <span className="font-semibold text-ink-primary">{formatMoney(vatAmount)} DT</span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2">
                <span className="font-semibold text-ink-primary">Total TTC</span>
                <span className="font-heading font-bold text-primary text-[18px]">{formatMoney(priceTTC)} DT</span>
              </div>
              <div className="text-[11px] text-ink-tertiary">Durée : 30 jours</div>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-status-rejected-bg border border-status-rejected-border rounded text-[11px] text-status-rejected-fg">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCheckoutKind(null); setError(null); }}
                disabled={loading}
                className="flex-1 py-2 text-[12px] font-semibold text-ink-secondary border border-surface-border hover:bg-surface-muted rounded transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleCheckout(checkoutKind)}
                disabled={loading}
                className="flex-1 py-2 text-[12px] font-semibold text-white bg-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-50"
              >
                {loading ? "Traitement…" : "Confirmer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

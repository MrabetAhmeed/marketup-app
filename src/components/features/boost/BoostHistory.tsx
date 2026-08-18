"use client";

import { StatusPill } from "@/components/shared/StatusPill";
import { formatMoney } from "@/lib/pricing";

interface BoostHistoryItem {
  id: string;
  profileKind: "brandup" | "traceup" | "linkup";
  from: string;
  to: string;
  status: "active" | "expired";
  priceTTC: number;
  currency: string;
  viewsAdded: number;
  clicksAdded: number;
}

const KIND_CONFIG: Record<string, { label: string; icon: string; accent: string }> = {
  brandup: { label: "BrandUP", icon: "storefront", accent: "#0078D4" },
  traceup: { label: "TraceUP", icon: "play_circle", accent: "#7C3AED" },
  linkup: { label: "LinkUP", icon: "qr_code_2", accent: "#1A1A1A" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" });
}

interface BoostHistoryProps {
  items: BoostHistoryItem[];
}

export function BoostHistory({ items }: BoostHistoryProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-ink-secondary">Aucun historique de boost pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-[12.5px] text-ink-secondary leading-relaxed mb-5 max-w-3xl">
        Historique de vos achats Boost · les reçus sont aussi disponibles dans{" "}
        <a href="/dashboard/commandes" className="text-primary hover:underline font-medium">Commandes</a>.
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/50">
              <th className="text-left px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Profil</th>
              <th className="text-left px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Période</th>
              <th className="text-left px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Statut</th>
              <th className="text-right px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Montant</th>
              <th className="text-right px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Vues</th>
              <th className="text-right px-3.5 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Clics</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const config = KIND_CONFIG[item.profileKind];
              return (
                <tr key={item.id} className="border-b border-surface-border/60 last:border-0 hover:bg-surface-muted/30 transition-colors">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: config?.accent }}>{config?.icon}</span>
                      <span className="font-semibold text-ink-primary">{config?.label}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-ink-secondary">
                    {formatDate(item.from)} → {formatDate(item.to)}
                  </td>
                  <td className="px-3.5 py-3">
                    <StatusPill kind={item.status === "active" ? "active" : "disabled"}>
                      {item.status === "active" ? "Actif" : "Terminé"}
                    </StatusPill>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <span className="font-semibold text-ink-primary">{formatMoney(item.priceTTC)}</span>
                    <span className="text-[11px] text-ink-tertiary ml-1">DT</span>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <span className={`font-semibold ${item.viewsAdded > 0 ? "text-status-active-fg" : "text-ink-tertiary"}`}>
                      {item.viewsAdded > 0 ? `+${item.viewsAdded}` : "—"}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <span className={`font-semibold ${item.clicksAdded > 0 ? "text-primary" : "text-ink-tertiary"}`}>
                      {item.clicksAdded > 0 ? `+${item.clicksAdded}` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {items.map((item) => {
          const config = KIND_CONFIG[item.profileKind];
          return (
            <div key={item.id} className="card p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: config?.accent }}>{config?.icon}</span>
                  <span className="font-semibold text-[13px] text-ink-primary">{config?.label}</span>
                </div>
                <StatusPill kind={item.status === "active" ? "active" : "disabled"}>
                  {item.status === "active" ? "Actif" : "Terminé"}
                </StatusPill>
              </div>
              <div className="text-[11px] text-ink-secondary mb-1.5">{formatDate(item.from)} → {formatDate(item.to)}</div>
              <div className="flex items-center gap-4 text-[12px]">
                <span><strong className="text-ink-primary">{formatMoney(item.priceTTC)}</strong> DT</span>
                {item.viewsAdded > 0 && <span className="text-status-active-fg font-semibold">+{item.viewsAdded} vues</span>}
                {item.clicksAdded > 0 && <span className="text-primary font-semibold">+{item.clicksAdded} clics</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

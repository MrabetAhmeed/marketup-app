import type { SponsoringHistoryItem } from "@/services/sponsoring.service";
import { formatMoney } from "@/lib/pricing";

interface SponsoringHistoryProps {
  items: SponsoringHistoryItem[];
}

const KIND_LABEL: Record<string, string> = {
  brandup: "BrandUP",
  traceup: "TraceUP",
  linkup: "LinkUP",
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  expired: { text: "Terminée", className: "text-ink-tertiary bg-surface-muted border-surface-border" },
  rejected: { text: "Refusée", className: "text-red-700 bg-red-50 border-red-200" },
  cancelled: { text: "Annulée", className: "text-ink-tertiary bg-surface-muted border-surface-border" },
};

function ctr(impressions: number, clicks: number): string {
  if (impressions === 0) return "0,0";
  return ((clicks / impressions) * 100).toFixed(1).replace(".", ",");
}

export function SponsoringHistory({ items }: SponsoringHistoryProps): JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-[13px] text-ink-tertiary text-center py-8">
        Aucune campagne passée.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const label = KIND_LABEL[item.profileKind] || item.profileKind;
        const statusCfg = STATUS_LABEL[item.status] ?? STATUS_LABEL["expired"]!;

        return (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-surface-muted/30 rounded-lg border border-surface-border">
            <img src={item.bannerUrl} alt="Bannière" className="w-full md:w-32 h-10 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-ink-primary">{label}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusCfg.className}`}>
                  {statusCfg.text}
                </span>
              </div>
              {item.from && item.to && (
                <p className="text-[11px] text-ink-tertiary mt-0.5">
                  {new Date(item.from).toLocaleDateString("fr-TN")} — {new Date(item.to).toLocaleDateString("fr-TN")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-center shrink-0">
              <div>
                <p className="text-[13px] font-bold text-ink-primary">{item.impressions}</p>
                <p className="text-[9px] text-ink-tertiary">Impr.</p>
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink-primary">{item.clicks}</p>
                <p className="text-[9px] text-ink-tertiary">Clics</p>
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink-primary">{ctr(item.impressions, item.clicks)} %</p>
                <p className="text-[9px] text-ink-tertiary">CTR</p>
              </div>
              {item.priceTTC !== null && (
                <div>
                  <p className="text-[13px] font-bold text-ink-primary">{formatMoney(item.priceTTC)}</p>
                  <p className="text-[9px] text-ink-tertiary">DT TTC</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

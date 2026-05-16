import { formatMoney } from "@/lib/pricing";
import type { RsePageData } from "@/types/rse";

interface RseStatsProps {
  stats: RsePageData["stats"];
}

export function RseStats({ stats }: RseStatsProps): JSX.Element {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total validated */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#FEFCE8] border border-[#E8C96A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 18 }}>payments</span>
          </div>
          <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Total validé</div>
        </div>
        <div className="font-heading font-bold text-ink-primary text-[24px] leading-none">
          {formatMoney(stats.totalValidatedAmount)} <span className="text-[14px] text-ink-secondary font-semibold">DT</span>
        </div>
        {stats.totalPendingAmount > 0 && (
          <div className="text-[11px] text-ink-secondary mt-1.5">
            <span className="text-[#92400E]">+ {formatMoney(stats.totalPendingAmount)} DT en attente</span>
          </div>
        )}
      </div>

      {/* Receipts count */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#FEFCE8] border border-[#E8C96A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 18 }}>volunteer_activism</span>
          </div>
          <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Reçus validés</div>
        </div>
        <div className="font-heading font-bold text-ink-primary text-[24px] leading-none">
          {stats.validatedCount} <span className="text-[14px] text-ink-secondary font-semibold">/ {stats.totalCount}</span>
        </div>
        {stats.pendingCount > 0 && (
          <div className="text-[11px] text-ink-secondary mt-1.5">
            {stats.pendingCount} en attente de validation
          </div>
        )}
      </div>

      {/* Last validated */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#FEFCE8] border border-[#E8C96A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#C5A059]" style={{ fontSize: 18 }}>event</span>
          </div>
          <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Dernier don validé</div>
        </div>
        {stats.lastValidatedDate ? (
          <>
            <div className="font-heading font-bold text-ink-primary text-[15px] leading-tight">
              {formatDate(stats.lastValidatedDate)}
            </div>
            <div className="text-[11px] text-ink-secondary mt-1.5">
              {stats.lastValidatedAssociation}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-ink-tertiary">Aucun don validé</div>
        )}
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

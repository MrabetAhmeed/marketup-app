import Link from "next/link";
import { formatMoney } from "@/lib/pricing";
import type { RseSummary } from "@/types/dashboard";

interface OverviewRseProps {
  rse: RseSummary;
}

export function OverviewRse({ rse }: OverviewRseProps): JSX.Element {
  const hasValidatedDonation = rse.lastDonation != null;
  const isValidated = rse.badgeStatus === "validated";

  return (
    <div className="card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FEFCE8] border border-[#E8C96A]/50 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined icon-fill text-[#C5A059]"
              style={{ fontSize: 20 }}
            >
              star
            </span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink-primary leading-tight">
              Badge RSE
            </h3>
            <div className="text-[11px] text-ink-secondary mt-0.5">
              Engagement Social attesté
            </div>
          </div>
        </div>
        {isValidated && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A6A1F] bg-[#FEFCE8] border border-[#E8C96A] px-1.5 py-0.5 rounded shrink-0">
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 10 }}>
              verified
            </span>
            Validé
          </span>
        )}
      </div>

      {/* Last donation box */}
      {hasValidatedDonation && (
        <div className="bg-[#FEFCE8]/40 border border-[#E8C96A]/30 rounded-lg p-3 mb-5">
          <div className="text-[10px] uppercase tracking-wider text-[#8A6A1F] font-semibold mb-1">
            Dernier don attesté
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-heading font-semibold text-[13px] text-ink-primary truncate">
                {rse.lastDonation!.associationName}
              </div>
              <div className="text-[11px] text-ink-secondary">
                {formatDonationDate(rse.lastDonation!.date)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-heading font-bold text-[16px] text-ink-primary">
                {formatMoney(rse.lastDonation!.amount)}
              </span>
              <span className="text-[12px] text-ink-secondary ml-0.5">DT</span>
            </div>
          </div>
        </div>
      )}

      {/* No donations yet */}
      {!hasValidatedDonation && (
        <div className="bg-surface-muted rounded-lg p-4 mb-5 text-center">
          <div className="text-[12px] text-ink-tertiary">Aucun don attesté pour le moment</div>
        </div>
      )}

      {/* Footer: total + CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-border mt-auto">
        <div>
          <div className="text-[11px] text-ink-tertiary">
            Total dons {new Date().getFullYear()}
          </div>
          <div className="font-heading font-bold text-[18px] text-ink-primary">
            {formatMoney(rse.totalDonationsYear)}{" "}
            <span className="text-[12px] text-ink-secondary font-semibold">DT</span>
          </div>
        </div>
        <Link
          href="/dashboard/rse"
          className="py-2 px-4 text-[12.5px] font-semibold text-white bg-[#C5A059] hover:bg-[#8A6A1F] rounded transition-colors"
        >
          Nouveau don
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date formatting helper (French long date)
// ---------------------------------------------------------------------------

function formatDonationDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

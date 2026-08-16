"use client";

import { useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";

import { formatMoney } from "@/lib/pricing";
import type { RseReceiptForUser } from "@/types/rse";

type Filter = "all" | "validated" | "pending" | "rejected";

interface RseReceiptsListProps {
  receipts: RseReceiptForUser[];
  totalValidatedAmount: number;
  totalPendingAmount: number;
}

export function RseReceiptsList({
  receipts,
  totalValidatedAmount,
  totalPendingAmount,
}: RseReceiptsListProps): JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all"
    ? receipts
    : receipts.filter((r) => r.status === filter);

  const validatedCount = receipts.filter((r) => r.status === "validated").length;

  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-heading font-bold text-[15px] text-ink-primary">
            Historique de mes reçus
          </h3>
          <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
            Tous vos dons validés · téléchargeables en PDF
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A6A1F] bg-[#FEFCE8] border border-[#E8C96A] px-2 py-1 rounded shrink-0">
          <span className="material-symbols-outlined icon-fill" style={{ fontSize: 12 }}>check_circle</span>
          {validatedCount} validé{validatedCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "validated", "pending", "rejected"] as Filter[]).map((f) => {
          const label = f === "all" ? "Tous" : f === "validated" ? "Validés" : f === "pending" ? "En attente" : "Refusés";
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-ink-secondary hover:bg-surface-strong"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Receipt cards */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-ink-tertiary">
          Aucun reçu {filter !== "all" ? `avec le statut "${filter === "validated" ? "validé" : filter === "pending" ? "en attente" : "refusé"}"` : "pour le moment"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((receipt) => (
            <ReceiptCard key={receipt.id} receipt={receipt} />
          ))}
        </div>
      )}

      {/* Footer recap */}
      <div className="mt-4 pt-4 border-t border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-3">
        <div className="text-[12px] text-ink-secondary">
          <strong className="text-ink-primary">Total dons validés :</strong>{" "}
          <span className="text-[#8A6A1F] font-bold">{formatMoney(totalValidatedAmount)} DT</span>
          <span className="text-ink-tertiary"> · hors champ TVA</span>
        </div>
        {totalPendingAmount > 0 && (
          <div className="text-[11.5px] text-[#92400E]">
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>schedule</span>
            <strong className="ml-0.5">{formatMoney(totalPendingAmount)} DT</strong> en attente de validation
          </div>
        )}
      </div>
    </section>
  );
}

function ReceiptCard({ receipt }: { receipt: RseReceiptForUser }): JSX.Element {
  const pillKind = receipt.status === "validated" ? "gold" : receipt.status === "rejected" ? "rejected" : "pending";

  return (
    <div className="bg-white border border-surface-border rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-heading font-bold text-[14px] text-ink-primary leading-tight">
              {receipt.associationName}
            </h4>
            <StatusPill kind={pillKind} />
          </div>
          <div className="text-[12px] text-ink-secondary leading-snug">
            <strong className="text-[#424242]">{formatDate(receipt.donationDate)}</strong>
            {receipt.receiptNumber && (
              <span className="text-ink-tertiary ml-2">· Reçu n° {receipt.receiptNumber}</span>
            )}
          </div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">
            {receipt.status === "validated"
              ? `Soumis le ${formatDate(receipt.submissionDate)}`
              : receipt.status === "rejected"
                ? `Soumis le ${formatDate(receipt.submissionDate)}`
                : "Validation admin sous 24-48 h"}
          </div>
          {receipt.status === "rejected" && receipt.rejectionReason && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded text-[12px] text-red-700 leading-snug">
              <span className="font-semibold">Motif du refus :</span>{" "}
              {receipt.rejectionReason}
            </div>
          )}
        </div>

        {/* Amount + actions */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
          <div className="text-right">
            <div className="font-heading font-bold text-ink-primary text-[18px] leading-none">
              {formatMoney(receipt.amount)} <span className="text-[12px] text-ink-secondary">DT</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {receipt.status === "validated" && receipt.attestationUrl && (
              <a
                href={receipt.attestationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary-light rounded transition-colors"
                title="Voir le reçu"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                Voir le reçu
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

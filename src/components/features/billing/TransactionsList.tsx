"use client";

import { useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatMoney } from "@/lib/pricing";

interface TransactionDTO {
  id: string;
  type: "boost" | "sponsoring";
  profileKind: "brandup" | "traceup" | "linkup" | null;
  priceHT: number;
  vatAmount: number;
  fiscalStampDT: number;
  priceTTC: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed";
  paymentMethod: string | null;
  invoiceNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  boost: "Boost",
  sponsoring: "Sponsoring",
};

const KIND_LABELS: Record<string, string> = {
  brandup: "BrandUP",
  traceup: "TraceUP",
  linkup: "LinkUP",
};

const METHOD_LABELS: Record<string, string> = {
  card: "Carte bancaire",
  bank_transfer: "Virement bancaire",
  manual: "Manuel",
  simulated: "Simulé",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TransactionsListProps {
  transactions: TransactionDTO[];
}

export function TransactionsList({ transactions }: TransactionsListProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>receipt_long</span>
        </div>
        <h3 className="font-heading font-semibold text-[16px] text-ink-primary mb-2">Aucune transaction</h3>
        <p className="text-[13px] text-ink-secondary">Vos transactions de boost et sponsoring apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => {
        const expanded = expandedId === t.id;
        return (
          <div key={t.id} className="card overflow-hidden">
            {/* Summary row */}
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : t.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/50 transition-colors"
            >
              <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 20 }}>
                {t.type === "boost" ? "trending_up" : "campaign"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink-primary">
                    {TYPE_LABELS[t.type]}
                  </span>
                  {t.profileKind && (
                    <span className="text-[11px] text-ink-tertiary">
                      {KIND_LABELS[t.profileKind]}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-tertiary">
                  {t.paidAt ? formatDate(t.paidAt) : formatDate(t.createdAt)}
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <StatusPill kind={t.status}/>
                <span className="text-[14px] font-bold text-ink-primary">
                  {formatMoney(t.priceTTC)}
                  <span className="text-[11px] font-normal text-ink-secondary ml-1">DT</span>
                </span>
                <span
                  className={`material-symbols-outlined text-ink-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
                  style={{ fontSize: 18 }}
                >
                  expand_more
                </span>
              </div>
            </button>

            {/* Detail section */}
            {expanded && (
              <div className="border-t border-surface-border px-4 py-3 bg-surface-muted/30">
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[12px]">
                  <div>
                    <span className="text-ink-tertiary">Montant HT</span>
                    <div className="font-semibold text-ink-primary">{formatMoney(t.priceHT)} DT</div>
                  </div>
                  <div>
                    <span className="text-ink-tertiary">TVA (19%)</span>
                    <div className="font-semibold text-ink-primary">{formatMoney(t.vatAmount)} DT</div>
                  </div>
                  {t.fiscalStampDT > 0 && (
                  <div>
                    <span className="text-ink-tertiary">Timbre fiscal</span>
                    <div className="font-semibold text-ink-primary">{formatMoney(t.fiscalStampDT)} DT</div>
                  </div>
                  )}
                  <div>
                    <span className="text-ink-tertiary">Total TTC</span>
                    <div className="font-bold text-ink-primary">{formatMoney(t.priceTTC)} DT</div>
                  </div>
                  <div>
                    <span className="text-ink-tertiary">Moyen de paiement</span>
                    <div className="font-semibold text-ink-primary">
                      {t.paymentMethod ? METHOD_LABELS[t.paymentMethod] || t.paymentMethod : "—"}
                    </div>
                  </div>
                  {t.invoiceNumber && (
                    <div>
                      <span className="text-ink-tertiary">N° de commande</span>
                      <div className="font-semibold text-ink-primary font-mono text-[11px]">{t.invoiceNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

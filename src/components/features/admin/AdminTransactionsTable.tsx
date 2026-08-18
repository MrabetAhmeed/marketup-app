"use client";

import { useState, useMemo } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatMoney } from "@/lib/pricing";

interface TransactionAdminDTO {
  id: string;
  companyId: string;
  companyDisplayName: string;
  type: "boost" | "sponsoring";
  profileKind: "brandup" | "traceup" | "linkup" | null;
  priceHT: number;
  vatAmount: number;
  fiscalStampDT: number;
  priceTTC: number;
  currency: string;
  status: "pending" | "paid" | "paid_simulated" | "refunded" | "failed";
  paymentMethod: string | null;
  paymentReference: string | null;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusPillKind(status: string): "paid" | "pending" | "failed" | "refunded" {
  if (status === "paid" || status === "paid_simulated") return "paid";
  if (status === "refunded") return "refunded";
  if (status === "failed") return "failed";
  return "pending";
}

function statusLabel(status: string): string {
  if (status === "paid_simulated") return "Payé (test)";
  if (status === "paid") return "Payé";
  if (status === "refunded") return "Remboursé";
  if (status === "failed") return "Échoué";
  return "En attente";
}

interface AdminTransactionsTableProps {
  transactions: TransactionAdminDTO[];
}

export function AdminTransactionsTable({ transactions }: AdminTransactionsTableProps): JSX.Element {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.type !== filterType) return false;
      return true;
    });
  }, [transactions, filterStatus, filterType]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-[12px] px-3 py-1.5 border border-surface-border rounded bg-white text-ink-primary"
        >
          <option value="">Tous les statuts</option>
          <option value="paid">Payé</option>
          <option value="paid_simulated">Payé (test)</option>
          <option value="pending">En attente</option>
          <option value="refunded">Remboursé</option>
          <option value="failed">Échoué</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-[12px] px-3 py-1.5 border border-surface-border rounded bg-white text-ink-primary"
        >
          <option value="">Tous les types</option>
          <option value="boost">Boost</option>
          <option value="sponsoring">Sponsoring</option>
        </select>
        <span className="text-[11px] text-ink-tertiary ml-auto">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-ink-secondary">Aucune transaction trouvée.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Entreprise</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Profil</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-ink-secondary">Montant TTC</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Statut</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Commande</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink-primary">{t.companyDisplayName}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{TYPE_LABELS[t.type]}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{t.profileKind ? KIND_LABELS[t.profileKind] : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-ink-primary">{formatMoney(t.priceTTC)}</span>
                      <span className="text-ink-tertiary ml-1">DT</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill kind={statusPillKind(t.status)}>{statusLabel(t.status)}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-ink-secondary">{t.invoiceNumber || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{t.paidAt ? formatDate(t.paidAt) : formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

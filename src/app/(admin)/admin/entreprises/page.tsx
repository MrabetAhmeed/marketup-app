"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";

interface CompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  status: string;
  sector: string;
  ville: string;
  registeredAt: string;
}

export default function EntreprisesPage(): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/companies")
      .then((r) => r.json())
      .then((data) => { setCompanies(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSuspend(companyId: string): Promise<void> {
    setActionId(companyId);
    try {
      const res = await fetch(`/api/v1/admin/companies/${companyId}/suspend`, { method: "POST" });
      if (!res.ok) { const j = await res.json(); showToast(j.error?.message || "Erreur"); return; }
      showToast("Compte désactivé");
      setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, status: "suspended" } : c));
      router.refresh();
    } catch { showToast("Erreur"); } finally { setActionId(null); }
  }

  async function handleReactivate(companyId: string): Promise<void> {
    setActionId(companyId);
    try {
      const res = await fetch(`/api/v1/admin/companies/${companyId}/reactivate`, { method: "POST" });
      if (!res.ok) { const j = await res.json(); showToast(j.error?.message || "Erreur"); return; }
      showToast("Compte réactivé");
      setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, status: "active" } : c));
      router.refresh();
    } catch { showToast("Erreur"); } finally { setActionId(null); }
  }

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Entreprises</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Liste des entreprises actives et désactivées</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink-secondary">Chargement…</div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <p className="text-[13px] text-ink-secondary">Aucune entreprise trouvée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.status === "active" ? "bg-[#16A34A]/10" : "bg-surface-muted"}`}>
                <span className={`material-symbols-outlined ${c.status === "active" ? "text-[#16A34A]" : "text-ink-tertiary"}`} style={{ fontSize: 22 }}>business</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    c.status === "active" ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#B91C1C]"
                  }`}>
                    {c.status === "active" ? "Actif" : "Désactivé"}
                  </span>
                  <span>{c.type}</span>
                  <span>·</span>
                  <span>{c.sector}</span>
                  <span>·</span>
                  <span>{c.ville}</span>
                </div>
              </div>
              {c.status === "active" ? (
                <button
                  type="button"
                  disabled={actionId === c.id}
                  onClick={() => handleSuspend(c.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] transition-colors disabled:opacity-60 shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
                  Désactiver
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionId === c.id}
                  onClick={() => handleReactivate(c.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#16A34A] bg-white border border-[#86EFAC] rounded hover:bg-[#F0FDF4] transition-colors disabled:opacity-60 shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                  Réactiver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { listPendingCompanies } from "@/services/admin-company.service";

export default async function ValidationComptesPage(): Promise<JSX.Element> {
  const companies = await listPendingCompanies("fr");

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Validation des comptes</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {companies.length} compte{companies.length !== 1 ? "s" : ""} en attente de validation
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
            <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>how_to_reg</span>
          </div>
          <h2 className="font-heading font-bold text-[16px] text-ink-primary mb-1">Aucun compte en attente</h2>
          <p className="text-[13px] text-ink-secondary">Tous les comptes ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#D97706]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 22 }}>business</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
                  <span>{c.type}</span>
                  <span>·</span>
                  <span>{c.sector}</span>
                  <span>·</span>
                  <span>{c.gouvernorat}, {c.ville}</span>
                  <span>·</span>
                  <span>Inscrit le {new Date(c.registeredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {c.hasLegalDoc && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-[#16A34A]">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>description</span>
                        PDF
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/validation/comptes/${c.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded transition-colors shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                Examiner
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

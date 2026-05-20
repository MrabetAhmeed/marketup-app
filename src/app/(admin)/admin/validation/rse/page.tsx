import Link from "next/link";
import { listPendingRseReceipts } from "@/services/admin-rse.service";

export default async function ValidationRsePage(): Promise<JSX.Element> {
  const receipts = await listPendingRseReceipts("fr");

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Validation RSE</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {receipts.length} reçu{receipts.length !== 1 ? "s" : ""} en attente de validation
        </p>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
            <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>volunteer_activism</span>
          </div>
          <h2 className="font-heading font-bold text-[16px] text-ink-primary mb-1">Aucun reçu en attente</h2>
          <p className="text-[13px] text-ink-secondary">Tous les reçus RSE ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 22 }}>volunteer_activism</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{r.companyName}</div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
                  <span>{r.associationName}</span>
                  <span>·</span>
                  <span className="font-semibold">{r.amount} DT</span>
                  <span>·</span>
                  <span>Don du {new Date(r.donationDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
              <Link
                href={`/admin/validation/rse/${r.id}`}
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

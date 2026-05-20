import Link from "next/link";
import { listPendingProfiles } from "@/services/admin-profile.service";

export default async function ValidationProfilesPage(): Promise<JSX.Element> {
  const profiles = await listPendingProfiles("fr");

  const kindLabel = (kind: string): string =>
    kind === "brandup" ? "BrandUP" : kind === "traceup" ? "TraceUP" : "LinkUP";

  const kindColor = (kind: string): string =>
    kind === "brandup" ? "#0078D4" : kind === "traceup" ? "#7C3AED" : "#242424";

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] text-ink-primary">Validation des profils</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {profiles.length} profil{profiles.length !== 1 ? "s" : ""} en attente de validation
          </p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
            <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>verified</span>
          </div>
          <h2 className="font-heading font-bold text-[16px] text-ink-primary mb-1">Aucun profil en attente</h2>
          <p className="text-[13px] text-ink-secondary">Tous les profils ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kindColor(p.kind)}15` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: kindColor(p.kind) }}>
                  {p.kind === "brandup" ? "storefront" : p.kind === "traceup" ? "play_circle" : "qr_code_2"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{p.companyName}</div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${kindColor(p.kind)}15`, color: kindColor(p.kind) }}>
                    {kindLabel(p.kind)}
                  </span>
                  <span>Soumis le {new Date(p.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              </div>
              <Link
                href={`/admin/validation/profiles/${p.id}`}
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

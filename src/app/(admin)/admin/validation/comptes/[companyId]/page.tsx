import Link from "next/link";
import { pickLocale } from "@/lib/i18n";
import { getCompanyForAdminReview } from "@/services/admin-company.service";
import { ensurePdfExtension } from "@/lib/upload";
import { CompanyReviewActions } from "@/components/features/admin/CompanyReviewActions";
import { PendingUpdatesActions } from "@/components/features/admin/PendingUpdatesActions";
import type { LinkedProfile } from "@/services/admin-company.service";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanyReviewPage({ params }: PageProps): Promise<JSX.Element> {
  const { companyId } = await params;
  const company = await getCompanyForAdminReview(companyId, "fr");

  const fields = [
    { label: "Nom de l'entreprise", value: company.displayName },
    { label: "Type", value: company.type },
    { label: "Identifiant légal (RNE)", value: company.legalId },
    { label: "Matricule fiscal", value: company.vatNumber ?? "Non renseigné" },
    { label: "Email de compte", value: company.accountEmail },
    { label: "Email de contact", value: company.contactEmail || "Non renseigné" },
    { label: "Téléphone", value: company.phone ?? "Non renseigné" },
    { label: "Secteur", value: company.sector },
    { label: "Gouvernorat", value: company.gouvernorat },
    { label: "Ville", value: company.ville },
    { label: "Adresse", value: company.address ?? "Non renseignée" },
    { label: "Propriétaire", value: company.ownerName || company.ownerEmail },
  ];

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <Link href="/admin/validation/comptes" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink-primary transition-colors">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Retour à la liste
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#D97706]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 24 }}>business</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">{company.displayName}</h1>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                company.status === "pending" ? "bg-[#FEF3C7] text-[#92400E]"
                  : company.status === "active" ? "bg-[#F0FDF4] text-[#16A34A]"
                    : company.status === "rejected" ? "bg-[#FEF2F2] text-[#B91C1C]"
                      : "bg-surface-muted text-ink-secondary"
              }`}>
                {company.status === "pending" ? "En attente" : company.status === "active" ? "Actif" : company.status === "rejected" ? "Refusé" : company.status}
              </span>
              <span>Inscrit le {new Date(company.registeredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
        </div>
        {company.status === "pending" && <CompanyReviewActions companyId={companyId} />}
      </div>

      {/* Company info */}
      <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-heading font-bold text-[15px] text-ink-primary">Informations de l&apos;entreprise</h2>
        </div>
        <div className="divide-y divide-surface-border">
          {fields.map((f) => (
            <div key={f.label} className="px-5 py-3 flex items-start gap-4">
              <span className="text-[12px] font-semibold text-ink-tertiary w-[160px] shrink-0 pt-0.5">{f.label}</span>
              <span className="text-[13px] text-ink-primary">{f.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pending updates */}
      {company.pendingUpdates && company.pendingUpdates.fields.length > 0 && (
        <section className="bg-white border border-[#FDE68A] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#FDE68A] bg-[#FFFBEB] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-heading font-bold text-[15px] text-[#92400E]">Modifications en attente</h2>
              <p className="text-[12px] text-[#92400E]/70 mt-0.5">
                Soumises le {new Date(company.pendingUpdates.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <PendingUpdatesActions companyId={companyId} />
          </div>
          <div className="divide-y divide-surface-border">
            {company.pendingUpdates.fields.map((f) => {
              const current = typeof f.currentValue === "object" && f.currentValue !== null
                ? pickLocale(f.currentValue as { fr: string; ar: string; en: string }, "fr")
                : String(f.currentValue);
              const next = typeof f.newValue === "object" && f.newValue !== null
                ? pickLocale(f.newValue as { fr: string; ar: string; en: string }, "fr")
                : String(f.newValue);

              return (
                <div key={f.key} className="px-5 py-3 flex items-start gap-4">
                  <span className="text-[12px] font-semibold text-ink-tertiary w-[160px] shrink-0 pt-0.5">{f.label}</span>
                  <div className="text-[13px] flex items-center gap-2 flex-wrap">
                    <span className="text-ink-secondary line-through">{current}</span>
                    <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 14 }}>arrow_forward</span>
                    <span className="text-ink-primary font-semibold">{next}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Legal document */}
      <section className="bg-white border border-surface-border rounded-lg p-5">
        <h3 className="font-heading font-bold text-[14px] text-ink-primary mb-3">Document légal</h3>
        {company.identityDocumentUrl ? (
          <div className="border border-surface-border rounded-lg overflow-hidden">
            {company.identityDocumentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={company.identityDocumentUrl} alt="Document légal" className="w-full max-h-[400px] object-contain bg-surface-muted" />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 bg-surface-muted">
                <span className="material-symbols-outlined text-ink-tertiary mb-2" style={{ fontSize: 48 }}>description</span>
                <p className="text-[13px] text-ink-secondary mb-3">Document PDF</p>
              </div>
            )}
            <div className="px-4 py-2.5 bg-surface-subtle border-t border-surface-border">
              <a href={ensurePdfExtension(company.identityDocumentUrl) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary hover:underline font-semibold inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                Ouvrir le document
              </a>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-secondary">Aucun document fourni lors de l&apos;inscription.</p>
        )}
      </section>

      {/* Linked profiles */}
      {company.profiles.length > 0 && (
        <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="font-heading font-bold text-[15px] text-ink-primary">Profils de cette entreprise</h2>
            <p className="text-[12px] text-ink-secondary mt-0.5">Les 3 profils associés à cette entreprise</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["brandup", "traceup", "linkup"] as const).map((kind) => {
                const p = company.profiles.find((pr: LinkedProfile) => pr.kind === kind);
                return <ProfileCard key={kind} kind={kind} profile={p ?? null} />;
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------

const KIND_CONFIG = {
  brandup: { label: "BrandUP", icon: "storefront", color: "#0078D4" },
  traceup: { label: "TraceUP", icon: "play_circle", color: "#7C3AED" },
  linkup: { label: "LinkUP", icon: "qr_code_2", color: "#242424" },
} as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "En attente", bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  active: { label: "Actif", bg: "bg-[#F0FDF4]", text: "text-[#16A34A]" },
  rejected: { label: "Refusé", bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]" },
  incomplete: { label: "Incomplet", bg: "bg-surface-muted", text: "text-ink-secondary" },
  suspended: { label: "Suspendu", bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]" },
  disabled: { label: "Désactivé", bg: "bg-surface-muted", text: "text-ink-secondary" },
};

function ProfileCard({ kind, profile }: { kind: "brandup" | "traceup" | "linkup"; profile: LinkedProfile | null }): JSX.Element {
  const config = KIND_CONFIG[kind];
  const statusCfg = profile ? (STATUS_CONFIG[profile.status] ?? STATUS_CONFIG.incomplete) : null;

  return (
    <div className="border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}15` }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: config.color }}>{config.icon}</span>
        </div>
        <span className="font-heading font-bold text-[13px] text-ink-primary">{config.label}</span>
      </div>

      {profile ? (
        <>
          <span className={`inline-flex items-center self-start gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${statusCfg!.bg} ${statusCfg!.text}`}>
            {statusCfg!.label}
          </span>
          {profile.status === "incomplete" ? (
            <span className="text-[11px] text-ink-tertiary mt-auto">
              Profil non rempli
            </span>
          ) : (
            <Link
              href={`/admin/validation/profiles/${profile.id}`}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline mt-auto"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
              Voir le profil
            </Link>
          )}
        </>
      ) : (
        <span className="text-[11px] text-ink-tertiary">Profil non créé</span>
      )}
    </div>
  );
}

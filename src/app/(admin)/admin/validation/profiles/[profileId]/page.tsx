import Link from "next/link";
import { getProfileForAdminReview } from "@/services/admin-profile.service";
import { ProfileReviewActions } from "@/components/features/admin/ProfileReviewActions";

interface PageProps {
  params: Promise<{ profileId: string }>;
}

export default async function ProfileReviewPage({ params }: PageProps): Promise<JSX.Element> {
  const { profileId } = await params;
  const profile = await getProfileForAdminReview(profileId, "fr");

  const kindLabel = profile.kind === "brandup" ? "BrandUP" : profile.kind === "traceup" ? "TraceUP" : "LinkUP";
  const kindIcon = profile.kind === "brandup" ? "storefront" : profile.kind === "traceup" ? "play_circle" : "qr_code_2";
  const kindColor = profile.kind === "brandup" ? "#0078D4" : profile.kind === "traceup" ? "#7C3AED" : "#242424";

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Back link */}
      <Link href="/admin/validation/profiles" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink-primary transition-colors">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Retour à la liste
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kindColor}15` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: kindColor }}>{kindIcon}</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              {profile.companyName} — {kindLabel}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                En attente
              </span>
              <span>Soumis le {new Date(profile.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
        </div>
        <ProfileReviewActions profileId={profileId} />
      </div>

      {/* Pending modifications */}
      {profile.pendingFields.length > 0 ? (
        <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 bg-[#FFFBEB] border-b border-[#FDE68A]">
            <h2 className="font-heading font-bold text-[15px] text-[#92400E]">
              Modifications soumises ({profile.pendingFields.length})
            </h2>
            <p className="text-[12px] text-[#92400E] mt-0.5">Comparez les valeurs actuelles et les modifications proposées</p>
          </div>
          <div className="divide-y divide-surface-border">
            {profile.pendingFields.map((field) => (
              <div key={field.key} className="px-5 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-secondary mb-2">{field.label}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-muted rounded border border-surface-border">
                    <div className="text-[10px] font-semibold text-ink-tertiary mb-1">ACTUEL</div>
                    <div className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
                      {field.currentValue || "(vide)"}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F0FDF4] rounded border border-[#86EFAC]">
                    <div className="text-[10px] font-semibold text-[#166534] mb-1">PROPOSÉ</div>
                    <div className="text-[13px] text-ink-primary leading-relaxed whitespace-pre-wrap">
                      {field.newValue || "(vide)"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-white border border-surface-border rounded-lg p-5">
          <p className="text-[13px] text-ink-secondary">
            Aucune modification textuelle soumise. Ce profil demande uniquement un changement de statut (première soumission ou resoumission).
          </p>
        </section>
      )}

      {/* Info */}
      <section className="bg-white border border-surface-border rounded-lg p-5">
        <h3 className="font-heading font-bold text-[14px] text-ink-primary mb-3">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-ink-tertiary">Email propriétaire</span>
            <div className="font-medium text-ink-primary">{profile.ownerEmail}</div>
          </div>
          <div>
            <span className="text-ink-tertiary">Slug entreprise</span>
            <div className="font-medium text-ink-primary">{profile.companySlug}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

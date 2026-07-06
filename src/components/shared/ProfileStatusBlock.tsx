import type { ProfileStatus } from "@/types";

interface ProfileStatusBlockProps {
  status: ProfileStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  rejectedAt: string | null;
  publishedAt?: string | null;
}

export function ProfileStatusBlock({
  status,
  rejectionReason,
  submittedAt,
  rejectedAt,
  publishedAt,
}: ProfileStatusBlockProps): JSX.Element | null {
  if (status === "active" || status === "incomplete") return null;

  if (status === "pending") {
    return (
      <section
        className="border border-[#FDE68A] bg-[#FFFBEB] rounded-lg overflow-hidden"
        role="status"
        aria-live="polite"
      >
        <div className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white border border-[#FDE68A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#D97706]" style={{ fontSize: 22 }}>
              schedule
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-bold text-[14px] text-[#92400E] mb-1">
              Revue en cours par l&apos;administrateur
            </div>
            <p className="text-[13px] text-[#92400E] leading-relaxed mb-3">
              Votre soumission est actuellement en cours d&apos;examen. Pendant cette période :
            </p>
            <ul className="space-y-1.5 text-[12.5px] text-[#92400E] leading-relaxed mb-3">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px] text-[#D97706]" style={{ fontSize: 14 }}>lock</span>
                <span>Tous les champs du profil sont <strong>en lecture seule</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px] text-[#D97706]" style={{ fontSize: 14 }}>{publishedAt ? "visibility" : "visibility_off"}</span>
                <span>{publishedAt
                  ? <>Votre profil reste <strong>visible</strong> sur le moteur public avec vos données validées</>
                  : <>Votre profil est <strong>invisible</strong> sur le moteur public</>
                }</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined shrink-0 mt-[1px] text-[#D97706]" style={{ fontSize: 14 }}>mail</span>
                <span>Un email vous sera envoyé dès acceptation ou refus (délai estimé 24-48 h)</span>
              </li>
            </ul>
            {submittedAt && (
              <p className="text-[12px] text-[#92400E]">
                Soumis le {formatDate(submittedAt)}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status === "rejected") {
    const reason = rejectionReason || "Aucun motif fourni par l'administrateur.";
    return (
      <section
        className="border border-[#FCA5A5] bg-[#FEF2F2] rounded-lg overflow-hidden"
        role="alert"
        aria-live="polite"
      >
        <div className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#DC2626]" style={{ fontSize: 22 }}>
              report
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-bold text-[14px] text-[#991B1B] mb-1">
              Votre soumission a été refusée
            </div>
            <p className="text-[13px] text-[#991B1B] leading-relaxed mb-3">
              L&apos;équipe d&apos;administration a examiné votre profil
              {rejectedAt && ` le ${formatDate(rejectedAt)}`} et n&apos;a pas pu le publier
              pour la raison suivante :
            </p>
            <div className="bg-white border border-[#FCA5A5] rounded p-3 mb-3">
              <div className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
                Motif de l&apos;administrateur
              </div>
              <p className="text-[13px] text-ink-primary leading-relaxed italic">
                « {reason} »
              </p>
            </div>
            <p className="text-[12px] text-[#991B1B] leading-relaxed">
              Corrigez les points mentionnés puis cliquez sur <strong>Enregistrer et resoumettre</strong> en bas de page.
            </p>
            {publishedAt && (
              <p className="text-[12px] text-[#92400E] mt-2 flex items-start gap-1.5">
                <span className="material-symbols-outlined shrink-0 mt-[1px] text-[#D97706]" style={{ fontSize: 14 }}>visibility</span>
                Votre profil reste <strong>visible</strong> sur le moteur public avec vos données précédemment validées.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status === "disabled") {
    return (
      <section
        className="border border-surface-border bg-surface-muted rounded-lg overflow-hidden"
        role="status"
      >
        <div className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white border border-surface-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-ink-tertiary" style={{ fontSize: 22 }}>
              block
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-bold text-[14px] text-ink-primary mb-1">
              Profil désactivé
            </div>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              Ce profil a été désactivé par l&apos;administrateur. Contactez le support
              ou cliquez sur <strong>Réactiver le profil</strong> en bas de page pour soumettre
              une demande de réactivation.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

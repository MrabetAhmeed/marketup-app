import Link from "next/link";
import { getRseReceiptForAdminReview } from "@/services/admin-rse.service";
import { ensurePdfExtension } from "@/lib/upload";
import { RseReviewActions } from "@/components/features/admin/RseReviewActions";

interface PageProps {
  params: Promise<{ receiptId: string }>;
}

export default async function RseReceiptReviewPage({ params }: PageProps): Promise<JSX.Element> {
  const { receiptId } = await params;
  const receipt = await getRseReceiptForAdminReview(receiptId, "fr");

  const fields = [
    { label: "Entreprise", value: receipt.companyName },
    { label: "Association", value: receipt.associationName },
    { label: "Montant", value: `${receipt.amount} DT` },
    { label: "Date du don", value: new Date(receipt.donationDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) },
    { label: "Soumis le", value: new Date(receipt.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) },
    { label: "Email propriétaire", value: receipt.ownerEmail },
  ];

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <Link href="/admin/validation?tab=rse" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink-primary transition-colors">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        Retour à la liste
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#C5A059]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 24 }}>volunteer_activism</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">
              {receipt.companyName} — {receipt.associationName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                En attente
              </span>
              <span className="font-semibold">{receipt.amount} DT</span>
            </div>
          </div>
        </div>
        <RseReviewActions receiptId={receiptId} />
      </div>

      {/* Receipt info */}
      <section className="bg-white border border-surface-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-heading font-bold text-[15px] text-ink-primary">Détails du reçu</h2>
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

      {/* Receipt document */}
      <section className="bg-white border border-surface-border rounded-lg p-5">
        <h3 className="font-heading font-bold text-[14px] text-ink-primary mb-3">Justificatif</h3>
        {receipt.receiptDocumentUrl ? (
          <div className="border border-surface-border rounded-lg overflow-hidden">
            {receipt.receiptDocumentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={receipt.receiptDocumentUrl} alt="Justificatif" className="w-full max-h-[400px] object-contain bg-surface-muted" />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 bg-surface-muted">
                <span className="material-symbols-outlined text-ink-tertiary mb-2" style={{ fontSize: 48 }}>description</span>
                <p className="text-[13px] text-ink-secondary mb-3">Document PDF</p>
              </div>
            )}
            <div className="px-4 py-2.5 bg-surface-subtle border-t border-surface-border">
              <a href={ensurePdfExtension(receipt.receiptDocumentUrl) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary hover:underline font-semibold inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                Ouvrir le justificatif
              </a>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-secondary">Aucun justificatif fourni.</p>
        )}
      </section>
    </div>
  );
}

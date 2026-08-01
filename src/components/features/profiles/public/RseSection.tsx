interface RseReceipt {
  associationName: string;
  amount: number;
  donationDate: string;
  receiptNumber: string | null;
  receiptDocumentUrl?: string | null;
}

interface RseSectionProps {
  receipts: RseReceipt[];
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

export default function RseSection({ receipts }: RseSectionProps): JSX.Element {
  if (receipts.length === 0) return <></>;

  return (
    <div className="mb-20">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Tra&ccedil;abilit&eacute; RSE</h2>
        <div className="h-[1px] flex-grow bg-outline-variant" />
      </div>

      {/* Engagement intro */}
      <div className="bg-[#FEFCE8]/30 border border-[#E8C96A]/40 p-8 rounded-2xl mb-8 flex items-center gap-6">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#E8C96A] flex-shrink-0">
          <span className="material-symbols-outlined text-[#C5A059] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        </div>
        <div>
          <p className="text-on-surface font-extrabold text-xl leading-tight">Engagement Social Actif</p>
          <p className="text-on-surface-variant text-base mt-1">
            Nous reversons 1% de notre chiffre d&apos;affaires &agrave; des associations locales de protection de l&apos;environnement.
          </p>
        </div>
      </div>

      {/* Receipt cards */}
      <div className="flex flex-col md:flex-row gap-6">
        {receipts.map((r, idx) => (
          <div key={r.receiptNumber ?? `rse-${idx}`} className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant">
            <div className="h-32 overflow-hidden bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-on-surface">{r.associationName}</h4>
                  {r.receiptNumber && <p className="text-[11px] text-outline font-medium">Re&ccedil;u n&deg; {r.receiptNumber}</p>}
                </div>
                <div className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  VALID&Eacute;
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-on-surface-variant">Date : {formatDate(r.donationDate)}</p>
                  <p className="text-xl font-bold text-on-surface">{formatAmount(r.amount)} <span className="text-sm text-on-surface-variant">DT</span></p>
                </div>
                {r.receiptDocumentUrl ? (
                  <a href={r.receiptDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-outline hover:text-primary transition-colors cursor-pointer" title="Voir le reçu">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </a>
                ) : (
                  <span className="material-symbols-outlined text-outline">receipt_long</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

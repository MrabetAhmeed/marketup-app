/* eslint-disable @next/next/no-img-element */
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
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">Tra&ccedil;abilit&eacute; RSE</h2>
        <div className="h-[1px] flex-grow bg-outline-variant" />
      </div>

      {/* Engagement intro — ESG icon + HTML label */}
      <div className="bg-[#F0F4FF] border border-[#C5CCE8] p-6 md:p-8 rounded-xl mb-8 flex flex-col sm:flex-row items-center gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <img
            src="/badges/esg-icon.svg"
            alt="ESG"
            className="w-12 h-12 md:w-14 md:h-14"
          />
          <span className="text-[#1A2B8C] font-heading font-bold text-[13px] md:text-[15px] uppercase tracking-wider text-center sm:text-left leading-tight">
            Engagement<br />Social Attest&eacute;
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-on-surface font-bold text-lg leading-tight mb-1">Engagement Social Actif</p>
          <p className="text-on-surface-variant text-[14px] leading-relaxed">
            Nous contribuons activement &agrave; la vie locale en reversant une partie de notre chiffre d&apos;affaires &agrave; des associations qui &oelig;uvrent pour le bien commun.
          </p>
        </div>
      </div>

      {/* Receipt cards */}
      <div className="flex flex-col md:flex-row gap-6">
        {receipts.map((r, idx) => (
          <div key={r.receiptNumber ?? `rse-${idx}`} className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant">
            <div className="h-32 overflow-hidden bg-[#F0F4FF] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1A2B8C]" style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
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

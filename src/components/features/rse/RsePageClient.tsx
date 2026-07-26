"use client";

import { useState } from "react";
import type { RsePageData } from "@/types/rse";
import { RseBadgeHero } from "./RseBadgeHero";
import { RseStats } from "./RseStats";
import { RseReceiptsList } from "./RseReceiptsList";
import { RseDonationModal } from "./RseDonationModal";

interface RsePageClientProps {
  data: RsePageData;
  companySlug: string;
}

export function RsePageClient({ data, companySlug }: RsePageClientProps): JSX.Element {
  const [donationModalOpen, setDonationModalOpen] = useState(false);

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* Hero */}
      <RseBadgeHero
        data={data}
        companySlug={companySlug}
        onOpenDonation={() => setDonationModalOpen(true)}
      />

      {/* Stats */}
      <RseStats stats={data.stats} />

      {/* Receipts list */}
      <RseReceiptsList
        receipts={data.receipts}
        totalValidatedAmount={data.stats.totalValidatedAmount}
        totalPendingAmount={data.stats.totalPendingAmount}
      />

      {/* How it works section */}
      <HowItWorks />

      {/* Donation modal */}
      <RseDonationModal
        open={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
        associations={data.associations}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// How it works (static, per mockup lines 668-735)
// ---------------------------------------------------------------------------

function HowItWorks(): JSX.Element {
  const steps = [
    { title: "Faites votre don", description: "Directement auprès d'une association tunisienne reconnue. MARKET-UP ne gère pas les fonds." },
    { title: "Soumettez le reçu", description: "Téléversez le justificatif (PDF ou photo) avec le montant et la date du don." },
    { title: "Badge activé", description: "Après validation admin (24-48 h), le badge « Engagement Social Attesté » apparaît sur vos profils." },
  ];

  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4">
        <h3 className="font-heading font-bold text-[15px] text-ink-primary">
          Comment obtenir et maintenir votre badge ?
        </h3>
        <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug">
          MARKET-UP atteste uniquement la réalité du don, sans intervenir dans le flux financier
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-surface-subtle border border-[#F0F0F0] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#FEFCE8] border border-[#E8C96A] flex items-center justify-center shrink-0">
              <span className="font-heading font-bold text-[13px] text-[#8A6A1F]">{i + 1}</span>
            </div>
            <div className="min-w-0">
              <div className="font-heading font-semibold text-[13px] text-ink-primary mb-0.5">
                {step.title}
              </div>
              <p className="text-[11.5px] text-ink-secondary leading-snug">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

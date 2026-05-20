import { connectDb } from "@/lib/db";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import { RseReceipt } from "@/models/rse-receipt.model";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const RseReceiptModel = RseReceipt as any;

async function getAdminKpis(): Promise<{
  companiesActive: number;
  companiesPending: number;
  profilesPending: number;
  rsePending: number;
}> {
  await connectDb();
  const [companiesActive, companiesPending, profilesPending, rsePending] = await Promise.all([
    CompanyModel.countDocuments({ status: "active", deletedAt: null }),
    CompanyModel.countDocuments({ status: "pending", deletedAt: null }),
    ProfileModel.countDocuments({ status: "pending", deletedAt: null }),
    RseReceiptModel.countDocuments({ status: "pending", deletedAt: null }),
  ]);
  return { companiesActive, companiesPending, profilesPending, rsePending };
}

export default async function AdminDashboardPage(): Promise<JSX.Element> {
  const kpis = await getAdminKpis();

  const cards = [
    { label: "Entreprises actives", value: kpis.companiesActive, icon: "business", color: "#16A34A" },
    { label: "Comptes en attente", value: kpis.companiesPending, icon: "how_to_reg", color: "#D97706" },
    { label: "Profils à valider", value: kpis.profilesPending, icon: "verified", color: "#5C2D91", href: "/admin/validation/profiles" },
    { label: "Reçus RSE en attente", value: kpis.rsePending, icon: "volunteer_activism", color: "#C5A059" },
  ];

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Vue d&apos;ensemble</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Tableau de bord administration MARKET-UP</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-surface-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: card.color }}>{card.icon}</span>
              {card.href && card.value > 0 && (
                <a href={card.href} className="text-[11px] font-semibold text-[#5C2D91] hover:underline">
                  Voir →
                </a>
              )}
            </div>
            <div className="font-heading font-bold text-[28px] text-ink-primary leading-none">{card.value}</div>
            <div className="text-[12px] text-ink-secondary mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

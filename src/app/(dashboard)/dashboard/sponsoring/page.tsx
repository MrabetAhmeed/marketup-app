import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { FeatureComingSoonPage } from "@/components/shared/FeatureComingSoonPage";
import { getSponsoringDashboard } from "@/services/sponsoring.service";
import { SponsoringCards } from "@/components/features/sponsoring/SponsoringCards";
import { SponsoringHistory } from "@/components/features/sponsoring/SponsoringHistory";
import { SponsoringPageTabs } from "@/components/features/sponsoring/SponsoringPageTabs";

export default async function SponsoringPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  if (!me.features.monetization) {
    return <FeatureComingSoonPage kind="sponsoring" />;
  }

  const dashboard = await getSponsoringDashboard(session.user.companyId);

  return (
    <div className="max-w-[1120px] mx-auto py-6 px-4 md:px-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined icon-fill text-amber-600" style={{ fontSize: 24 }}>campaign</span>
        </div>
        <div>
          <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">Sponsoring</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {dashboard.cards.some((c) => c.current?.status === "active") ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-status-active-fg bg-status-active-bg border border-status-active-border px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-status-active-dot" />
                {dashboard.cards.filter((c) => c.current?.status === "active").length} campagne{dashboard.cards.filter((c) => c.current?.status === "active").length > 1 ? "s" : ""} en cours
              </span>
            ) : (
              <span className="text-[11px] text-ink-tertiary">Aucune campagne active</span>
            )}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-amber-600 shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>info</span>
        <div className="text-[12.5px] text-ink-primary leading-snug">
          Affichez votre <strong>bannière sponsorisée</strong> en tête des résultats de recherche pendant <strong>7 jours</strong>.{" "}
          <span className="text-ink-secondary">
            Tarif : 100 DT HT (120 DT TTC — TVA 19 % + timbre fiscal 1 DT). Les campagnes sponsorisées sont vérifiées par notre équipe avant publication.
          </span>
        </div>
      </div>

      {/* Tabs */}
      <SponsoringPageTabs
        cardsPanel={<SponsoringCards data={dashboard.cards} />}
        historyPanel={<SponsoringHistory items={dashboard.history} />}
        historyCount={dashboard.history.length}
      />

      <div className="text-center">
        <a href="/dashboard/commandes" className="text-[12px] text-primary hover:underline">
          Consulter l&apos;historique des transactions →
        </a>
      </div>
    </div>
  );
}

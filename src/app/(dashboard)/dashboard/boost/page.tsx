import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { FeatureComingSoonPage } from "@/components/shared/FeatureComingSoonPage";
import { findActiveBoosts } from "@/models/boost.model";
import { getBoostHistory } from "@/services/boost.service";
import { connectDb } from "@/lib/db";
import { BoostCards } from "@/components/features/boost/BoostCards";
import { BoostHistory } from "@/components/features/boost/BoostHistory";
import { BoostPageTabs } from "@/components/features/boost/BoostPageTabs";

export default async function BoostPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  if (!me.features.monetization) {
    return <FeatureComingSoonPage kind="boost" />;
  }

  await connectDb();
  const [activeBoosts, history] = await Promise.all([
    findActiveBoosts({ companyId: session.user.companyId }),
    getBoostHistory(session.user.companyId),
  ]);

  const kinds = ["brandup", "traceup", "linkup"] as const;
  const data = kinds.map((kind) => {
    const profile = me.profiles[kind];
    const boost = (activeBoosts as Record<string, unknown>[]).find(
      (b) => b.profileKind === kind,
    );
    return {
      kind,
      exists: profile !== null,
      profileStatus: profile?.status ?? null,
      isPublic: profile?.isPublic ?? false,
      activeBoost: boost
        ? {
            id: String(boost._id),
            from: new Date(boost.from as string).toISOString(),
            to: new Date(boost.to as string).toISOString(),
            status: boost.status as string,
            viewsAdded: (boost.viewsAdded as number) ?? 0,
            clicksAdded: (boost.clicksAdded as number) ?? 0,
          }
        : null,
    };
  });

  return (
    <div className="max-w-[1120px] mx-auto py-6 px-4 md:px-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined icon-fill text-primary" style={{ fontSize: 24 }}>trending_up</span>
        </div>
        <div>
          <h2 className="font-heading font-bold text-[20px] text-ink-primary leading-tight">Boost &amp; Visibilité</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {me.stats.activeBoosts > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-status-active-fg bg-status-active-bg border border-status-active-border px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-status-active-dot" />
                {me.stats.activeBoosts} profil{me.stats.activeBoosts > 1 ? "s" : ""} boosté{me.stats.activeBoosts > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[11px] text-ink-tertiary">Aucun boost actif</span>
            )}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary-light border border-[#C7DDF1] rounded-lg px-4 py-3 flex items-start md:items-center gap-3">
        <span className="material-symbols-outlined text-primary shrink-0 mt-[1px] md:mt-0" style={{ fontSize: 20 }}>info</span>
        <div className="text-[12.5px] text-ink-primary leading-snug">
          Un <strong>Boost</strong> place votre profil en <strong>tête des résultats</strong> du moteur
          pendant <strong>30 jours</strong>.{" "}
          <span className="text-ink-secondary">Tarif unique : 50 DT HT (60,50 DT TTC — TVA 19 % + timbre fiscal 1 DT) par profil.</span>
        </div>
      </div>

      {/* Tabs */}
      <BoostPageTabs
        cardsPanel={<BoostCards data={data} activeBoostedCount={me.stats.activeBoosts} />}
        historyPanel={<BoostHistory items={history} />}
        historyCount={history.length}
      />

      <div className="text-center">
        <a href="/dashboard/billing" className="text-[12px] text-primary hover:underline">
          Consulter l&apos;historique des transactions →
        </a>
      </div>
    </div>
  );
}

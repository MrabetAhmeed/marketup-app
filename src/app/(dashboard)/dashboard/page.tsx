import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { OverviewStats } from "@/components/features/dashboard/OverviewStats";
import { OverviewProfiles } from "@/components/features/dashboard/OverviewProfiles";
import { OverviewRse } from "@/components/features/dashboard/OverviewRse";
import { OverviewQuickActions } from "@/components/features/dashboard/OverviewQuickActions";

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  return (
    <div className="space-y-8">
      {/* Section 1 — Stats */}
      <section>
        <SectionHeader
          title="Performances du mois"
          subtitle="Vues et clics sur vos 3 vitrines publiques"
        />
        <OverviewStats me={me} />
      </section>

      {/* Section 2 — Profiles */}
      <section>
        <SectionHeader
          title="Mes profils"
          subtitle="Gérer et booster vos 3 vitrines publiques"
        />
        <OverviewProfiles me={me} />
      </section>

      {/* Section 3 — RSE */}
      <section>
        <SectionHeader
          title="Visibilité & engagement"
          subtitle="Suivi de votre boost en cours et de votre activité RSE"
        />
        <div className="grid grid-cols-1 gap-4">
          <OverviewRse rse={me.rse} />
        </div>
      </section>

      {/* Section 4 — Quick Actions */}
      <section>
        <SectionHeader
          title="Accès rapides"
          subtitle="Actions fréquentes en un clic"
        />
        <OverviewQuickActions companySlug={me.company.slug} />
      </section>
    </div>
  );
}

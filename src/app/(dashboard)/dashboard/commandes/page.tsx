import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { FeatureComingSoonPage } from "@/components/shared/FeatureComingSoonPage";
import { getOwnerTransactions } from "@/services/billing.service";
import { TransactionsList } from "@/components/features/billing/TransactionsList";

export default async function CommandesPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  if (!me.features.monetization) {
    return <FeatureComingSoonPage kind="billing" />;
  }

  const transactions = await getOwnerTransactions(session.user.companyId);

  return (
    <div className="max-w-[800px] mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Commandes</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Historique de vos commandes</p>
      </div>

      <TransactionsList transactions={transactions} />
    </div>
  );
}

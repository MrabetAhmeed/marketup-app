import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { orderOutcomeBanner } from "@/lib/payment/order-labels";
import { getMe } from "@/services/me.service";
import { FeatureComingSoonPage } from "@/components/shared/FeatureComingSoonPage";
import { getOwnerTransactions } from "@/services/billing.service";
import { TransactionsList } from "@/components/features/billing/TransactionsList";

const OUTCOME_CLASSES = {
  success: "bg-status-active-bg border-status-active-border text-status-active-fg",
  waiting: "bg-status-pending-bg border-status-pending-border text-status-pending-fg",
  failure: "bg-status-rejected-bg border-status-rejected-border text-status-rejected-fg",
} as const;

interface CommandesPageProps {
  searchParams?: { commande?: string };
}

export default async function CommandesPage({ searchParams }: CommandesPageProps): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  // Consultation is not subject to the monetization flag (V1.2 F3): past orders
  // stay visible. With nothing to show and purchases closed, the page is unchanged.
  const transactions = await getOwnerTransactions(session.user.companyId);
  if (!me.features.monetization && transactions.length === 0) {
    return <FeatureComingSoonPage kind="billing" />;
  }

  // Only an order of this company is ever described: ownership decides the display.
  const returned = searchParams?.commande ? transactions.find((t) => t.id === searchParams.commande) : undefined;
  const outcome = returned ? orderOutcomeBanner(returned) : null;

  return (
    <div className="max-w-[800px] mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Commandes</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Historique de vos commandes</p>
      </div>

      {outcome && (
        <div className={`mb-4 px-4 py-3 border rounded-lg flex items-start gap-3 text-[13px] font-semibold ${OUTCOME_CLASSES[outcome.tone]}`} role="status">
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20 }}>{outcome.icon}</span>
          <span>
            {outcome.text}
            {outcome.action && (
              // Plain link, not next/link: it must never be prefetched (it triggers a verification)
              <a href={outcome.action.href} className="ml-2 text-primary hover:underline">
                {outcome.action.label}
              </a>
            )}
          </span>
        </div>
      )}

      <TransactionsList transactions={transactions} />
    </div>
  );
}

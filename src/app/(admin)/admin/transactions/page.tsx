import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminTransactions } from "@/services/billing.service";
import { AdminTransactionsTable } from "@/components/features/admin/AdminTransactionsTable";

export default async function AdminTransactionsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");

  const transactions = await getAdminTransactions();

  return (
    <div className="py-6 px-6">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Transactions</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Toutes les transactions de la plateforme</p>
      </div>

      <AdminTransactionsTable transactions={transactions} />
    </div>
  );
}

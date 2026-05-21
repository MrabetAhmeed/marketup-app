import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanyForEdit } from "@/services/account-resubmit.service";
import { CompanyEditForm } from "@/components/features/account/CompanyEditForm";

export default async function AccountEditPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const company = await getCompanyForEdit(session.user.id);

  // Rejected: allowed (this is the edit/resubmit page)
  // Suspended/pending: redirect out — they shouldn't be here
  if (company.status === "suspended") redirect("/login?error=COMPANY_SUSPENDED");
  if (company.status === "pending") redirect("/login?error=COMPANY_PENDING");

  return <CompanyEditForm company={company} />;
}

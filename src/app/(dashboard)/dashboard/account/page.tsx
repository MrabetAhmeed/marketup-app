import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { getGouvernorats } from "@/lib/referentials";
import { AccountForm } from "@/components/features/account/AccountForm";

export default async function AccountPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const [me, gouvernorats] = await Promise.all([
    getMe(session.user.id, session.user.companyId),
    getGouvernorats("fr"),
  ]);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  return <AccountForm me={me} gouvernorats={gouvernorats} />;
}

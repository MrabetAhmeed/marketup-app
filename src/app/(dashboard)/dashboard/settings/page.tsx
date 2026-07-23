import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMe } from "@/services/me.service";
import { SettingsForm } from "@/components/features/account/SettingsForm";

// No guardActiveCompany here: password change must be accessible to rejected owners.
// Suspended/deleted sessions are killed by the jwt() callback (S8, PP-13).
export default async function SettingsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");

  return (
    <SettingsForm
      companyName={me.company.displayName}
      accountEmail={me.company.accountEmail}
    />
  );
}

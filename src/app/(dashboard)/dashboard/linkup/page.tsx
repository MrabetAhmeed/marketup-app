import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { getProfileForEditor } from "@/services/profile-editor.service";
import { LinkUpEditor } from "@/components/features/profiles/LinkUpEditor";
import { ProfileEmptyState } from "@/components/features/profiles/ProfileEmptyState";
import type { LinkUpEditorData } from "@/types/profile-editor";

export default async function LinkupPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  const profile = await getProfileForEditor(session.user.companyId, "linkup");

  if (!profile) {
    return <ProfileEmptyState kind="linkup" />;
  }

  return <LinkUpEditor profile={profile as LinkUpEditorData} company={me.company} />;
}

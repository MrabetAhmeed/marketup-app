import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { getProfileForEditor } from "@/services/profile-editor.service";
import { TraceUpEditor } from "@/components/features/profiles/TraceUpEditor";
import { ProfileEmptyState } from "@/components/features/profiles/ProfileEmptyState";
import type { TraceUpEditorData } from "@/types/profile-editor";

export default async function TraceupPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  const profile = await getProfileForEditor(session.user.companyId, "traceup");

  if (!profile) {
    return <ProfileEmptyState kind="traceup" />;
  }

  return <TraceUpEditor profile={profile as TraceUpEditorData} company={me.company} />;
}

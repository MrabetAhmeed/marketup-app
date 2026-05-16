import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMe } from "@/services/me.service";
import { getProfileForEditor } from "@/services/profile-editor.service";
import { BrandUpEditor } from "@/components/features/profiles/BrandUpEditor";
import { ProfileEmptyState } from "@/components/features/profiles/ProfileEmptyState";
import type { BrandUpEditorData } from "@/types/profile-editor";

export default async function BrandupPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");

  const profile = await getProfileForEditor(session.user.companyId, "brandup");

  if (!profile) {
    return <ProfileEmptyState kind="brandup" />;
  }

  return <BrandUpEditor profile={profile as BrandUpEditorData} company={me.company} />;
}

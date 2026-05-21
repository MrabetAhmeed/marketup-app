import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { getRseDataForUser } from "@/services/rse.service";
import { RsePageClient } from "@/components/features/rse/RsePageClient";

export default async function RsePage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  const rseData = await getRseDataForUser(session.user.companyId);

  return <RsePageClient data={rseData} companySlug={me.company.slug} />;
}

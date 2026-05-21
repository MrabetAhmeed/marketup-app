import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { guardActiveCompany } from "@/lib/auth-guards";
import { getMe } from "@/services/me.service";
import { getNotificationsForUser } from "@/services/notifications.service";
import { NotificationsPageClient } from "@/components/features/notifications/NotificationsPageClient";

export default async function NotificationsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const me = await getMe(session.user.id, session.user.companyId);
  if (!me) redirect("/session-expired");
  guardActiveCompany(me.company.status);

  // Fetch all for client-side filtering; pagination is visual (Phase 4 will use server-side)
  const data = await getNotificationsForUser(session.user.id, { pageSize: 50 });

  return <NotificationsPageClient data={data} initialFilter="all" />;
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMe, getNotificationPreviews } from "@/services/me.service";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar";
import { ToastProvider } from "@/components/shared/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || session.user.role !== "OWNER") {
    redirect("/login");
  }

  const [me, notifications] = await Promise.all([
    getMe(session.user.id, session.user.companyId),
    getNotificationPreviews(session.user.id),
  ]);

  // Stale session: JWT is valid but user/company was deleted from DB
  if (!me) {
    redirect("/session-expired");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-surface-muted">
        <DashboardSidebar me={me} />
        <div className="flex-1 flex flex-col md:ml-60">
          <DashboardTopbar me={me} notifications={notifications} />
          <main className="flex-1 p-4 md:p-8">
            <div className="max-w-[1280px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

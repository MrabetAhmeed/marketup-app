import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/features/admin/AdminSidebar";
import { AdminTopbar } from "@/components/features/admin/AdminTopbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const initials = "BA"; // Bassem Admin

  return (
    <div className="flex min-h-screen bg-[#F9F9F9]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar initials={initials} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

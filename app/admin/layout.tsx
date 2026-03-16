import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Navbar userName={session.name} role="admin" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

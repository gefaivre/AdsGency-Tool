import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { TabNav } from "@/components/shared/TabNav";
import { ClientChatBubble } from "@/components/chat/ClientChatBubble";
import { LayoutDashboard, Trello, Calendar, GitBranch } from "lucide-react";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/login");

  const db = getDb();
  const client = db
    .prepare("SELECT id, name, industry, logo_color, agency_id FROM clients WHERE id = ?")
    .get(session.id) as { id: number; name: string; industry: string; logo_color: string; agency_id: number };

  const agency = db
    .prepare("SELECT name FROM agencies WHERE id = ?")
    .get(client.agency_id) as { name: string } | undefined;

  const tabs = [
    { label: "Dashboard", href: "/client", icon: <LayoutDashboard className="w-3 h-3" /> },
    { label: "Créatifs", href: "/client/kanban", icon: <Trello className="w-3 h-3" /> },
    { label: "Calendrier", href: "/client/calendar", icon: <Calendar className="w-3 h-3" /> },
    { label: "Funnel", href: "/client/funnel", icon: <GitBranch className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar userName={session.name} role="client" />
      <div className="bg-background border-b border-border px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 flex items-center justify-center text-white font-bold text-[10px] shrink-0 font-data"
            style={{ backgroundColor: client.logo_color }}
          >
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-xl font-light text-foreground tracking-wide leading-tight">
              {client.name}
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              {client.industry}
            </p>
          </div>
        </div>
        <TabNav tabs={tabs} />
      </div>
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      <ClientChatBubble clientId={client.id} agencyName={agency?.name ?? "Agence"} />
    </div>
  );
}

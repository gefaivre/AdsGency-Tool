import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { TabNav } from "@/components/shared/TabNav";
import { ClientChatEmbed } from "@/components/chat/ClientChatEmbed";
import { LayoutDashboard, Trello, Calendar, GitBranch } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ClientDetailLayout({ children, params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const db = getDb();
  const client = db
    .prepare("SELECT id, name, industry, logo_color FROM clients WHERE id = ? AND agency_id = ?")
    .get(parseInt(id), session.id) as { id: number; name: string; industry: string; logo_color: string } | undefined;

  if (!client) notFound();

  const base = `/agency/clients/${id}`;
  const tabs = [
    { label: "Dashboard", href: base, icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: "Kanban", href: `${base}/kanban`, icon: <Trello className="w-3.5 h-3.5" /> },
    { label: "Calendrier", href: `${base}/calendar`, icon: <Calendar className="w-3.5 h-3.5" /> },
    { label: "Funnel", href: `${base}/funnel`, icon: <GitBranch className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Client header */}
        <div className="bg-white border-b border-border px-6 pt-5 pb-0 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ backgroundColor: client.logo_color }}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {client.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {client.industry}
              </p>
            </div>
          </div>
          <TabNav tabs={tabs} />
        </div>
        <div className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </div>
      </div>

      {/* Embedded chat — right column */}
      <ClientChatEmbed clientId={client.id} clientName={client.name} />
    </div>
  );
}

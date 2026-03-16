import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { ClientSidebar } from "@/components/shared/ClientSidebar";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const db = getDb();
  const clients = db
    .prepare(
      `SELECT c.id, c.name, c.industry, c.logo_color,
              COUNT(DISTINCT camp.id) as campaign_count,
              COALESCE(SUM(camp.total_spend), 0) as total_spend,
              COALESCE(SUM(camp.impressions), 0) as total_impressions,
              COALESCE(SUM(camp.clicks), 0) as total_clicks
       FROM clients c
       LEFT JOIN campaigns camp ON camp.client_id = c.id
       WHERE c.agency_id = ?
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all(session.id) as Array<{
      id: number; name: string; industry: string; logo_color: string;
      campaign_count: number; total_spend: number; total_impressions: number; total_clicks: number;
    }>;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar userName={session.name} role="agency" />
      <div className="flex flex-1 overflow-hidden">
        <ClientSidebar clients={clients} />
        <main className="flex-1 overflow-hidden bg-background">{children}</main>
      </div>
    </div>
  );
}

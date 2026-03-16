import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatEuro } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export default async function AgencyOverviewPage() {
  const session = await getSession();
  if (!session || session.role !== "agency") redirect("/login");

  const db = getDb();
  const clients = db
    .prepare(
      `SELECT c.id, c.name, c.industry, c.logo_color,
              COUNT(DISTINCT camp.id) as campaign_count,
              COUNT(DISTINCT CASE WHEN camp.status = 'ACTIVE' THEN camp.id END) as active_campaigns,
              COALESCE(SUM(camp.total_spend), 0) as total_spend,
              COALESCE(SUM(camp.impressions), 0) as total_impressions,
              COALESCE(SUM(camp.reach), 0) as total_reach,
              COALESCE(SUM(camp.clicks), 0) as total_clicks
       FROM clients c
       LEFT JOIN campaigns camp ON camp.client_id = c.id
       WHERE c.agency_id = ?
       GROUP BY c.id
       ORDER BY total_spend DESC`
    )
    .all(session.id) as Array<{
      id: number; name: string; industry: string; logo_color: string;
      campaign_count: number; active_campaigns: number;
      total_spend: number; total_impressions: number; total_reach: number; total_clicks: number;
    }>;

  const unreadMessages = db
    .prepare(
      `SELECT m.client_id, c.name as client_name, c.logo_color,
              COUNT(*) as unread_count,
              (SELECT content FROM messages WHERE client_id = m.client_id ORDER BY created_at DESC LIMIT 1) as last_message,
              MAX(m.created_at) as last_at
       FROM messages m
       JOIN clients c ON c.id = m.client_id
       WHERE c.agency_id = ? AND m.read_by_agency = 0
       GROUP BY m.client_id
       ORDER BY last_at DESC`
    )
    .all(session.id) as Array<{
      client_id: number;
      client_name: string;
      logo_color: string;
      unread_count: number;
      last_message: string;
      last_at: string;
    }>;

  const totals = clients.reduce(
    (acc, c) => ({
      spend: acc.spend + c.total_spend,
      impressions: acc.impressions + c.total_impressions,
      reach: acc.reach + c.total_reach,
      clicks: acc.clicks + c.total_clicks,
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0 }
  );

  const kpis = [
    { label: "Clients gérés", value: clients.length.toString(), color: "bg-blue-50 border-blue-100" },
    { label: "Impressions totales", value: formatNumber(totals.impressions), color: "bg-violet-50 border-violet-100" },
    { label: "Reach total", value: formatNumber(totals.reach), color: "bg-pink-50 border-pink-100" },
    { label: "Clics totaux", value: formatNumber(totals.clicks), color: "bg-emerald-50 border-emerald-100" },
    { label: "Dépenses totales", value: formatEuro(totals.spend), color: "bg-amber-50 border-amber-100" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-up">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground mt-1">Performances agrégées — tous clients</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 stagger">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border px-5 py-4 shadow-sm animate-fade-up ${kpi.color}`}>
            <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Unread messages */}
      {unreadMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-hidden animate-fade-up">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-500" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Messages non lus</h2>
            <span className="ml-auto bg-primary text-white text-xs font-bold rounded-full px-2.5 py-1">
              {unreadMessages.reduce((s, m) => s + m.unread_count, 0)}
            </span>
          </div>
          <div className="divide-y divide-border">
            {unreadMessages.map((item) => (
              <div key={item.client_id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: item.logo_color }}
                >
                  {item.client_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.last_message}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-muted-foreground font-data">
                    {new Date(item.last_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className="bg-primary text-white text-[10px] font-bold rounded-full px-2 py-0.5 leading-none">
                    {item.unread_count > 9 ? "9+" : item.unread_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Clients</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {clients.length} compte{clients.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Secteur</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Campagnes</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Impressions</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Clics</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Dépenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/agency/clients/${client.id}`} className="flex items-center gap-3 group">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: client.logo_color }}
                      >
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                      {client.industry}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-data text-sm text-foreground tabular-nums">{client.campaign_count}</span>
                    {client.active_campaigns > 0 && (
                      <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        {client.active_campaigns} actif{client.active_campaigns > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                    {formatNumber(client.total_impressions)}
                  </td>
                  <td className="px-6 py-4 text-right font-data text-sm text-foreground tabular-nums">
                    {formatNumber(client.total_clicks)}
                  </td>
                  <td className="px-6 py-4 text-right font-data text-sm font-semibold text-primary tabular-nums">
                    {formatEuro(client.total_spend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
